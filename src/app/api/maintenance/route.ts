// ============================================================================
// /api/maintenance — کانال نگهداری اختصاصی و امن (v1.0)
// ============================================================================
// هدف: یک مسیر امن و محدود برای «نگهدارنده‌ی سایت» (مالک + دستیار) که روی سرور
// deployed است تا بدون SSH و بدون لاگین ادمین بتواند وضعیت سایت را بررسی و
// کارهای نگهداری ایمن انجام دهد.
//
// امنیت:
// 1. احراز هویت فقط با هدر X-Maintenance-Token که با process.env.MAINTENANCE_TOKEN
//    مقایسه‌ی timing-safe می‌شود — هیچ cookie و هیچ session در کار نیست، پس
//    CSRF ذاتاً بی‌معناست (مهاجم cross-site نمی‌تواند هدر توکن را بسازد).
//    → به همین دلیل این مسیر در middleware جزو PUBLIC_API_PREFIXES است
//      (معاف از Origin-check) ولی در RATE_LIMIT_PATHS محدود و no-store است.
// 2. Fail-closed: اگر MAINTENANCE_TOKEN در .env ست نشده باشد یا کوتاه‌تر از
//    ۳۲ کاراکتر باشد، همه‌ی درخواست‌ها 503 می‌گیرند — کانال خاموش است.
// 3. Rate limit: ۲۰ درخواست در ۵ دقیقه (middleware) + لاگ همه‌ی تلاش‌ها
//    (موفق و ناموفق) در SecurityLog.
// 4. Actions سفید-لیست شده — هیچ action دلخواه اجرا نمی‌شود.
// 5. هیچ رازی در پاسخ برنمی‌گردد (نه SESSION_SECRET نه توکن‌ها نه webhook secrets).
//
// استفاده (روی VPS):
//   curl -s -X POST https://<domain>/api/maintenance \
//     -H "X-Maintenance-Token: <token از .env>" \
//     -H "Content-Type: application/json" \
//     -d '{"action":"status"}'
//   یا ساده‌تر:  bash scripts/maintenance.sh status
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { promises as fs } from "fs";
import { execFile } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import { getClientIpSafe } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// توکن — fail-closed
// ---------------------------------------------------------------------------
function getToken(): string | null {
  const t = process.env.MAINTENANCE_TOKEN;
  if (!t || t.length < 32) return null; // placeholder/کوتاه → کانال خاموش
  return t;
}

