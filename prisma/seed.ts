import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    ['Programming', 'programming'],
    ['Design', 'design'],
    ['Translation', 'translation'],
    ['Marketing', 'marketing'],
    ['Writing', 'writing'],
  ];

  for (const [name, slug] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {},
      create: {
        name: 'FreelanceHub Admin',
        email: adminEmail.toLowerCase(),
        passwordHash,
        role: UserRole.ADMIN,
      },
    });
    await prisma.wallet.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id },
    });
  }
}

main()
  .then(() => console.log('Seed completed.'))
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(() => prisma.$disconnect());
