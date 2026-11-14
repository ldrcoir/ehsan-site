import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// v1.1.1 (audit Q3/Q4): یک منبع حقیقت برای مسیر دیتابیس.
// قبلاً فقط process.cwd() استفاده می‌شد و DATABASE_URL نادیده گرفته می‌شد →
// اجرای standalone از مسیر دیگر یک db خالیِ جدید می‌ساخت (split-brain).
// حالا DATABASE_URL (اگر ست باشد — docker-compose / .env) برنده است،
// وگرنه fallback به db/custom.db داخل cwd.
function resolveDbPath(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith("file:")) {
    const p = envUrl.slice("file:".length);
    if (p) return p;
  }
  return path.join(process.cwd(), 'db', 'custom.db')
}

const dbPath = resolveDbPath()

// v1.1.1 (audit Q3): اگر مسیر والد وجود ندارد بساز — جلوگیری از خطای رمزگذاری فایل
try {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
} catch {}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// v1.1.1 (audit Q3-M/H / S6-L8): SQLite concurrency defenses.
// سایت در هر بازدید صفحه می‌نویسد (PageView + visitorCount) و همزمان contact/chat/
// login هم می‌نویسند — با journal-mode پیش‌فرض این‌ها روی file-lock تصادم می‌کنند
// و "database is locked" (SQLITE_BUSY) 500 می‌داد. WAL خواندن‌ها را موازی می‌کند،
// busy_timeout=5000 به SQLite اجازه wait تا ۵ ثانیه می‌دهد و connection_limit=1
// صف سریالی شکل می‌دهد (برای SQLite تک‌فایلی درست‌ترین حالت است).
const sqliteUrl = `file:${dbPath}?connection_limit=1&busy_timeout=5000`

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: sqliteUrl,
      },
    },
  })
  // WAL + synchronous=NORMAL — یک‌بار در شروع هر process اجرا می‌شود.
  // اگر فایل DB هنوز ساخته نشده باشد، sqlite3 خودش می‌سازد و pragma بی‌ضرر است.
  client.$executeRawUnsafe('PRAGMA journal_mode=WAL;').catch(() => {})
  client.$executeRawUnsafe('PRAGMA synchronous=NORMAL;').catch(() => {})
  return client
}

export const db =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
