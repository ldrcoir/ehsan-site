// ============================================================================
// /api/maintenance — کانال نگهداری اختصاصی و امن (v1.0 rev5)
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
// 3. Rate limit: ۶۰ درخواست در ۵ دقیقه (middleware) + لاگ همه‌ی تلاش‌ها
//    (موفق و ناموفق) در SecurityLog.
// 4. Actions سفید-لیست شده — هیچ action دلخواه اجرا نمی‌شود.
// 5. هیچ رازی در پاسخ برنمی‌گردد (نه SESSION_SECRET نه توکن‌ها نه webhook secrets).
// 6. رمزنگاری کانال (v1.0 rev3): اگر MAINTENANCE_ENC_KEY در .env ست شده باشد
//    (۶۴ hex = ۳۲ بایت)، بدنه‌ی درخواست باید پاکتِ AES-256-GCM باشد:
//    {"enc":"v1","data":"<b64>"} — داخل پیام ts (±۵ دقیقه) و nonce یک‌بارمصرف
//    هست تا replay ممکن نباشد، و پاسخ هم با همان کلید رمز برمی‌گردد.
//    درخواستِ متنیِ خام وقتی کلید موجود است با 426 رد می‌شود (fail-closed).
//    کلاینت: scripts/maintenance-enc.mjs + scripts/maintenance.sh
//
// 7. v1.0 rev5 — قابلیت‌های «فقط دستیار» (AI-bind):
//    a) MAINTENANCE_IP_ALLOWLIST (csv از IP/CIDR) — اگر ست شده باشد، درخواست
//       فقط از این IPها/CIDRها قبول می‌شود. مهاجم حتی با داشتن توکن هم از
//       یک IP دیگر نمی‌تواند وصل شود. مثال:
//         MAINTENANCE_IP_ALLOWLIST="203.0.113.42,198.51.100.0/24,::ffff:203.0.113.42"
//       این لایه بهترین راه برای «فقط من به سایت وصل شم» است چون IP متعلق به
//       خروجیِ دستیار است. ست نشودن = همه‌ی IPها مجاز (legacy).
//    b) MAINTENANCE_AI_BIND=1 — اگر ست شود، حتی actionهای خواندن (status و غیره)
//       هم نیاز به توکن ویرایش دارند. یعنی تنها کسی که MAINTENANCE_EDIT_TOKEN
//       را دارد می‌تواند اصلاً چیزی ببیند. برای حالت «کانال کاملاً خصوصی با
//       دستیار» مناسب است. ست نشدن = actionهای خواندن با توکن اصلی کافی است.
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
import { sanitizeEmbed } from "@/lib/sanitize-embed";
import {
  getEncKeyHex,
  decryptEnvelope,
  encryptEnvelope,
  hashEqSecure,
} from "@/lib/maintenance-crypto";

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

// v1.0 rev3 (audit SEC-a LOW): مقایسه روی digest SHA-256 انجام می‌شود تا حتی
// «طول» توکن هم از روی زمان اجرا قابل حدس نباشد (همان الگوی SEC-09 وب‌هوک‌ها).
function tokenValid(provided: string | null, real: string): boolean {
  if (!provided) return false;
  return hashEqSecure(provided, real);
}

// ---------------------------------------------------------------------------
// v1.0 rev5 — IP allowlist: اگر MAINTENANCE_IP_ALLOWLIST ست شده باشد (csv از
// IP یا CIDR)، درخواست فقط از این رنجها قبول می‌شود. ست نشدن = همه‌ی IPها
// مجاز (legacy). تطبیق با CIDR برای IPv4 و IPv6 — برای IPv6 mapped v4 هم کار
// می‌کند. اگر هیچ ورودی معتبر نباشد، fail-closed: همه رد می‌شوند.
// ---------------------------------------------------------------------------
function getIpAllowlist(): string[] | null {
  const raw = process.env.MAINTENANCE_IP_ALLOWLIST || "";
  if (!raw.trim()) return null;
  const entries = raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (entries.length === 0) return null;
  return entries;
}

