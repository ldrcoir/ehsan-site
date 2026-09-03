// ============================================================================
// access-auth.ts — سیستم احراز هویت کاربران با دسترسی مبتنی بر زمان
// ============================================================================
// این ماژول توابع لازم برای مدیریت کاربران AccessUser رو فراهم می‌کنه:
// - هش کردن و بررسی رمز عبور با bcrypt
// - ساخت/بررسی session token (JWT-like با HMAC)
// - بررسی دسترسی بر اساس ساعت/روز/تاریخ انقضا
//
// نکات امنیتی:
// - رمز عبور هرگز به‌صورت plain text ذخیره نمی‌شه (bcrypt با salt rounds = 10)
// - session token شامل userId + expiry + HMAC signature هست
// - در هر درخواست، علاوه بر session، زمان دسترسی هم چک می‌شه
// ============================================================================

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "./db";

const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-in-production-please";
const SESSION_DURATION_HOURS = 24; // مدت اعتبار session به ساعت

// ----------------------------------------------------------------------------
// hashPassword — هش کردن رمز عبور با bcrypt
// ----------------------------------------------------------------------------
// saltRounds = 10 یعنی 2^10 = 1024 دور hashing — سرعت خوب + امنیت کافی
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
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
// فرمت: base64(userId).base64(expiresAt).base64(HMAC(userId + expiresAt))
// این توکن در cookie ذخیره می‌شه و در هر درخواست بررسی می‌شه.
export function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
  const payload = `${userId}.${expiresAt}`;
  const sig = hmac(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64");
}

// ----------------------------------------------------------------------------
// verifySessionToken — بررسی و parse کردن session token
// ----------------------------------------------------------------------------
// برمی‌گردونه: { userId, expiresAt } اگه معتبر باشه، در غیر این صورت null
export function verifySessionToken(token: string): { userId: string; expiresAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, sig] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) return null;
    if (Date.now() > expiresAt) return null; // منقضی شده
    // بررسی امضا
    const expectedSig = hmac(`${userId}.${expiresAt}`);
    if (sig !== expectedSig) return null; // امضا نامعتبر
    return { userId, expiresAt };
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
export async function checkAccess(userId: string): Promise<{ allowed: boolean; reason: string }> {
  const user = await db.accessUser.findUnique({ where: { id: userId } });
  if (!user) return { allowed: false, reason: "user_not_found" };
  if (!user.active) return { allowed: false, reason: "access_denied_inactive" };

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
// ----------------------------------------------------------------------------
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

// ----------------------------------------------------------------------------
// getSessionFromRequest — استخراج session token از cookie
// ----------------------------------------------------------------------------
export function getSessionFromRequest(request: Request): { userId: string; expiresAt: number } | null {
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
  return crypto.createHmac("sha256", SESSION_SECRET).update(message).digest("hex");
}
