// ============================================================================
// access-auth.ts — سیستم احراز هویت کاربران با دسترسی مبتنی بر زمان
// ============================================================================
// این ماژول توابع لازم برای مدیریت کاربران AccessUser رو فراهم می‌کنه:
// - هش کردن و بررسی رمز عبور با bcrypt
// - ساخت/بررسی session token (JWT-like با HMAC)
// - بررسی دسترسی بر اساس ساعت/روز/تاریخ انقضا
//
// نکات امنیتی:
// - رمز عبور هرگز به‌صورت plain text ذخیره نمی‌شه (bcrypt با salt rounds = 12)
// - session token شامل userId + expiry + HMAC signature هست
// - در هر درخواست، علاوه بر session، زمان دسترسی هم چک می‌شه
// ============================================================================

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";

// SESSION_SECRET — به‌صورت lazy بارگذاری می‌شه تا build fail نشه (در زمان build env موجود نیست)
let _SECRET: string | null = null;
function getSecret(): string {
  if (_SECRET) return _SECRET;
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET env var is required (use: openssl rand -hex 32)");
  }
  // جلوگیری از placeholder ضعیف
  const KNOWN_BAD_SECRETS = new Set([
    "build-placeholder",
    "change-me",
    "secret",
    "your-secret-here",
    "changeme",
    "",
  ]);
  if (KNOWN_BAD_SECRETS.has(s) || s.length < 32) {
    throw new Error(
      "SESSION_SECRET is too weak or placeholder. Generate a strong one with: openssl rand -hex 32"
    );
  }
  _SECRET = s;
  return _SECRET;
}
const SESSION_DURATION_HOURS = 24;
// v1.0 (audit W1-5 #9): ثابت واحد مدت session — قبلاً در ۴ جا تکرار شده بود و
// اگر یکی عوض می‌شد، محاسبه‌ی session revocation (expiresAt - SESSION_MS) خاموش می‌شد
export const SESSION_DURATION_MS = SESSION_DURATION_HOURS * 60 * 60 * 1000;

// ----------------------------------------------------------------------------
// hashPassword — هش کردن رمز عبور با bcrypt
// ----------------------------------------------------------------------------
// saltRounds = 12 یعنی 2^12 = 4096 دور hashing — v1.1.2 (audit SEC-02): از 10 به 12
// ارتقا یافت (سرعت خوب + امنیت بهتر در برابر brute-force)
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// ----------------------------------------------------------------------------
// verifyPassword — بررسی رمز عبور در برابر هش
// ----------------------------------------------------------------------------
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ----------------------------------------------------------------------------
// createSessionToken — ساخت session token امضا شده
// ----------------------------------------------------------------------------
// فرمت (v1.1): base64(userId.expiresAt.pwTag.HMAC(userId.expiresAt.pwTag))
// pwTag = ۱۰ کاراکتر اول sha256(passwordHash) — sessionها به رمز عبور گره
// خورده‌اند: با تغییر رمز / ریست، همه‌ی توکن‌های قدیمی بلافاصله بی‌اعتبار می‌شن
// (session revocation بدون نیاز به فیلد اضافه در دیتابیس).
export function pwTagOf(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 10);
}

export function createSessionToken(userId: string, passwordHash: string): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = `${userId}.${expiresAt}.${pwTagOf(passwordHash)}`;
  const sig = hmac(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64");
}

