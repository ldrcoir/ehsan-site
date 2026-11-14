import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// v1.1.1 (audit Q3/Q4): یک منبع حقیقت برای مسیر دیتابیس.
// قبلاً فقط process.cwd() استفاده می‌شد و DATABASE_URL نادیده گرفته می‌شد →
// اجرای standalone از مسیر دیگر یک db خالیِ جدید می‌ساخت (split-brain).
// حالا DATABASE_URL (اگر ست باشد — docker-compose / .env) برنده است،
// وگرنه fallback به db/custom.db داخل cwd.
function resolveDbPath(): { dbPath: string; envParams: URLSearchParams } {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith("file:")) {
    const raw = envUrl.slice("file:".length);
    if (raw) {
      // v1.1.2 (audit CODE-01-L): DATABASE_URL ممکن است query param داشته باشد؛
      // چسباندن کورکورانه "?connection_limit=1" یک URL دوبل-علامت‌سؤال و Prisma
      // startup failure می‌ساخت. حالا پارامترها merge می‌شوند.
      const qIdx = raw.indexOf("?");
      if (qIdx === -1) return { dbPath: raw, envParams: new URLSearchParams() };
      return { dbPath: raw.slice(0, qIdx), envParams: new URLSearchParams(raw.slice(qIdx + 1)) };
    }
  }
  return { dbPath: path.join(process.cwd(), 'db', 'custom.db'), envParams: new URLSearchParams() }
}

const { dbPath, envParams } = resolveDbPath()

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
envParams.set("connection_limit", "1")
envParams.set("busy_timeout", "5000")
const qs = envParams.toString()
const sqliteUrl = `file:${dbPath}${qs ? `?${qs}` : ""}`

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
