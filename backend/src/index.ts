import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mqtt from 'mqtt';
import cron from 'node-cron';
import { db, initializeDatabase } from './db';
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
    const now = new Date().toISOString();

    // جلب الحالة الحالية للجهاز قبل التحديث
    const prevDevice = await db.get('SELECT state, water_level FROM devices WHERE id = ?', [devId]);

    let updateFields: string[] = [];
    let queryParams: any[] = [];

    if (status) {
      updateFields.push('status = ?');
      queryParams.push(status);
    }
    if (water_level !== undefined) {
      updateFields.push('water_level = ?');
      queryParams.push(water_level);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      queryParams.push(state);
    }

    updateFields.push('last_seen = ?');
    queryParams.push(now);

    queryParams.push(devId); // للـ WHERE clause

    if (updateFields.length > 0) {
      await db.run(
        `UPDATE devices SET ${updateFields.join(', ')} WHERE id = ?`,
        ...queryParams
      );
    }

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
        await db.run(
          `INSERT INTO cleaning_logs (device_id, triggered_by, status, water_level_start, water_level_end, duration_seconds)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [devId, 'remote', logStatus, startInfo.level, endLevel, duration]
        );

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
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    req.userId = decoded.userId;
    next();
  });
}

// --- 3. مسارات الـ APIs (Endpoints) ---

// أ. مسارات التوثيق (Authentication)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide all details.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hash]
    );
    
    const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [result.lastID]);
    const token = jwt.sign({ userId: result.lastID }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err: any) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Email already registered' });
    } else {
      res.status(500).json({ error: 'Database error' });
    }
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'User does not exist.' });
    }
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect password.' });
    }
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ب. مسارات الأجهزة (Devices)
app.post('/api/devices/register', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id, name } = req.body;
  const userId = req.userId;
  try {
    if (!id || !name) return res.status(400).json({ error: 'Device ID and Name are required.' });
    
    const checkDevice = await db.get('SELECT * FROM devices WHERE id = ?', [id]);
    if (checkDevice) {
      await db.run('UPDATE devices SET user_id = ?, name = ? WHERE id = ?', [userId, name, id]);
    } else {
      await db.run(
        'INSERT INTO devices (id, user_id, name, status, state, water_level) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, name, 'offline', 'IDLE', 0]
      );
    }
    res.json({ success: true, message: 'Device registered successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/devices', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const devices = await db.all('SELECT * FROM devices WHERE user_id = ? ORDER BY id', [req.userId]);
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ج. إرسال أوامر التحكم (MQTT Command Triggers)
app.post('/api/devices/:id/clean', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const dev = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [id, req.userId]);
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
    const dev = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    mqttClient.publish(`device/${id}/commands`, 'STOP_CLEAN');
    res.json({ success: true, message: 'Sent STOP_CLEAN command.' });
  } catch (err) {
    res.status(500).json({ error: 'Error stopping cleaning' });
  }
});

// د. إدارة الجدولة الزمنية (Schedules)
app.post('/api/devices/:id/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { cleaning_time, days_of_week } = req.body; // e.g. "08:30", [1, 3, 5]
  try {
    const dev = await db.get('SELECT * FROM devices WHERE id = ? AND user_id = ?', [id, req.userId]);
    if (!dev) return res.status(404).json({ error: 'Device not found.' });

    // تحويل مصفوفة الأيام إلى سلسلة مفصولة بفواصل
    const daysStr = days_of_week.join(',');

    const result = await db.run(
      'INSERT INTO schedules (device_id, cleaning_time, days_of_week) VALUES (?, ?, ?)',
      [id, cleaning_time, daysStr]
    );
    
    const newSchedule = await db.get('SELECT * FROM schedules WHERE id = ?', [result.lastID]);
    
    // إرجاع مصفوفة الأيام بدلاً من السلسلة النصية للواجهة الأمامية
    if (newSchedule) {
      newSchedule.days_of_week = newSchedule.days_of_week.split(',').map(Number);
    }
    res.status(201).json(newSchedule);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/devices/:id/schedules', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const schedules = await db.all('SELECT * FROM schedules WHERE device_id = ? ORDER BY cleaning_time', [id]);
    
    // تحويل سلسلة الأيام مجدداً لمصفوفة أرقام لكل جدول
    schedules.forEach(s => {
      s.days_of_week = s.days_of_week.split(',').map(Number);
    });
    
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/schedules/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    await db.run('DELETE FROM schedules WHERE id = ?', [id]);
    res.json({ success: true, message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// هـ. الحصول على السجلات (Cleaning Logs)
app.get('/api/devices/:id/logs', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const logs = await db.all(
      'SELECT * FROM cleaning_logs WHERE device_id = ? ORDER BY created_at DESC LIMIT 50',
      [id]
    );
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
    const activeSchedules = await db.all(
      `SELECT s.device_id, s.cleaning_time, s.days_of_week, d.status 
       FROM schedules s
       JOIN devices d ON s.device_id = d.id
       WHERE s.is_active = 1`
    );

    for (const schedule of activeSchedules) {
      const days = schedule.days_of_week.split(',');
      
      // مطابقة الوقت الحاضر مع موعد الجدولة ويومها
      if (schedule.cleaning_time === currentHourMin && days.includes(currentDay)) {
        if (schedule.status === 'online') {
          console.log(`Cron: Automatic cleaning triggered for device: ${schedule.device_id}`);
          mqttClient.publish(`device/${schedule.device_id}/commands`, 'START_CLEAN');
          
          await db.run(
            `INSERT INTO cleaning_logs (device_id, triggered_by, status)
             VALUES (?, ?, ?)`,
            [schedule.device_id, 'timer', 'success']
          );
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
