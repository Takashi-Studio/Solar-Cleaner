import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

// دالة تهيئة الاتصال بقاعدة البيانات والتحقق من نشاطها
export async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database successfully via Prisma.');

    // إنشاء مستخدم أدمن افتراضي إذا لم يكن موجوداً
    const defaultAdminUser = process.env.DEFAULT_ADMIN_USER || 'admin';
    const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'adminPassword123';

    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    if (!adminExists) {
      const hash = await bcrypt.hash(defaultAdminPassword, 10);
      await prisma.user.create({
        data: {
          name: 'System Admin',
          username: defaultAdminUser,
          password_hash: hash,
          role: 'ADMIN'
        }
      });
      console.log('--------------------------------------------------');
      console.log('Default Admin User Created successfully!');
      console.log(`Username: ${defaultAdminUser}`);
      console.log(`Password: ${defaultAdminPassword}`);
      console.log('Please change this default password in settings.');
      console.log('--------------------------------------------------');
    }
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
}
