import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create default admin settings with timeout values
  await prisma.adminSettings.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      alertsEnabled: false,
      emailNotifications: false,
      apiRequestTimeout: 30000, // 30 seconds
      databaseQueryTimeout: 10000, // 10 seconds
    },
  });

  console.log('✅ Created admin settings with default timeout values');

  // Create sample API tokens with different scopes
  const token1 = 'demo_token_' + Math.random().toString(36).substring(2, 15);
  const tokenHash1 = await bcrypt.hash(token1, 10);

  await prisma.apiToken.create({
    data: {
      token: token1,
      tokenHash: tokenHash1,
      projectName: 'Demo Project - Full Access',
      description: 'Demo token with all scopes',
      scopes: ['billing', 'userside', 'analytics', 'shared'],
      isActive: true,
      rateLimit: 100,
      createdBy: admin.id,
    },
  });

  const token2 = 'billing_token_' + Math.random().toString(36).substring(2, 15);
  const tokenHash2 = await bcrypt.hash(token2, 10);

  await prisma.apiToken.create({
    data: {
      token: token2,
      tokenHash: tokenHash2,
      projectName: 'Billing Only Project',
      description: 'Demo token with billing scope only',
      scopes: ['billing'],
      isActive: true,
      rateLimit: 50,
      createdBy: admin.id,
    },
  });

  console.log('✅ Created admin user:', admin.email);
  console.log('');
  console.log('🔑 API Tokens:');
  console.log('   Full Access Token:', token1);
  console.log('   Scopes: billing, userside, analytics, shared');
  console.log('');
  console.log('   Billing Only Token:', token2);
  console.log('   Scopes: billing');
  console.log('');
  console.log('📝 Save these tokens for testing!');
  console.log('');
  console.log('🔐 Billing test credentials (stub authentication):');
  console.log('   Username: testuser | Password: test123');
  console.log('   Username: admin    | Password: admin123');
  console.log('');
  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
