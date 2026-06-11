import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

// دالة تهيئة الاتصال بقاعدة البيانات والتحقق من نشاطها
export async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database successfully via Prisma.');

    // إنشاء مستخدم أدمن افتراضي إذا لم يكن موجوداً
    const adminExists = await prisma.user.findUnique({
      where: { email: 'admin@solar.com' }
    });
    if (!adminExists) {
      const defaultAdminPassword = 'adminPassword123';
      const hash = await bcrypt.hash(defaultAdminPassword, 10);
      await prisma.user.create({
        data: {
          name: 'System Admin',
          email: 'admin@solar.com',
          password_hash: hash,
          role: 'ADMIN'
        }
      });
      console.log('--------------------------------------------------');
      console.log('Default Admin User Created successfully!');
      console.log('Email: admin@solar.com');
      console.log('Password: adminPassword123');
      console.log('Please change this default password in settings.');
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
}
