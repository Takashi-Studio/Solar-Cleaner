import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

// دالة تهيئة الاتصال بقاعدة البيانات والتحقق من نشاطها
export async function initializeDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL database successfully via Prisma.');
  } catch (error) {
    console.error('Error connecting to PostgreSQL database:', error);
    throw error;
  }
}