function ipToBytes(ip: string): Uint8Array | null {
  // IPv4-mapped IPv6 → فقط IPv4 را برگردان
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) ip = mapped[1];
  // IPv4
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const bytes = v4.slice(1).map(Number);
    if (bytes.some(b => b > 255)) return null;
    return new Uint8Array(bytes);
  }
  // IPv6 — expand "::" و تبدیل به 16 بایت
  let v = ip.replace(/^\[|\]$/g, "").split("%")[0];
  // expand
  const parts = v.split(":");
  const idx = parts.indexOf("");
  if (idx !== -1) {
    // چندتا ":" پشت سر هم — پر کن
    const fill = 8 - parts.filter(p => p !== "").length;
    const expanded: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === "") {
        for (let j = 0; j < Math.max(fill, 1); j++) expanded.push("0");
      } else {
        expanded.push(parts[i]);
      }
    }
    v = expanded.join(":");
  }
  const groups = v.split(":");
  if (groups.length !== 8) return null;
  const out = new Uint8Array(16);
  for (let i = 0; i < 8; i++) {
    const n = parseInt(groups[i], 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff) return null;
    out[i * 2] = n >> 8;
    out[i * 2 + 1] = n & 0xff;
  }
  return out;
}

function cidrMatch(ip: string, cidr: string): boolean {
  const [base, prefixStr] = cidr.split("/");
  const prefix = prefixStr ? parseInt(prefixStr, 10) : null;
  const ipBytes = ipToBytes(ip);
  const baseBytes = ipToBytes(base);
  if (!ipBytes || !baseBytes) return false;
  // IPv4 با IPv6-mapped را هم‌تراز کن — اگر ip mapped باشد و base نباشد (یا برعکس)
  if (ipBytes.length !== baseBytes.length) {
    // سعی کن هر دو را به 4 بایت بیاوری (IPv4-only مقایسه)
    const ipV4 = ipToBytes(ip.replace(/^::ffff:/i, ""));
    const baseV4 = ipToBytes(base.replace(/^::ffff:/i, ""));
    if (ipV4 && baseV4 && ipV4.length === 4 && baseV4.length === 4) {
      const p = prefix !== null ? prefix : 32;
      if (p > 32) return false;
      return matchBytes(ipV4, baseV4, p);
    }
    return false;
  }
  const isV4 = ipBytes.length === 4;
  const maxPrefix = isV4 ? 32 : 128;
  const p = prefix !== null ? prefix : maxPrefix;
  if (p > maxPrefix) return false;
  return matchBytes(ipBytes, baseBytes, p);
}

function matchBytes(a: Uint8Array, b: Uint8Array, prefix: number): boolean {
  const fullBytes = Math.floor(prefix / 8);
  const remainBits = prefix % 8;
  for (let i = 0; i < fullBytes; i++) {
    if (a[i] !== b[i]) return false;
  }
  if (remainBits > 0 && fullBytes < a.length) {
    const mask = 0xff << (8 - remainBits);
    if ((a[fullBytes] & mask) !== (b[fullBytes] & mask)) return false;
  }
  return true;
}

