import { PrismaClient } from '@prisma/client';

// 在开发环境下避免 Next.js 热重载反复创建 PrismaClient 实例导致连接耗尽
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
