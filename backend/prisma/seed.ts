import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始数据库种子...');

  // 创建默认管理员账户
  const adminPassword = await bcrypt.hash('admin123456', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      email: 'admin@devops.com',
      role: UserRole.SUPER_ADMIN,
      enabled: true,
    },
  });

  console.log('✅ 创建管理员账户:', admin.username);

  // 创建测试用户
  const operatorPassword = await bcrypt.hash('operator123', 10);

  const operator = await prisma.user.upsert({
    where: { username: 'operator' },
    update: {},
    create: {
      username: 'operator',
      password: operatorPassword,
      email: 'operator@devops.com',
      role: UserRole.OPERATOR,
      enabled: true,
    },
  });

  console.log('✅ 创建操作员账户:', operator.username);

  // 创建默认项目
  const project = await prisma.project.upsert({
    where: { id: 'default-project' },
    update: {},
    create: {
      id: 'default-project',
      name: '默认项目',
      description: '系统默认项目',
      createdBy: admin.id,
    },
  });

  console.log('✅ 创建默认项目:', project.name);

  // 添加管理员到项目
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  console.log('✅ 添加管理员到项目');

  console.log('🎉 数据库种子完成！');
  console.log('');
  console.log('📝 默认账户信息:');
  console.log('   管理员: admin / admin123456');
  console.log('   操作员: operator / operator123');
}

main()
  .catch((e) => {
    console.error('❌ 种子失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