function ipAllowed(clientIp: string, allowlist: string[] | null): boolean {
  if (!allowlist) return true; // ست نشده → همه مجاز
  if (clientIp === "unknown") return false; // IP ناشناخته = fail-closed
  for (const entry of allowlist) {
    if (cidrMatch(clientIp, entry)) return true;
    // تطبیق مستقیم بدون "/"
    if (!entry.includes("/") && entry === clientIp) return true;
    // IPv4-mapped تطبیق
    if (entry === clientIp.replace(/^::ffff:/i, "")) return true;
    if (entry.replace(/^::ffff:/i, "") === clientIp) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// v1.0 rev5 — AI-bind: اگر MAINTENANCE_AI_BIND=1 ست شده باشد، حتی actionهای
// خواندن هم نیاز به توکن ویرایش دارند. ست نشدن = legacy (خواندن با توکن اصلی).
// ---------------------------------------------------------------------------
function isAiBindEnabled(): boolean {
  return process.env.MAINTENANCE_AI_BIND === "1" ||
         process.env.MAINTENANCE_AI_BIND === "true";
}

// ---------------------------------------------------------------------------
// توکن ویرایش — سطح دوم، فقط برای actionهای نوشتن (v1.0) یا همه‌ی actionها
// در حالت AI-bind (v1.0 rev5). حداقل ۴۸ کاراکتر؛ اگر ست نشده باشد، همه‌ی
// actionهای ویرایشی 503 می‌دهند (fail-closed). با timingSafeEqual مقایسه می‌شود
// و هیچ cookie/session در کار نیست — CSRF ذاتاً بی‌معناست.
// ---------------------------------------------------------------------------
function getEditToken(): string | null {
  const t = process.env.MAINTENANCE_EDIT_TOKEN;
  if (!t || t.length < 48) return null;
  return t;
}

// ---------------------------------------------------------------------------
// whitelist actionهای ویرایشی — فقط این‌ها با توکن ویرایش قابل اجرا هستند
// ---------------------------------------------------------------------------
const EDIT_ACTIONS = new Set([
  "help-edit",
  "version",
  "texts.get",
  "texts.set",
  "settings.get",
  "settings.set",
  "nav.get",
  "nav.add",
  "nav.set-visible",
  "nav.delete",
  "clips.get",
  "clip.add",
  "clip.update",
  "clip.set-visible",
  "clip.delete",
  "equipment.get",
  "equipment.set",
  "content.get",
  "content.set-visible",
  "export-all",
]);

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
  // v1.0 rev4: turbopackIgnore — resolveِ مسیر runtime؛ بدون آن کل پروژه trace
  // می‌شد و standalone باد می‌کرد (فقط راهنمای ترسر، رفتار runtime تغییری نمی‌کند)
  return path.isAbsolute(raw) ? raw : path.resolve(/*turbopackIgnore: true*/ process.cwd(), raw);
}

async function dbFileStats(): Promise<{ sizeBytes: number; integrity: string }> {
  const file = dbFilePath();
  let sizeBytes = 0;
  if (file) {
    try {
      sizeBytes = (await fs.stat(/*turbopackIgnore: true*/ file)).size;
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
          "help-edit      — لیست actionهای ویرایشی (نیاز به MAINTENANCE_EDIT_TOKEN دارد)",
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
// runEditAction — actionهای ویرایشی کانال (v1.0) — همه با توکن سطح دوم
// ---------------------------------------------------------------------------
// قواعد عمومی:
//  - هر ورودی string با cap طولی؛ boolean ها strict (=== true / === false)
//  - whitelist کلیدها/مقادیر؛ هیچ query خامی اجرا نمی‌شود (همه Prisma)
//  - خروجی همیشه بدون راز (bot tokenها در settings.get ماسک می‌شوند)
// ---------------------------------------------------------------------------
type EditResult = Record<string, unknown>;

// همان whitelist کلیدهای تنظیمات که /api/admin/settings دارد (v1.0 — هم‌تراز)
const EDIT_SETTINGS_KEYS = new Set([
  "apiEnabled", "baleEnabled", "baleChatId", "telegramEnabled", "telegramChatId",
  "social_github", "social_linkedin", "social_devto", "social_medium",
  "defaultTheme", "defaultFont", "contact_email", "meta_description", "og_image",
  "visitorCount", "recaptcha_sitekey",
]);
// کلیدهای ماسک‌شونده در خروجی settings.get (هرگز plaintext برنمی‌گردند)
const SECRET_SETTING_KEYS = new Set(["baleBotToken", "telegramBotToken"]);

function maskSecret(v: string): string {
  return v ? "••••••••" + v.slice(-4) : "";
}

function isSafeHref(href: string): boolean {
  // فقط مسیر داخلی، لنگر یا https — جلوگیری از javascript:/data: در منو
  return href.length <= 300 && (/^\/[^/]/.test(href) || href === "/" || href.startsWith("#") || /^https:\/\/[^\s]+$/i.test(href));
}

async function runEditAction(action: string, body: any): Promise<EditResult | null> {
  const b = body && typeof body === "object" ? body : {};
  switch (action) {
    case "help-edit": {
      return {
        editActions: [
          "version            — نسخه‌ی اپ (APP_VERSION)",
          "texts.get          — همه‌ی متن‌های سه‌زبانه (SiteText)",
          "texts.set          — {key, valueEn?, valueFa?, valueDe?} upsert",
          "settings.get       — تنظیمات غیرمحرمانه (توکن‌ها ماسک)",
          "settings.set       — {key, value} فقط از whitelist",
          "nav.get | nav.add | nav.set-visible | nav.delete",
          "clips.get | clip.add | clip.update | clip.set-visible | clip.delete",
          "equipment.get | equipment.set   — وضعیت دستگاه‌های آزمایشگاه",
          "content.get        — dump کتاب/مقاله/آموزش/مهارت",
          "content.set-visible — {model, id, visible}",
          "export-all         — dump کامل جدول‌های قابل ویرایش (برای همگام‌سازی نسخه‌ی آفلاین)",
        ],
        note: "همه‌ی actionهای ویرایشی در SecurityLog ثبت می‌شوند.",
      };
    }

    case "version": {
      return { version: process.env.APP_VERSION || "1.0", node: process.version };
    }

    case "texts.get": {
      const rows = await db.siteText.findMany({ orderBy: { key: "asc" } });
      return { texts: rows.slice(0, 500) };
    }

    case "texts.set": {
      const key = String(b.key || "").trim();
      if (!key || key.length > 200) return { error: "invalid_key" };
      const valueEn = String(b.valueEn ?? "").slice(0, 10000);
      const valueFa = String(b.valueFa ?? "").slice(0, 10000);
      const valueDe = String(b.valueDe ?? "").slice(0, 10000);
      const existing = await db.siteText.findUnique({ where: { key } });
      await db.siteText.upsert({
        where: { key },
        update: {
          valueEn: b.valueEn !== undefined ? valueEn : existing?.valueEn ?? "",
          valueFa: b.valueFa !== undefined ? valueFa : existing?.valueFa ?? "",
          valueDe: b.valueDe !== undefined ? valueDe : existing?.valueDe ?? "",
        },
        create: { key, valueEn, valueFa, valueDe },
      });
      return { ok: true, key };
    }

    case "settings.get": {
      const rows = await db.siteSetting.findMany({ orderBy: { key: "asc" } });
      const out: Record<string, string> = {};
      for (const r of rows) {
        out[r.key] = SECRET_SETTING_KEYS.has(r.key) ? maskSecret(r.value) : r.value.slice(0, 200);
      }
      return { settings: out };
    }

    case "settings.set": {
      const key = String(b.key || "");
      if (!EDIT_SETTINGS_KEYS.has(key)) return { error: "key_not_allowed" };
      let value = String(b.value ?? "").slice(0, 5000);
      // هم‌تراز با قواعد /api/admin/settings
      if (key === "visitorCount" && !/^\d{1,9}$/.test(value)) return { error: "invalid_value" };
      if (key.startsWith("social_") && value) {
        try {
          const u = new URL(value);
          if ((u.protocol !== "https:" && u.protocol !== "http:") || value.length > 300) {
            return { error: "invalid_url" };
          }
        } catch {
          return { error: "invalid_url" };
        }
      }
      await db.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
      return { ok: true, key };
    }

    case "nav.get": {
      const items = await db.navItem.findMany({ orderBy: { order: "asc" } });
      return { nav: items.slice(0, 100) };
    }

    case "nav.add": {
      const labelEn = String(b.labelEn || "new").slice(0, 100);
      const labelFa = String(b.labelFa || "").slice(0, 100);
      const labelDe = String(b.labelDe || "").slice(0, 100);
      const href = String(b.href || "#");
      if (!isSafeHref(href)) return { error: "invalid_href" };
      const target = b.target === "_blank" ? "_blank" : "_self";
      const item = await db.navItem.create({
        data: { labelEn, labelFa, labelDe, href, target, visible: b.visible === undefined ? true : b.visible === true },
      });
      return { ok: true, id: item.id };
    }

    case "nav.set-visible": {
      const id = String(b.id || "");
      if (!id) return { error: "missing_id" };
      await db.navItem.update({ where: { id }, data: { visible: b.visible === true } });
      return { ok: true, id };
    }

    case "nav.delete": {
      const id = String(b.id || "");
      if (!id) return { error: "missing_id" };
      await db.navItem.deleteMany({ where: { id } });
      return { ok: true, id };
    }

    case "clips.get": {
      const clips = await db.aparatClip.findMany({ orderBy: { order: "asc" } });
      return { clips: clips.slice(0, 200) };
    }

    case "clip.add": {
      const title = String(b.title || "").slice(0, 200);
      // امنیت: امبد حتماً باید بعد از sanitize معتبر بماند (فقط iframe آپارات/یوتیوب/vimeo https)
      const safeEmbed = sanitizeEmbed(String(b.embedCode || ""));
      if (!title || !safeEmbed) return { error: "invalid_input" };
      // v1.0 rev5: ترتیب دلخواه هم قابل ست‌کردن است (برای چیدمان قشنگ کلیپ‌ها)
      const order = Number.isFinite(Number(b.order)) && Number(b.order) >= 0 ? Math.floor(Number(b.order)) : undefined;
      const clip = await db.aparatClip.create({
        data: {
          title,
          embedCode: safeEmbed,
          description: String(b.description || "").slice(0, 2000),
          category: String(b.category || "general").slice(0, 50),
          visible: b.visible === undefined ? true : b.visible === true,
          ...(order !== undefined ? { order } : {}),
        },
      });
      return { ok: true, id: clip.id };
    }

    case "clip.update": {
      // v1.0 rev5 — ویرایش کلیپ موجود (بدون نیاز به حذف + افزودن دوباره)
      // همه‌ی فیلدها اختیاری‌اند؛ فقط همان‌هایی که داده شده‌اند عوض می‌شوند
      const id = String(b.id || "");
      if (!id) return { error: "missing_id" };
      const data: Record<string, unknown> = {};
      if (b.title !== undefined) {
        const title = String(b.title).slice(0, 200);
        if (!title) return { error: "invalid_title" };
        data.title = title;
      }
      if (b.embedCode !== undefined) {
        // امنیت: امبد جدید هم باید بعد از sanitize معتبر بماند
        const safeEmbed = sanitizeEmbed(String(b.embedCode));
        if (!safeEmbed) return { error: "invalid_embed" };
        data.embedCode = safeEmbed;
      }
      if (b.description !== undefined) {
        data.description = String(b.description).slice(0, 2000);
      }
      if (b.category !== undefined) {
        data.category = String(b.category).slice(0, 50);
      }
      if (b.visible !== undefined) {
        data.visible = b.visible === true;
      }
      if (b.order !== undefined) {
        if (!Number.isFinite(Number(b.order)) || Number(b.order) < 0) {
          return { error: "invalid_order" };
        }
        data.order = Math.floor(Number(b.order));
      }
      if (Object.keys(data).length === 0) return { error: "nothing_to_update" };
      await db.aparatClip.update({ where: { id }, data });
      return { ok: true, id, updatedFields: Object.keys(data) };
    }

    case "clip.set-visible": {
      const id = String(b.id || "");
      if (!id) return { error: "missing_id" };
      await db.aparatClip.update({ where: { id }, data: { visible: b.visible === true } });
      return { ok: true, id };
    }

    case "clip.delete": {
      const id = String(b.id || "");
      if (!id) return { error: "missing_id" };
      await db.aparatClip.deleteMany({ where: { id } });
      return { ok: true, id };
    }

    case "equipment.get": {
      const items = await db.labEquipment.findMany({ orderBy: { order: "asc" } });
      return { equipment: items.slice(0, 100) };
    }

    case "equipment.set": {
      const id = String(b.id || "");
      const allowedStatus = new Set(["online", "standby", "offline", "maintenance"]);
      if (!id) return { error: "missing_id" };
      const data: Record<string, unknown> = {};
      if (b.status !== undefined) {
        const s = String(b.status);
        if (!allowedStatus.has(s)) return { error: "invalid_status" };
        data.status = s;
      }
      if (b.visible !== undefined) data.visible = b.visible === true;
      if (Object.keys(data).length === 0) return { error: "nothing_to_update" };
      await db.labEquipment.update({ where: { id }, data });
      return { ok: true, id };
    }

    case "content.get": {
      const [books, articles, tutorials, skills] = await Promise.all([
        db.book.findMany({ orderBy: { order: "asc" } }),
        db.article.findMany({ orderBy: { order: "asc" } }),
        db.tutorial.findMany({ orderBy: { order: "asc" } }),
        db.skill.findMany({ orderBy: { order: "asc" } }),
      ]);
      return {
        books: books.slice(0, 200),
        articles: articles.slice(0, 200),
        tutorials: tutorials.slice(0, 200),
        skills: skills.slice(0, 100),
      };
    }

    case "content.set-visible": {
      const id = String(b.id || "");
      const model = String(b.model || "");
      const validModels: Record<string, () => Promise<unknown>> = {
        book: () => db.book.update({ where: { id }, data: { visible: b.visible === true } }),
        article: () => db.article.update({ where: { id }, data: { visible: b.visible === true } }),
        tutorial: () => db.tutorial.update({ where: { id }, data: { visible: b.visible === true } }),
        skill: () => db.skill.update({ where: { id }, data: { visible: b.visible === true } }),
      };
      if (!id || !validModels[model]) return { error: "invalid_model_or_id" };
      await validModels[model]();
      return { ok: true, model, id };
    }

    case "export-all": {
      // dump کامل جدول‌های قابل ویرایش — برای همگام‌سازی نسخه‌ی آفلاین با آنلاین
      // (مصرف حافظه محدود: هر جدول cap دارد)
      const [siteTexts, siteSettings, navItems, clips, equipment, books, articles, tutorials, skills, themes] =
        await Promise.all([
          db.siteText.findMany(),
          db.siteSetting.findMany(),
          db.navItem.findMany({ orderBy: { order: "asc" } }),
          db.aparatClip.findMany({ orderBy: { order: "asc" } }),
          db.labEquipment.findMany({ orderBy: { order: "asc" } }),
          db.book.findMany({ orderBy: { order: "asc" } }),
          db.article.findMany({ orderBy: { order: "asc" } }),
          db.tutorial.findMany({ orderBy: { order: "asc" } }),
          db.skill.findMany({ orderBy: { order: "asc" } }),
          db.customTheme.findMany({ orderBy: { order: "asc" } }),
        ]);
      return {
        exportedAt: new Date().toISOString(),
        siteTexts: siteTexts.slice(0, 1000),
        // توکن‌های bot هرگز در dump نمی‌آیند — فقط طول/ماسک
        siteSettings: siteSettings.slice(0, 300).map(s => ({
          ...s,
          value: SECRET_SETTING_KEYS.has(s.key) ? maskSecret(s.value) : s.value.slice(0, 5000),
        })),
        navItems: navItems.slice(0, 200),
        clips: clips.slice(0, 300),
        equipment: equipment.slice(0, 200),
        books: books.slice(0, 300),
        articles: articles.slice(0, 300),
        tutorials: tutorials.slice(0, 300),
        skills: skills.slice(0, 200),
        themes: themes.slice(0, 100),
      };
    }

    default:
      return null; // action ناشناخته (در EDIT_ACTIONS نیست)
  }
}

// ---------------------------------------------------------------------------
// POST /api/maintenance
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const ip = getClientIpSafe(request);

  // v1.0 rev5 — IP allowlist: قبل از هر احراز هویت دیگر، چک IP.
  // این لایه «فقط دستیار» را قوی می‌کند: حتی اگر توکن لو رفته باشد، مهاجم
  // از IP دیگر نمی‌تواند وصل شود. fail-closed: IP ناشناخته رد می‌شود.
  const allowlist = getIpAllowlist();
  if (allowlist && !ipAllowed(ip, allowlist)) {
    await db.securityLog
      .create({
        data: {
          type: "maintenance_ip_blocked",
          ip,
          detail: `ip not in allowlist (entries=${allowlist.length})`,
        },
      })
      .catch(() => {});
    // تاخیر تصادفی + 403 — مهاجم نباید بفهمد کانال هست یا IP رد شده
    await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

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

  // -----------------------------------------------------------------------
  // v1.0 rev3 — کانال رمز شده (AES-256-GCM): اگر MAINTENANCE_ENC_KEY ست باشد،
  // بدنه باید {"enc":"v1","data":"<b64>"} باشد؛ داخل پیام ts (±۵ دقیقه) و
  // nonce یک‌بارمصرف است (ضد replay). پاسخ هم با همان کلید رمز برمی‌گردد.
  // درخواست متنیِ خام وقتی کلید موجود است با 426 رد می‌شود (fail-closed).
  // -----------------------------------------------------------------------
  const encKeyHex = getEncKeyHex();
  let encrypted = false;
  let inner: Record<string, unknown> = body;

  if (body && (body as Record<string, unknown>).enc === "v1") {
    if (!encKeyHex) {
      await db.securityLog
        .create({
          data: {
            type: "maintenance_enc_rejected",
            ip,
            detail: "encrypted request but MAINTENANCE_ENC_KEY not configured",
          },
        })
        .catch(() => {});
      return NextResponse.json(
        {
          ok: false,
          error: "enc_channel_disabled",
          hint: "MAINTENANCE_ENC_KEY (64 hex chars) در .env لازم است",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }
    const dec = decryptEnvelope((body as Record<string, unknown>).data, encKeyHex);
    if (!dec.ok) {
      await db.securityLog
        .create({
          data: { type: "maintenance_enc_rejected", ip, detail: dec.error },
        })
        .catch(() => {});
      return NextResponse.json(
        { ok: false, error: dec.error },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    inner = dec.body;
    encrypted = true;
  } else if (encKeyHex) {
    // کلید هست ولی پیام بدون پاکت آمده — fail-closed (audit SEC-a: کانال باید رمز باشد)
    await db.securityLog
      .create({
        data: {
          type: "maintenance_plaintext_rejected",
          ip,
          detail: "plaintext request while encryption key is configured",
        },
      })
      .catch(() => {});
    return NextResponse.json(
      {
        ok: false,
        error: "encryption_required",
        hint: "بدنه باید با MAINTENANCE_ENC_KEY رمز شود — scripts/maintenance.sh خودکار این کار را می‌کند",
      },
      { status: 426, headers: { "Cache-Control": "no-store" } }
    );
  }

  const action = typeof inner?.action === "string" ? inner.action : "";

  // پاسخ‌دهنده — اگر درخواست رمز شده بود، پاسخ هم با همان کلید رمز می‌شود
  const respond = (
    payload: Record<string, unknown>,
    status = 200
  ): NextResponse => {
    const headers = { "Cache-Control": "no-store" };
    if (!encrypted || !encKeyHex) {
      return NextResponse.json(payload, { status, headers });
    }
    return NextResponse.json(
      { enc: "v1", data: encryptEnvelope(JSON.stringify(payload), encKeyHex) },
      { status, headers }
    );
  };

  // -----------------------------------------------------------------------
  // v1.0 rev5 — AI-bind mode: اگر MAINTENANCE_AI_BIND=1 ست شده باشد، حتی
  // actionهای خواندن (status و غیره) هم نیاز به توکن ویرایش دارند. یعنی فقط
  // کسی که MAINTENANCE_EDIT_TOKEN را دارد اصلاً می‌تواند چیزی ببیند.
  // این چک قبل از اجرای action انجام می‌شود تا حتی leak اطلاعات هم نباشد.
  // -----------------------------------------------------------------------
  const requiresEditToken = EDIT_ACTIONS.has(action) || isAiBindEnabled();
  if (requiresEditToken) {
    const editToken = getEditToken();
    if (!editToken) {
      await db.securityLog
        .create({
          data: {
            type: "maintenance_edit_rejected",
            ip,
            detail: `edit token not configured — action=${action.slice(0, 40)}${isAiBindEnabled() ? " (ai-bind)" : ""}`,
          },
        })
        .catch(() => {});
      return respond(
        {
          ok: false,
          error: "edit_channel_disabled",
          hint: "MAINTENANCE_EDIT_TOKEN >= 48 chars در .env لازم است",
        },
        503
      );
    }
    const providedEdit = request.headers.get("x-maintenance-edit-token");
    if (!tokenValid(providedEdit, editToken)) {
      await db.securityLog
        .create({
          data: {
            type: "maintenance_edit_auth_failed",
            ip,
            detail: `invalid edit token — action=${action.slice(0, 40)}${isAiBindEnabled() ? " (ai-bind)" : ""}`,
          },
        })
        .catch(() => {});
      await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
      return respond({ ok: false, error: "edit_token_required" }, 403);
    }
  }

  // -----------------------------------------------------------------------
  // اجرای action — توکن ویرایش (در صورت نیاز) در بالا چک شد.
  // -----------------------------------------------------------------------
  if (EDIT_ACTIONS.has(action)) {
    try {
      const data = await runEditAction(action, inner);
      if (data === null) {
        await db.securityLog
          .create({
            data: { type: "maintenance_edit_rejected", ip, detail: `unknown edit action: ${action.slice(0, 60)}` },
          })
          .catch(() => {});
        return respond(
          { ok: false, error: "unknown_action", hint: "action=help-edit برای دیدن لیست" },
          400
        );
      }
      // ردپای کامل هر ویرایش — با جزئیات target (بدون مقدار)
      const targetHint =
        typeof inner?.key === "string" ? ` key=${(inner.key as string).slice(0, 60)}` :
        typeof inner?.id === "string" ? ` id=${(inner.id as string).slice(0, 40)}` : "";
      await db.securityLog
        .create({
          data: { type: "maintenance_edit", ip, detail: `action=${action}${targetHint}` },
        })
        .catch(() => {});
      return respond(
        { ok: true, action, data, ...(data.error ? { error: data.error } : {}) }
      );
    } catch (err) {
      console.error("[/api/maintenance edit] error:", err);
      return respond({ ok: false, error: "server_error" }, 500);
    }
  }

  try {
    const data = await runAction(action);
    if (data === null) {
      await db.securityLog
        .create({
          data: { type: "maintenance_action_rejected", ip, detail: `unknown action: ${action.slice(0, 60)}` },
        })
        .catch(() => {});
      return respond(
        { ok: false, error: "unknown_action", hint: "action=help برای دیدن لیست" },
        400
      );
    }
    await db.securityLog
      .create({
        data: { type: "maintenance_action", ip, detail: `action=${action}` },
      })
      .catch(() => {});
    return respond({ ok: true, action, data });
  } catch (err) {
    console.error("[/api/maintenance] error:", err);
    return respond({ ok: false, error: "server_error" }, 500);
  }
}

// GET هم پاسخ می‌دهد ولی فقط راهنما — بدون هیچ داده‌ای (حتی با توکن معتبر)
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "maintenance",
    enc: "اگر MAINTENANCE_ENC_KEY ست شده باشد، بدنه باید پاکت AES-256-GCM باشد (scripts/maintenance.sh خودکار رمز می‌کند) و پاسخ هم رمز شده برمی‌گردد",
    usage: "POST { action: 'status'|'db-stats'|'security-logs'|'messages'|'chats'|'backup'|'help'|'help-edit'|'texts.get'|'texts.set'|'settings.get'|'settings.set'|'nav.get'|'nav.add'|'clips.get'|'clip.add'|'clip.update'|'clip.set-visible'|'clip.delete'|'equipment.get'|'equipment.set'|'content.get'|'content.set-visible'|'export-all'|... } با هدر X-Maintenance-Token — actionهای ویرایشی هدر دوم X-Maintenance-Edit-Token هم لازم دارند",
  }, { headers: { "Cache-Control": "no-store" } });
}
