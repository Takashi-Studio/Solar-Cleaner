import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt';
import cron from 'node-cron';
import { prisma, initializeDatabase } from './db';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

// لتخزين مؤقت لمستوى الماء عند بدء التنظيف (لحساب استهلاك المياه)
const cleaningStartWaterLevels: Record<string, { level: number; time: number }> = {};

// --- 1. إعداد الـ MQTT Client للاتصال بالوسيط (Mosquitto) ---
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT Broker successfully.');
  mqttClient.subscribe('device/+/status', (err) => {
    if (err) console.error('Subscription error:', err);
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const topicParts = topic.split('/');
    const devId = topicParts[1];
    const payload = JSON.parse(message.toString());

    // تحديث قاعدة البيانات بناءً على الرسالة الواردة
    const { water_level, state, status } = payload;

    // جلب الحالة الحالية للجهاز قبل التحديث
    const prevDevice = await prisma.device.findUnique({
      where: { id: devId }
    });

    let updateData: any = { last_seen: new Date() };
    if (status) updateData.status = status;
    if (water_level !== undefined) updateData.water_level = water_level;
    if (state !== undefined) updateData.state = state;

    await prisma.device.update({
      where: { id: devId },
      data: updateData
    });

    // --- تسجيل لوغ وتنظيف السجلات عند انتهاء دورة التنظيف ---
    if (state && prevDevice) {
      // 1. إذا بدأ التنظيف، نخزن مستوى المياه البدئي والوقت
      if (state === 'CLEANING' && prevDevice.state !== 'CLEANING') {
        const startLevel = water_level !== undefined ? water_level : prevDevice.water_level;
        cleaningStartWaterLevels[devId] = {
          level: startLevel,
          time: Date.now()
        };
      }
      
      // 2. إذا انتهى التنظيف بنجاح، أو توقف لسبب آخر
      const isFinished = ['CLEANING_DONE', 'STOPPED', 'WATER_LOW'].includes(state) && prevDevice.state === 'CLEANING';
      if (isFinished) {
        const startInfo = cleaningStartWaterLevels[devId] || { level: prevDevice.water_level, time: Date.now() };
        const endLevel = water_level !== undefined ? water_level : prevDevice.water_level;
        const duration = Math.round((Date.now() - startInfo.time) / 1000);
        
        let logStatus = 'success';
        if (state === 'STOPPED') logStatus = 'stopped';
        if (state === 'WATER_LOW') logStatus = 'water_low';

        // إضافة سجل تنظيف بقاعدة البيانات
        await prisma.cleaningLog.create({
          data: {
            device_id: devId,
            triggered_by: 'remote',
            status: logStatus,
            water_level_start: startInfo.level,
            water_level_end: endLevel,
            duration_seconds: duration
          }
        });

        delete cleaningStartWaterLevels[devId];
      }
    }

  } catch (error) {
    console.error('Error handling MQTT message:', error);
  }
});

// --- 2. وسيط حماية الـ APIs باستخدام JWT Authentication ---
interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') {
    return res.status(403).json({ error: 'غير مسموح. هذه الصلاحية للمدير فقط.' });
  }
  next();
}

// --- 3. مسارات الـ APIs (Endpoints) ---

