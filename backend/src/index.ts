import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt';
import cron from 'node-cron';
import { prisma, initializeDatabase } from './db';

import path from 'path';

const app = express();

// إعداد CORS صريح للسماح لجميع النطاقات بما فيها طلبات الـ preflight (OPTIONS)
const corsOptions = {
  origin: true,                            // السماح لأي origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));       // الرد على جميع طلبات preflight

app.use(express.json());
app.use('/firmware', express.static(path.join(__dirname, '../firmware')));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET environment variable is not defined!');
  process.exit(1);
}
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

// حد الإيقاف الطارئ التلقائي لمستوى الماء (%)
const EMERGENCY_STOP_WATER_LEVEL = 10;

// لتخزين وقت ومستوى الماء عند بدء كل تنظيف
const cleaningStartData: Record<number, { level: number; time: number }> = {};

// =============================================================
//  SSE Clients – بث رسائل MQTT لحظياً إلى المتصفح
// =============================================================
type SseClient = { res: Response; id: number };
let sseClients: SseClient[] = [];
let sseClientId = 0;

function broadcastMqtt(data: object) {
  const line = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => {
    try { c.res.write(line); } catch {}
  });
}

// =============================================================
//  1. إعداد MQTT Client
// =============================================================
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker.');
  // الاشتراك في رسائل الحالة من المتحكمات
  mqttClient.subscribe('controller/+/telemetry', (err) => {
    if (err) console.error('[MQTT] Subscribe error:', err);
    else console.log('[MQTT] Subscribed to controller/+/telemetry');
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Connection error:', err.message);
});

// إرسال أمر JSON للأردوينو عبر MQTT
function sendCommand(controllerId: string, port: number, cmd: 'START_CLEAN' | 'STOP_CLEAN') {
  const payload = JSON.stringify({ cmd, port });
  mqttClient.publish(`controller/${controllerId}/commands`, payload);
  console.log(`[MQTT] Command sent -> controller/${controllerId}/commands: ${payload}`);
}