// ----------------------------------------------------------------------------
// verifySessionToken — بررسی و parse کردن session token
// ----------------------------------------------------------------------------
// برمی‌گردونه: { userId, expiresAt, pwTag } اگه امضا و ساختار معتبر باشه.
// توجه: pwTag اینجا فقط از توکن استخراج می‌شه؛ مقایسه با passwordHash فعلی
// کاربر (جلوگیری از توکنِ قدیمی بعد از تغییر رمز) در checkAdminAuth انجام می‌شه.
function verifySessionToken(token: string): { userId: string; expiresAt: number; pwTag: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 4) return null; // v1.1: userId.expiresAt.pwTag.sig
    const [userId, expiresAtStr, pwTag, sig] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null; // منقضی شده
    if (!/^[0-9a-f]{10}$/.test(pwTag)) return null;
    // بررسی امضا با timingSafeEqual (جلوگیری از timing attack)
    const expectedSig = hmac(`${userId}.${expiresAt}.${pwTag}`);
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    return { userId, expiresAt, pwTag };
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------------
// checkAccess — بررسی دسترسی کاربر بر اساس ساعت/روز/انقضا
// ----------------------------------------------------------------------------
// این تابع در هر درخواست به مسیرهای محافظت‌شده صدا زده می‌شه.
// برمی‌گردونه: { allowed: boolean, reason: string }
//
// منطق:
// 1. کاربر باید active باشه
// 2. اگه expiresAt تعریف شده و گذشته → رد
// 3. اگه allowedDays تعریف شده و امروز جزء روزهای مجاز نیست → رد
// 4. اگه allowedHourStart/End تعریف شده و ساعت فعلی در بازه نیست → رد
//
// نکته: ساعت و روز بر اساس UTC بررسی می‌شه تا با سرور همخوان باشه.
export async function checkAccess(userId: string, tokenExpiresAt?: number): Promise<{ allowed: boolean; reason: string }> {
  const user = await db.accessUser.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, reason: "user_not_found" };
  if (!user.active) return { allowed: false, reason: "access_denied_inactive" };

  // v1.1.1 (audit S1-M1): توکن‌های صادرشده قبل از logout — رد (session revocation)
  if (tokenExpiresAt && user.sessionsValidAfter) {
    if (tokenExpiresAt - SESSION_DURATION_MS < user.sessionsValidAfter.getTime()) {
      return { allowed: false, reason: "session_revoked" };
    }
  }

  const now = new Date();
  // بررسی انقضا
  if (user.expiresAt && now > user.expiresAt) {
    return { allowed: false, reason: "access_denied_expired" };
  }

  // بررسی روز هفته (0=یکشنبه در JS Date)
  if (user.allowedDays) {
    const todayDay = now.getUTCDay(); // 0=یکشنبه، 1=دوشنبه، ...، 6=شنبه
    const allowedDays = user.allowedDays.split(",").map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
    if (allowedDays.length > 0 && !allowedDays.includes(todayDay)) {
      return { allowed: false, reason: "access_denied_off_day" };
    }
  }

  // بررسی ساعت
  if (user.allowedHourStart !== null && user.allowedHourEnd !== null && user.allowedHourStart !== undefined && user.allowedHourEnd !== undefined) {
    const currentHour = now.getUTCHours();
    const start = user.allowedHourStart;
    const end = user.allowedHourEnd;
    // اگه start < end (مثلاً 9 تا 17): ساعت فعلی باید بینشون باشه
    if (start <= end) {
      if (currentHour < start || currentHour >= end) {
        return { allowed: false, reason: "access_denied_off_hours" };
      }
    } else {
      // اگه start > end (مثلاً 22 تا 6 — یعنی شب‌بیداری): ساعت فعلی باید >= start یا < end باشه
      if (currentHour < start && currentHour >= end) {
        return { allowed: false, reason: "access_denied_off_hours" };
      }
    }
  }

  return { allowed: true, reason: "ok" };
}

// ----------------------------------------------------------------------------
// logAccess — ثبت رویداد در لاگ دسترسی برای حسابرسی
// ----------------------------------------------------------------------------
export async function logAccess(
  userId: string,
  action: string,
  ip: string | null,
  userAgent: string | null,
  details: string = ""
): Promise<void> {
  try {
    await db.accessLog.create({
      data: { userId, action, ip, userAgent, details },
    });
  } catch (e) {
    // لاگ کردن نباید باعث خرابی درخواست بشه — فقط console
    console.error("Failed to log access:", e);
  }
}

// ----------------------------------------------------------------------------
// getClientIp — استخراج IP کاربر از headers
// V18.2: use shared IP helper (prefer x-real-ip, then last XFF entry)
// ----------------------------------------------------------------------------
import { getClientIpSafe } from "./ip";

export function getClientIp(request: Request): string | null {
  const ip = getClientIpSafe(request);
  return ip === "unknown" ? null : ip;
}

// ----------------------------------------------------------------------------
// getSessionFromRequest — استخراج session token از cookie
// ----------------------------------------------------------------------------
export function getSessionFromRequest(request: Request): { userId: string; expiresAt: number; pwTag: string } | null {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  let token = cookies["access_session"];
  if (!token) return null;
  // decode URL-encoded value (browser may have encoded the base64)
  try {
    token = decodeURIComponent(token);
  } catch {}
  return verifySessionToken(token);
}

// ----------------------------------------------------------------------------
// hmac — ساخت HMAC امضا با SHA-256
// ----------------------------------------------------------------------------
function hmac(message: string): string {
  return crypto.createHmac("sha256", getSecret()).update(message).digest("hex");
}