// أ. مسارات التوثيق (Authentication)
// مسار التسجيل: خاص بالمسؤولين فقط لإنشاء حسابات المستخدمين الجدد
app.post('/api/auth/register', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all details.' });
    }
    const hash = await bcrypt.hash(password, 10);
    
    const result = await prisma.user.create({
      data: {
        name,
        email,
        password_hash: hash,
        role: role || 'USER'
      }
    });
    
    res.status(201).json({ 
      user: { 
        id: result.id, 
        name: result.name, 
        email: result.email, 
        role: result.role,
        theme_preference: result.theme_preference, 
        email_alerts_enabled: result.email_alerts_enabled 
      } 
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) {
      return res.status(400).json({ error: 'User does not exist.' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        theme_preference: user.theme_preference, 
        email_alerts_enabled: user.email_alerts_enabled 
      }, 
      token 
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/users/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, theme_preference, email_alerts_enabled } = req.body;
  try {
    let updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (theme_preference !== undefined) updateData.theme_preference = theme_preference;
    if (email_alerts_enabled !== undefined) updateData.email_alerts_enabled = email_alerts_enabled;
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData
    });

    res.json({ 
      user: { 
        id: updatedUser.id, 
        name: updatedUser.name, 
        email: updatedUser.email, 
        theme_preference: updatedUser.theme_preference, 
        email_alerts_enabled: updatedUser.email_alerts_enabled 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ب. مسارات الأجهزة (Devices)
// ب. مسارات الأجهزة (Devices)
// تسجيل وربط جهاز جديد بمستخدم معين (للأدمن فقط)
app.post('/api/devices/register', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, userId } = req.body;
  try {
    if (!id || !name) return res.status(400).json({ error: 'معرف الجهاز والاسم مطلوبان.' });
    if (!userId) return res.status(400).json({ error: 'معرف المستخدم (User ID) مطلوب لربط الجهاز.' });
    
    // التحقق من وجود المستخدم المستهدف
    const targetUser = await prisma.user.findUnique({
      where: { id: Number(userId) }
    });
    if (!targetUser) return res.status(404).json({ error: 'المستحدم المحدد غير موجود.' });

    const checkDevice = await prisma.device.findUnique({
      where: { id }
    });

    if (checkDevice) {
      await prisma.device.update({
        where: { id },
        data: { user_id: Number(userId), name }
      });
    } else {
      await prisma.device.create({
        data: {
          id,
          user_id: Number(userId),
          name,
          status: 'offline',
          state: 'IDLE',
          water_level: 0
        }
      });
    }
    res.json({ success: true, message: 'تم تسجيل الجهاز وربطه بالمستخدم بنجاح.' });
  } catch (err: any) {
    console.error('[Device Register] Error:', err);
    res.status(500).json({ error: `خطأ بقاعدة البيانات: ${err.message || err}` });
  }
});

app.get('/api/devices', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      where: { user_id: req.userId },
      orderBy: { id: 'asc' }
    });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// إلغاء ربط الجهاز وحذفه من حساب المستخدم (للأدمن فقط)
app.delete('/api/devices/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  console.log(`[DELETE Device Admin] Request received for id: "${id}"`);
  try {
    const dev = await prisma.device.findUnique({
      where: { id }
    });

    if (!dev) {
      return res.status(404).json({ error: 'الجهاز غير موجود.' });
    }

    // إلغاء ربط الجهاز (تعيين user_id = NULL)
    await prisma.device.update({
      where: { id },
      data: { user_id: null, status: 'offline' }
    });
    
    // مسح الجداول المجدولة المخصصة لهذا الجهاز تلقائياً
    await prisma.schedule.deleteMany({
      where: { device_id: id }
    });

    res.json({ success: true, message: 'Device unlinked successfully.' });
  } catch (err) {
    console.error('[DELETE Device] Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// مسار بديل بالـ POST لزيادة التوافقية (للأدمن فقط)
app.post('/api/devices/:id/delete', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  console.log(`[POST Delete Device Admin] Request received for id: "${id}"`);
  try {
    const dev = await prisma.device.findUnique({
      where: { id }
    });

    if (!dev) {
      return res.status(404).json({ error: 'الجهاز غير موجود.' });
    }

    await prisma.device.update({
      where: { id },
      data: { user_id: null, status: 'offline' }
    });

    await prisma.schedule.deleteMany({
      where: { device_id: id }
    });

    res.json({ success: true, message: 'Device unlinked successfully.' });
  } catch (err) {
    console.error('[POST Delete Device] Error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// ج. مسارات الإدارة الخاصة بالأدمن (Admin Dashboard Endpoints)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        theme_preference: true,
        email_alerts_enabled: true,
        created_at: true,
        _count: {
          select: { devices: true }
        }
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

app.get('/api/admin/devices', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await prisma.device.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve devices' });
  }
});

// مسار التحقق اليدوي والفوري من حالة اتصال الجهاز بالشبكة
app.post('/api/devices/:id/check-connection', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const dev = await prisma.device.findFirst({
      where: { id, user_id: req.userId }
    });
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    // حساب فرق التوقيت بين آخر ظهور للتأكد من النشاط الفعلي
    const lastSeenTime = new Date(dev.last_seen).getTime();
    const now = Date.now();
    const diffSeconds = Math.round((now - lastSeenTime) / 1000);
    
    // نعتبره غير متصل إذا مرت أكثر من 60 ثانية على آخر إشارة (لتفادي تأخير الواي فاي الطفيف)
    const isOffline = diffSeconds > 60;

    let newStatus = dev.status;
    if (isOffline && dev.status !== 'offline') {
      newStatus = 'offline';
      await prisma.device.update({
        where: { id },
        data: { status: 'offline' }
      });
    } else if (!isOffline && dev.status !== 'online') {
      newStatus = 'online';
      await prisma.device.update({
        where: { id },
        data: { status: 'online' }
      });
    }

    res.json({ 
      success: true,
      id, 
      status: newStatus, 
      last_seen: dev.last_seen,
      seconds_since_last_seen: diffSeconds
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ج. إرسال أوامر التحكم (MQTT Command Triggers)
app.post('/api/devices/:id/clean', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const dev = await prisma.device.findFirst({
      where: { id, user_id: req.userId }
    });
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    mqttClient.publish(`device/${id}/commands`, 'START_CLEAN');
    res.json({ success: true, message: 'Sent START_CLEAN command.' });
  } catch (err) {
    res.status(500).json({ error: 'Error triggering cleaning' });
  }
});

app.post('/api/devices/:id/stop', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const dev = await prisma.device.findFirst({
      where: { id, user_id: req.userId }
    });
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    mqttClient.publish(`device/${id}/commands`, 'STOP_CLEAN');
    res.json({ success: true, message: 'Sent STOP_CLEAN command.' });
  } catch (err) {
    res.status(500).json({ error: 'Error stopping cleaning' });
  }
});

app.post('/api/devices/:id/speed', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { speed } = req.body;
  try {
    const dev = await prisma.device.findFirst({
      where: { id, user_id: req.userId }
    });
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    const speedVal = Number(speed);
    if (isNaN(speedVal) || speedVal < 200 || speedVal > 1000) {
      return res.status(400).json({ error: 'Speed must be a number between 200 and 1000.' });
    }

    // 1. تحديث السرعة بقاعدة البيانات
    await prisma.device.update({
      where: { id },
      data: { speed: speedVal }
    });

    // 2. إرسال الأمر عبر MQTT
    mqttClient.publish(`device/${id}/commands`, `SPEED:${speedVal}`);

    res.json({ success: true, message: `Sent SPEED:${speedVal} command.` });
  } catch (err) {
    console.error('[POST Speed] Error:', err);
    res.status(500).json({ error: 'Error setting speed' });
  }
});

// د. إدارة الجدولة الزمنية (Schedules)
app.post('/api/devices/:id/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { cleaning_time, days_of_week } = req.body; // e.g. "08:30", [1, 3, 5]
  try {
    const dev = await prisma.device.findFirst({
      where: { id, user_id: req.userId }
    });
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    // تحويل مصفوفة الأيام إلى سلسلة مفصولة بفواصل
    const daysStr = days_of_week.join(',');

    const newSchedule = await prisma.schedule.create({
      data: {
        device_id: id,
        cleaning_time,
        days_of_week: daysStr
      }
    });
    
    // إرجاع مصفوفة الأيام بدلاً من السلسلة النصية للواجهة الأمامية
    const formattedSchedule = {
      ...newSchedule,
      days_of_week: newSchedule.days_of_week.split(',').map(Number)
    };
    res.status(201).json(formattedSchedule);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/devices/:id/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const schedules = await prisma.schedule.findMany({
      where: { device_id: id },
      orderBy: { cleaning_time: 'asc' }
    });
    
    // تحويل سلسلة الأيام مجدداً لمصفوفة أرقام لكل جدول
    const formattedSchedules = schedules.map(s => ({
      ...s,
      days_of_week: s.days_of_week.split(',').map(Number)
    }));
    
    res.json(formattedSchedules);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/schedules/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.schedule.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true, message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// هـ. الحصول على السجلات (Cleaning Logs)
app.get('/api/devices/:id/logs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const logs = await prisma.cleaningLog.findMany({
      where: { device_id: id },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- 4. مؤقت الجدولة التلقائي (Cron Scheduler) ---
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const currentHourMin = now.toTimeString().substring(0, 5); // "08:30"
    const currentDay = String(now.getDay()); // "0" = Sunday, etc.

    // جلب كافة الجداول النشطة
    const activeSchedules = await prisma.schedule.findMany({
      where: { is_active: 1 },
      include: { device: true }
    });

    for (const schedule of activeSchedules) {
      if (!schedule.device) continue;
      const days = schedule.days_of_week.split(',');
      
      // مطابقة الوقت الحاضر مع موعد الجدولة ويومها
      if (schedule.cleaning_time === currentHourMin && days.includes(currentDay)) {
        if (schedule.device.status === 'online') {
          console.log(`Cron: Automatic cleaning triggered for device: ${schedule.device_id}`);
          mqttClient.publish(`device/${schedule.device_id}/commands`, 'START_CLEAN');
          
          await prisma.cleaningLog.create({
            data: {
              device_id: schedule.device_id,
              triggered_by: 'timer',
              status: 'success'
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error running automatic scheduling cron job:', error);
  }
});

// --- 5. تشغيل السيرفر بعد تهيئة قاعدة البيانات ---
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Solar Cleaning SaaS Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database error:', err);
    process.exit(1);
  }
}

startServer();