// =============================================================
//  2. معالجة الرسائل الواردة من المتحكمات (Telemetry Handler)
//
//  أنواع الرسائل المتوقعة من الأردوينو:
//  {"type":"boot","controller":"ARD-MEGA-001","units":[{"port":1,"installed":true},...]}
//  {"type":"water","controller":"ARD-MEGA-001","port":1,"level":85}
//  {"type":"status","controller":"ARD-MEGA-001","port":1,"state":"CLEANING"}
// =============================================================
mqttClient.on('message', async (topic, message) => {
  // بث الرسالة الخام لجميع المستمعين عبر SSE فوراً
  try {
    broadcastMqtt({ topic, payload: message.toString(), ts: new Date().toISOString() });
  } catch {}

  try {
    const payload = JSON.parse(message.toString());
    const controllerId: string = payload.controller;
    if (!controllerId) return;

    // تحديث last_seen للمتحكم
    const controller = await prisma.controller.findUnique({ where: { id: controllerId } });
    if (!controller) {
      console.warn(`[MQTT] Unknown controller: ${controllerId}. Ignoring.`);
      return;
    }

    const isOffline = payload.status === 'offline';
    await prisma.controller.update({
      where: { id: controllerId },
      data: { 
        status: isOffline ? 'offline' : 'online', 
        last_seen: isOffline ? controller.last_seen : new Date() 
      }
    });

    if (isOffline) {
      console.log(`[MQTT] Controller ${controllerId} marked offline via LWT.`);
      return;
    }

    // --- تقرير الإقلاع: مزامنة وحدات التنظيف تلقائياً (Plug & Play) ---
    if (payload.type === 'boot' && Array.isArray(payload.units)) {
      console.log(`[BOOT] Controller ${controllerId} booted. Syncing ${payload.units.length} units...`);
      for (const unitInfo of payload.units as { port: number; installed: boolean }[]) {
        const existing = await prisma.cleaningUnit.findFirst({
          where: { controller_id: controllerId, port_number: unitInfo.port }
        });
        if (existing) {
          await prisma.cleaningUnit.update({
            where: { id: existing.id },
            data: { is_installed: unitInfo.installed }
          });
        } else {
          await prisma.cleaningUnit.create({
            data: {
              controller_id: controllerId,
              port_number: unitInfo.port,
              name: `وحدة ${unitInfo.port}`,
              is_installed: unitInfo.installed,
              state: 'IDLE',
              water_level: 0
            }
          });
        }
        console.log(`[BOOT] Unit port ${unitInfo.port}: installed=${unitInfo.installed}`);
      }
      return;
    }

    // --- تحديث مستوى الماء لوحدة محددة ---
    if (payload.type === 'water' && payload.port != null && payload.level != null) {
      const unit = await prisma.cleaningUnit.findFirst({
        where: { controller_id: controllerId, port_number: Number(payload.port) }
      });
      if (!unit) return;

      await prisma.cleaningUnit.update({
        where: { id: unit.id },
        data: { water_level: Number(payload.level) }
      });

      // ⚠️ إيقاف طارئ تلقائي إذا انخفض الماء أثناء التنظيف
      if (unit.state === 'CLEANING' && Number(payload.level) <= EMERGENCY_STOP_WATER_LEVEL) {
        console.warn(`[EMERGENCY STOP] Unit ${unit.id} water critical (${payload.level}%). Sending STOP.`);
        sendCommand(controllerId, unit.port_number, 'STOP_CLEAN');
        // الأردوينو يوقف المضخة ويعود للبداية تلقائياً
        // سيُرسل RETURNING_HOME ثم WATER_LOW عند الوصول — السجل يُنشأ عندها
      }
      return;
    }

    // --- تحديث حالة الوحدة ---
    if (payload.type === 'status' && payload.port != null && payload.state) {
      const unit = await prisma.cleaningUnit.findFirst({
        where: { controller_id: controllerId, port_number: Number(payload.port) }
      });
      if (!unit) return;

      const prevState = unit.state;
      const newState: string = payload.state;

      await prisma.cleaningUnit.update({
        where: { id: unit.id },
        data: { 
          state: newState,
          is_installed: newState !== 'OFFLINE'
        }
      });

      // عند بدء التنظيف: حفظ مستوى الماء الأولي والوقت
      if (newState === 'CLEANING' && prevState !== 'CLEANING') {
        cleaningStartData[unit.id] = { level: unit.water_level, time: Date.now() };
        console.log(`[LOG] Unit ${unit.id} started cleaning. Water: ${unit.water_level}%`);
      }

      // عند انتهاء التنظيف: إنشاء سجل
      // الحالات التي تعني انتهاء دورة التنظيف (بنجاح أو بخطأ)
      // RETURNING_HOME = حالة انتقالية (عودة آمنة بدون مضخة) — لا تُسجَّل كنهاية
      // WATER_LOW      = نهائية: وصل للبداية بعد إيقاف طارئ بسبب نقص الماء
      const finishedStates = ['CLEANING_DONE', 'STOPPED', 'WATER_LOW', 'LIMIT_SWITCH_ERROR', 'SENSOR_ERR'];
      // نتحقق من الحالة السابقة: CLEANING أو RETURNING_HOME كلاهما يعني أن الوحدة كانت نشطة
      const wasActive = prevState === 'CLEANING' || prevState === 'RETURNING_HOME';

      if (finishedStates.includes(newState) && wasActive) {
        const startInfo = cleaningStartData[unit.id] || { level: unit.water_level, time: Date.now() };
        const duration = Math.round((Date.now() - startInfo.time) / 1000);
        // تحديد مصدر التشغيل بدقة
        const triggeredBy = newState === 'WATER_LOW' ? 'auto_emergency' : 'device';

        await prisma.cleaningLog.create({
          data: {
            unit_id: unit.id,
            triggered_by: triggeredBy,
            status: newState,
            water_level_start: startInfo.level,
            water_level_end: unit.water_level,
            duration_seconds: duration
          }
        });
        delete cleaningStartData[unit.id];
        console.log(`[LOG] Unit ${unit.id} finished: ${newState} in ${duration}s (triggered_by: ${triggeredBy})`);
      }
    }

  } catch (err) {
    console.error('[MQTT] Error handling message:', err);
  }
});

// =============================================================
//  3. JWT Middleware
// =============================================================
interface AuthenticatedRequest extends Request {
  userId?: number;
  userRole?: string;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1] || (req.query.token as string);
  if (!token) return res.status(401).json({ error: 'Access token missing' });
  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Token invalid or expired' });
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  });
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'ADMIN') return res.status(403).json({ error: 'Admin only.' });
  next();
}