function tokenValid(provided: string | null, real: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(real, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// ابزارها
// ---------------------------------------------------------------------------
function dbFilePath(): string | null {
  const url = process.env.DATABASE_URL || "";
  const m = url.match(/^file:(.+)$/);
  if (!m) return null;
  // v1.0 (audit W56-60 #3): query params مثل ?connection_limit=1 جدا می‌شوند —
  // همان قرارداد lib/db.ts — وگرنه stat/backup روی مسیر اشتباه می‌رفت
  const raw = m[1].split("?")[0];
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

async function dbFileStats(): Promise<{ sizeBytes: number; integrity: string }> {
  const file = dbFilePath();
  let sizeBytes = 0;
  if (file) {
    try {
      sizeBytes = (await fs.stat(file)).size;
    } catch {
      sizeBytes = 0;
    }
  }
  let integrity = "unknown";
  try {
    const rows = await db.$queryRawUnsafe<{ integrity_check: string }[]>(
      "PRAGMA integrity_check"
    );
    integrity = rows?.[0]?.integrity_check || "unknown";
  } catch {
    integrity = "error";
  }
  return { sizeBytes, integrity };
}

// بک‌آپ فوری دیتابیس — نگه‌داری آخرین ۷ نسخه در backups/
// v1.0 (audit W56-60 #2): copyFile خام روی دیتابیس WAL-حالت می‌تواند snapshot
// پاره بدهد (صفحات در حین نوشتن). مثل auto-backup.sh از «sqlite3 .backup»
// استفاده می‌شود (consistent snapshot)؛ اگر CLI نبود، با wal_checkpoint و
// copyFile ادامه می‌دهیم (fallback).
async function runBackup(): Promise<{ ok: boolean; file?: string; error?: string; method?: string }> {
  const file = dbFilePath();
  if (!file) return { ok: false, error: "db_path_unknown" };
  try {
    const backupsDir = path.join(path.dirname(path.dirname(file)), "backups");
    await fs.mkdir(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dest = path.join(backupsDir, `custom-db-maintenance-${stamp}.db`);
    let method = "copy";
    try {
      await new Promise<void>((resolve, reject) => {
        execFile("sqlite3", [file, `.backup '${dest}'`], { timeout: 30000 }, (err) => {
          if (err) reject(err); else resolve();
        });
      });
      method = "sqlite3 .backup";
    } catch {
      // fallback: چک‌پوینت WAL + کپی ساده
      try {
        await db.$executeRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
      } catch {
        // بی‌اهمیت — کپی همچنان انجام می‌شود
      }
      await fs.copyFile(file, dest);
    }
    // نگه‌داری آخرین ۷ نسخه‌ی maintenance
    const existing = (await fs.readdir(backupsDir))
      .filter(f => f.startsWith("custom-db-maintenance-"))
      .sort();
    while (existing.length > 7) {
      const victim = existing.shift()!;
      await fs.unlink(path.join(backupsDir, victim)).catch(() => {});
    }
    return { ok: true, file: path.basename(dest), method };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "backup_failed" };
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
type ActionResult = Record<string, unknown>;

async function runAction(action: string): Promise<ActionResult | null> {
  switch (action) {
    case "help": {
      return {
        actions: [
          "status         — نسخه، uptime، حافظه، تعداد رکوردها، سلامت دیتابیس",
          "db-stats       — آمار کامل جدول‌ها + integrity_check",
          "security-logs  — ۵۰ لاگ امنیتی آخر",
          "messages       — ۲۰ پیام تماس آخر",
          "chats          — آمار چت + ۱۰ نشست آخر",
          "backup         — بک‌آپ فوری دیتابیس (نگه‌داری ۷ نسخه در backups/)",
        ],
      };
    }

    case "status": {
      const mem = process.memoryUsage();
      const [messages, chats, chatMsgs, users, secLogs, clips, views, blocked] =
        await Promise.all([
          db.contactMessage.count(),
          db.chatSession.count(),
          db.chatMessage.count(),
          db.accessUser.count(),
          db.securityLog.count(),
          db.aparatClip.count(),
          db.pageView.count(),
          db.blockedIp.count(),
        ]);
      const { sizeBytes, integrity } = await dbFileStats();
      return {
        version: process.env.APP_VERSION || "1.0",
        node: process.version,
        uptimeSeconds: Math.round(process.uptime()),
        memoryMB: Math.round(mem.rss / 1024 / 1024),
        db: {
          fileBytes: sizeBytes,
          integrity,
        },
        counts: {
          contactMessages: messages,
          chatSessions: chats,
          chatMessages: chatMsgs,
          accessUsers: users,
          securityLogs: secLogs,
          clips: clips,
          pageViews: views,
          blockedIps: blocked,
        },
        recaptchaConfigured: Boolean(process.env.RECAPTCHA_SECRET),
      };
    }

    case "db-stats": {
      const counts: Record<string, number> = {};
      const tableMap: [string, () => Promise<number>][] = [
        ["ContactMessage", () => db.contactMessage.count()],
        ["ChatSession", () => db.chatSession.count()],
        ["ChatMessage", () => db.chatMessage.count()],
        ["MessageReply", () => db.messageReply.count()],
        ["SiteSetting", () => db.siteSetting.count()],
        ["AiProvider", () => db.aiProvider.count()],
        ["PageView", () => db.pageView.count()],
        ["Book", () => db.book.count()],
        ["Article", () => db.article.count()],
        ["Tutorial", () => db.tutorial.count()],
        ["Skill", () => db.skill.count()],
        ["CustomTheme", () => db.customTheme.count()],
        ["SiteText", () => db.siteText.count()],
        ["NavItem", () => db.navItem.count()],
        ["AccessUser", () => db.accessUser.count()],
        ["AccessLog", () => db.accessLog.count()],
        ["BlockedIp", () => db.blockedIp.count()],
        ["SecurityLog", () => db.securityLog.count()],
        ["AparatClip", () => db.aparatClip.count()],
      ];
      for (const [name, fn] of tableMap) {
        try {
          counts[name] = await fn();
        } catch {
          counts[name] = -1;
        }
      }
      const { sizeBytes, integrity } = await dbFileStats();
      return { counts, fileBytes: sizeBytes, integrity };
    }

    case "security-logs": {
      const logs = await db.securityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, type: true, ip: true, detail: true, createdAt: true },
      });
      return { logs };
    }

    case "messages": {
      const messages = await db.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true, name: true, email: true,
          message: true, status: true, createdAt: true,
        },
      });
      // متن پیام برای خروجی کوتاه‌تر محدود می‌شود
      return {
        messages: messages.map(m => ({ ...m, message: m.message?.slice(0, 300) })),
      };
    }

    case "chats": {
      const [sessions, total] = await Promise.all([
        db.chatSession.findMany({
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            id: true, visitorId: true, createdAt: true, updatedAt: true,
            _count: { select: { messages: true } },
          },
        }),
        db.chatSession.count(),
      ]);
      return {
        total,
        sessions: sessions.map(s => ({
          id: s.id,
          visitorId: s.visitorId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          messages: s._count.messages,
        })),
      };
    }

    case "backup": {
      return { backup: await runBackup() };
    }

    default:
      return null; // action ناشناخته
  }
}

// ---------------------------------------------------------------------------
// POST /api/maintenance
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const ip = getClientIpSafe(request);

  // احراز هویت — قبل از هر چیز (حتی قبل از خواندن body)
  const token = getToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "maintenance_disabled" },
      { status: 503 }
    );
  }
  const provided = request.headers.get("x-maintenance-token");
  if (!tokenValid(provided, token)) {
    await db.securityLog
      .create({
        data: { type: "maintenance_auth_failed", ip, detail: "invalid or missing maintenance token" },
      })
      .catch(() => {});
    // تاخیر تصادفی کوتاه — brute-force را کمی گران‌تر می‌کند
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body?.action === "string" ? body.action : "";

  try {
    const data = await runAction(action);
    if (data === null) {
      await db.securityLog
        .create({
          data: { type: "maintenance_action_rejected", ip, detail: `unknown action: ${action.slice(0, 60)}` },
        })
        .catch(() => {});
      return NextResponse.json(
        { ok: false, error: "unknown_action", hint: "action=help برای دیدن لیست" },
        { status: 400 }
      );
    }
    await db.securityLog
      .create({
        data: { type: "maintenance_action", ip, detail: `action=${action}` },
      })
      .catch(() => {});
    return NextResponse.json(
      { ok: true, action, data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/maintenance] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}

// GET هم پاسخ می‌دهد ولی فقط راهنما — بدون هیچ داده‌ای (حتی با توکن معتبر)
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "maintenance",
    usage: "POST { action: 'status'|'db-stats'|'security-logs'|'messages'|'chats'|'backup'|'help' } با هدر X-Maintenance-Token",
  }, { headers: { "Cache-Control": "no-store" } });
}
