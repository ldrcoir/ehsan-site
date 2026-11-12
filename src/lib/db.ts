import { PrismaClient } from '@prisma/client'
import path from 'path'

// حل مشکل مسیر دیتابیس در standalone mode
// مسیر مطلق رو از process.cwd() می‌سازیم
const dbPath = path.join(process.cwd(), 'db', 'custom.db')

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db