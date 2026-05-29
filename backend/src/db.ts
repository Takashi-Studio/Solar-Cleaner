import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbFile = process.env.DATABASE_FILE || 'database.sqlite';
const dbPath = path.resolve(__dirname, '..', dbFile);

export let db: Database;

// دالة تهيئة الاتصال بقاعدة البيانات وإنشاء الجداول
export async function initializeDatabase() {
  try {
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // فتح ملف قاعدة البيانات
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // تمكين تفعيل المفاتيح الخارجية (Foreign Keys) في SQLite
    await db.run('PRAGMA foreign_keys = ON');

    // 1. جدول المستخدمين
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. جدول الأجهزة (Devices)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'offline',
        state TEXT DEFAULT 'IDLE',
        water_level INTEGER DEFAULT 0,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    // 3. جدول الجدولة التلقائية (Schedules)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        cleaning_time TEXT NOT NULL, -- صيغة "HH:MM"
        days_of_week TEXT NOT NULL,  -- سنخزن الأيام كسلسلة مفصولة بفواصل، مثل: "1,3,5"
        is_active INTEGER DEFAULT 1, -- 1 لـ True، و 0 لـ False
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      );
    `);

    // 4. جدول سجلات التنظيف (Cleaning Logs)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS cleaning_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT,
        triggered_by TEXT NOT NULL, -- 'manual' or 'timer'
        status TEXT NOT NULL, -- 'success', 'failed', 'stopped', 'water_low'
        water_level_start INTEGER,
        water_level_end INTEGER,
        duration_seconds INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
      );
    `);

    console.log('SQLite database initialized successfully.');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    throw error;
  }
}