// =============================================================
//  4. Auth Endpoints
// =============================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(400).json({ error: 'المستخدم غير موجود.' });
    if (!user.is_active) return res.status(403).json({ error: 'تم تعطيل هذا الحساب.' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'كلمة المرور غير صحيحة.' });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, role: user.role, theme_preference: user.theme_preference } });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/auth/register', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const { name, username, password, role } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'All fields required.' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, username, password_hash: hash, role: role || 'USER' } });
    res.status(201).json({ user: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Username already exists.' });
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/profile/theme', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { theme } = req.body;
  if (!theme) return res.status(400).json({ error: 'theme is required' });
  try {
    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: { theme_preference: theme }
    });
    res.json({ success: true, theme_preference: updated.theme_preference });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// =============================================================
//  5. Controllers Endpoints (User-facing)
// =============================================================

// جلب المتحكمات مع وحداتها للمستخدم الحالي
app.get('/api/controllers', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const controllers = await prisma.controller.findMany({
      where: { user_id: req.userId },
      include: { units: { orderBy: { port_number: 'asc' } } },
      orderBy: { name: 'asc' }
    });

    // حساب الحالة الفعلية ديناميكياً بناءً على آخر ظهور (last_seen) خلال 45 ثانية
    const mapped = controllers.map(c => {
      const isOnline = c.status === 'online' && (Date.now() - new Date(c.last_seen).getTime() < 90000);
      return {
        ...c,
        status: isOnline ? 'online' : 'offline'
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// =============================================================
//  6. Unit Control Endpoints
// =============================================================

// بدء التنظيف لوحدة محددة
app.post('/api/controllers/:controllerId/units/:unitId/clean', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { controllerId, unitId } = req.params;
  try {
    const unit = await prisma.cleaningUnit.findFirst({
      where: { id: Number(unitId), controller_id: controllerId, controller: { user_id: req.userId! } }
    });
    if (!unit) return res.status(404).json({ error: 'الوحدة غير موجودة.' });
    if (!unit.is_installed) return res.status(400).json({ error: 'الوحدة غير موصولة.' });
    if (unit.water_level <= EMERGENCY_STOP_WATER_LEVEL) {
      return res.status(400).json({ error: `مستوى الماء منخفض جداً (${unit.water_level}%). يجب إعادة ملء الخزان أولاً.` });
    }
    sendCommand(controllerId, unit.port_number, 'START_CLEAN');
    res.json({ success: true, message: 'تم إرسال أمر بدء التنظيف.' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending command' });
  }
});

// إيقاف طارئ لوحدة محددة
app.post('/api/controllers/:controllerId/units/:unitId/stop', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { controllerId, unitId } = req.params;
  try {
    const unit = await prisma.cleaningUnit.findFirst({
      where: { id: Number(unitId), controller_id: controllerId, controller: { user_id: req.userId! } }
    });
    if (!unit) return res.status(404).json({ error: 'الوحدة غير موجودة.' });
    sendCommand(controllerId, unit.port_number, 'STOP_CLEAN');
    res.json({ success: true, message: 'تم إرسال أمر الإيقاف الطارئ.' });
  } catch (err) {
    res.status(500).json({ error: 'Error sending command' });
  }
});

// =============================================================
//  7. Schedules Endpoints
// =============================================================

app.get('/api/units/:unitId/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { unitId } = req.params;
  try {
    const schedules = await prisma.schedule.findMany({
      where: { unit_id: Number(unitId) },
      orderBy: { cleaning_time: 'asc' }
    });
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/units/:unitId/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { unitId } = req.params;
  const { schedule_type, cleaning_time, specific_date, days_of_week, interval_weeks } = req.body;
  if (!cleaning_time) return res.status(400).json({ error: 'الوقت مطلوب.' });
  try {
    const unit = await prisma.cleaningUnit.findFirst({
      where: { id: Number(unitId), controller: { user_id: req.userId! } }
    });
    if (!unit) return res.status(404).json({ error: 'الوحدة غير موجودة.' });

    const schedule = await prisma.schedule.create({
      data: {
        unit_id: Number(unitId),
        schedule_type: schedule_type || 'weekly',
        cleaning_time,
        specific_date: schedule_type === 'once' ? specific_date : null,
        days_of_week: days_of_week || null,
        interval_weeks: Number(interval_weeks || 1)
      }
    });
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/schedules/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.schedule.delete({ where: { id: Number(req.params.id) } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/schedules/:id/toggle', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const scheduleId = Number(req.params.id);
  if (isNaN(scheduleId)) return res.status(400).json({ error: 'Invalid schedule ID' });
  
  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        unit: {
          include: {
            controller: true
          }
        }
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'الجدول غير موجود.' });
    }

    if (!schedule.unit || !schedule.unit.controller || schedule.unit.controller.user_id !== req.userId) {
      return res.status(403).json({ error: 'غير مصرح لك بالوصول إلى هذا الجدول.' });
    }

    const newStatus = schedule.is_active === 1 ? 0 : 1;
    const updated = await prisma.schedule.update({
      where: { id: scheduleId },
      data: { is_active: newStatus }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// =============================================================
//  8. Logs Endpoints
// =============================================================

app.get('/api/units/:unitId/logs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { unitId } = req.params;
  try {
    const logs = await prisma.cleaningLog.findMany({
      where: { unit_id: Number(unitId) },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// =============================================================
//  9. Admin Endpoints
// =============================================================

// جلب جميع المستخدمين
app.get('/api/admin/users', authenticateToken, requireAdmin, async (_req, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, username: true, role: true,
        is_active: true, created_at: true,
        _count: { select: { controllers: true } }
      },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// تعديل مستخدم
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { name, username, role, password, is_active } = req.body;
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (username !== undefined) data.username = username;
    if (role !== undefined) data.role = role;
    if (is_active !== undefined) data.is_active = is_active;
    if (password) data.password_hash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({ where: { id: userId }, data });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// حذف مستخدم
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const userId = parseInt(req.params.id);
  if (req.userId === userId) return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص.' });
  try {
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// جلب جميع المتحكمات/الأجهزة (Admin)
app.get(['/api/admin/controllers', '/api/admin/devices'], authenticateToken, requireAdmin, async (_req, res: Response) => {
  try {
    const controllers = await prisma.controller.findMany({
      include: {
        user: { select: { id: true, name: true, username: true } },
        units: { orderBy: { port_number: 'asc' } }
      },
      orderBy: { name: 'asc' }
    });

    // دمج حالة مستوى الماء وحالة التشغيل من الوحدات التابعة للمتحكم لكي تتطابق مع متطلبات الواجهة الأمامية
    const mapped = controllers.map(c => {
      const firstUnit = c.units[0];
      const isOnline = c.status === 'online' && (Date.now() - new Date(c.last_seen).getTime() < 90000);
      return {
        id: c.id,
        name: c.name,
        status: isOnline ? 'online' : 'offline',
        last_seen: c.last_seen,
        user: c.user,
        state: firstUnit ? firstUnit.state : 'IDLE',
        water_level: firstUnit ? firstUnit.water_level : 0,
        units: c.units
      };
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// تسجيل متحكم/جهاز جديد وربطه بمستخدم (Admin)
app.post(['/api/admin/controllers/register', '/api/devices/register'], authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name, userId } = req.body;
  if (!id || !name || !userId) return res.status(400).json({ error: 'id, name, userId مطلوبة.' });
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود.' });

    const existing = await prisma.controller.findUnique({ where: { id } });
    if (existing) {
      await prisma.controller.update({ where: { id }, data: { user_id: Number(userId), name } });
    } else {
      await prisma.controller.create({ data: { id, name, user_id: Number(userId), status: 'offline' } });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// إلغاء ربط وحذف متحكم/جهاز (Admin)
app.delete(['/api/admin/controllers/:id', '/api/devices/:id'], authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const existing = await prisma.controller.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'المتحكم غير موجود.' });

    await prisma.controller.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// فحص اتصال متحكم/جهاز فوري (Admin)
app.post(['/api/admin/controllers/:id/check-connection', '/api/devices/:id/check-connection'], authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const controller = await prisma.controller.findUnique({ where: { id } });
    if (!controller) return res.status(404).json({ error: 'المتحكم غير موجود.' });

    // إرسال أمر PING للقطعة عبر MQTT للتأكد من استجابتها
    mqttClient.publish(`controller/${id}/commands`, JSON.stringify({ cmd: 'PING' }));

    // تحديد ما إذا كان متصلاً بناءً على آخر ظهور وحالة الاتصال وتحديث قاعدة البيانات إذا تغيرت الحالة
    const isOnline = controller.status === 'online' && (Date.now() - new Date(controller.last_seen).getTime() < 90000);
    const calculatedStatus = isOnline ? 'online' : 'offline';
    
    if (controller.status !== calculatedStatus) {
      await prisma.controller.update({
        where: { id },
        data: { status: calculatedStatus }
      });
    }

    res.json({ status: calculatedStatus, last_seen: controller.last_seen });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// تعديل متحكم (Admin)
app.put('/api/admin/controllers/:id', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, user_id } = req.body;
  try {
    const updated = await prisma.controller.update({
      where: { id },
      data: {
        name,
        user_id: user_id !== undefined ? (user_id ? Number(user_id) : null) : undefined
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// إيقاف تشغيل جميع وحدات المتحكم (Admin)
app.post('/api/admin/controllers/:id/stop', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const units = await prisma.cleaningUnit.findMany({ where: { controller_id: id } });
    for (const unit of units) {
      sendCommand(id, unit.port_number, 'STOP_CLEAN');
    }
    res.json({ success: true, message: `Sent STOP to ${units.length} units.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// تعديل وحدة تنظيف (Admin)
app.put('/api/admin/units/:unitId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { unitId } = req.params;
  const { name, speed, is_installed } = req.body;
  try {
    const updated = await prisma.cleaningUnit.update({
      where: { id: Number(unitId) },
      data: {
        name,
        speed: speed !== undefined ? Number(speed) : undefined,
        is_installed: is_installed !== undefined ? Boolean(is_installed) : undefined
      }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// إضافة وحدة تنظيف جديدة يدوياً لمنفذ معين (Admin)
app.post('/api/admin/controllers/:controllerId/units', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { controllerId } = req.params;
  const { port_number, name, speed } = req.body;
  try {
    const existing = await prisma.cleaningUnit.findFirst({
      where: { controller_id: controllerId, port_number: Number(port_number) }
    });
    if (existing) {
      return res.status(400).json({ error: 'منفذ التوصيل هذا مستخدم بالفعل.' });
    }
    const unit = await prisma.cleaningUnit.create({
      data: {
        controller_id: controllerId,
        port_number: Number(port_number),
        name,
        speed: speed ? Number(speed) : 800,
        is_installed: true
      }
    });
    res.json(unit);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// حذف وحدة تنظيف يدوياً (Admin)
app.delete('/api/admin/units/:unitId', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { unitId } = req.params;
  try {
    await prisma.cleaningUnit.delete({ where: { id: Number(unitId) } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// =============================================================
//  10. Cron: جدولة التنظيف التلقائية
// =============================================================
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5);
    const currentDay = String(now.getDay());
    const currentDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString().split('T')[0];

    const schedules = await prisma.schedule.findMany({
      where: { is_active: 1 },
      include: { unit: { include: { controller: true } } }
    });

    for (const s of schedules) {
      if (!s.unit || !s.unit.controller) continue;
      if (!s.unit.is_installed) continue;
      if (s.unit.controller.status !== 'online') continue;

      // فحص مستوى الماء قبل الجدولة التلقائية
      if (s.unit.water_level <= EMERGENCY_STOP_WATER_LEVEL) {
        console.log(`[CRON] Skipping unit ${s.unit.id}: water too low (${s.unit.water_level}%)`);
        continue;
      }

      let shouldRun = false;
      if (s.schedule_type === 'once') {
        shouldRun = s.specific_date === currentDate && s.cleaning_time === currentTime;
      } else {
        const days = s.days_of_week ? s.days_of_week.split(',') : [];
        if (s.cleaning_time === currentTime && days.includes(currentDay)) {
          const msInWeek = 7 * 24 * 60 * 60 * 1000;
          const diff = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / msInWeek);
          shouldRun = diff % s.interval_weeks === 0;
        }
      }

      if (shouldRun) {
        console.log(`[CRON] Triggering unit ${s.unit.id} on controller ${s.unit.controller_id}`);
        sendCommand(s.unit.controller_id, s.unit.port_number, 'START_CLEAN');

        await prisma.cleaningLog.create({
          data: { unit_id: s.unit.id, triggered_by: 'schedule', status: 'CLEANING' }
        });

        if (s.schedule_type === 'once') {
          await prisma.schedule.update({ where: { id: s.id }, data: { is_active: 0 } });
        }
      }
    }
  } catch (err) {
    console.error('[CRON] Error:', err);
  }
});

// =============================================================
//  10.5 SSE Endpoint – بث رسائل MQTT لحظياً للمتصفح
// =============================================================
app.get('/api/admin/mqtt-stream', authenticateToken, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // ضروري لـ Nginx/Coolify
  res.flushHeaders();

  const id = ++sseClientId;
  const client: SseClient = { res, id };
  sseClients.push(client);
  console.log(`[SSE] Client #${id} connected. Total: ${sseClients.length}`);

  // إرسال رسالة ترحيب أولية
  res.write(`data: ${JSON.stringify({ type: 'connected', ts: new Date().toISOString() })}\n\n`);

  // تنظيف عند إغلاق الاتصال
  req.on('close', () => {
    sseClients = sseClients.filter(c => c.id !== id);
    console.log(`[SSE] Client #${id} disconnected. Total: ${sseClients.length}`);
  });
});

// =============================================================
//  11. Start Server

// =============================================================
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[SERVER] Emergency stop threshold: ${EMERGENCY_STOP_WATER_LEVEL}%`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err);
    process.exit(1);
  }
}

startServer();
