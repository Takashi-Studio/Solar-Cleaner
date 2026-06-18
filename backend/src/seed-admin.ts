import dotenv from 'dotenv';
dotenv.config();
import { prisma } from './db';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  // استقبال اسم المستخدم وكلمة المرور كـ Arguments إذا تم تمريرها، وإلا استخدام القيم الافتراضية
  const args = process.argv.slice(2);
  const username = args[0] || 'admin';
  const password = args[1] || 'adminPassword123';
  const name = args[2] || 'System Admin';

  try {
    const existing = await prisma.user.findUnique({
      where: { username }
    });

    if (existing) {
      console.log(`[SEED] User with username '${username}' already exists. Updating to ADMIN role...`);
      await prisma.user.update({
        where: { username },
        data: { role: 'ADMIN' }
      });
      console.log('[SEED] User role updated successfully!');
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        name,
        username,
        password_hash: hash,
        role: 'ADMIN'
      }
    });

    console.log('--------------------------------------------------');
    console.log('[SEED] Admin user injected successfully!');
    console.log(`ID: ${admin.id}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Username: ${admin.username}`);
    console.log(`Password: ${password}`);
    console.log('--------------------------------------------------');
  } catch (err: any) {
    console.error('[SEED] Failed to inject admin user:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
