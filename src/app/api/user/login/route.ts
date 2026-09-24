// ============================================================================
// /api/user/login — ورود کاربران AccessUser
// ============================================================================
// POST body: { username, password }
// اگه موفق باشه:
//   - session token در cookie ست می‌شه (httpOnly + secure + sameSite)
//   - loginCount و lastLoginAt آپدیت می‌شن
//   - رویداد login_success در AccessLog ثبت می‌شه
//   - response: { ok: true, user: { username, displayName, role } }
// اگه ناموفق باشه:
//   - رویداد login_failed ثبت می‌شه (با username برای حسابرسی)
//   - response: { ok: false, error: "invalid_credentials" }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, logAccess, getClientIp } from "@/lib/access-auth";

// Rate limiting — ۵ تلاش در ۱۵ دقیقه
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record || now > record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const username: string = (body.username || "").trim().toLowerCase();
    const password: string = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent");

    // Rate limit check
    const rateLimitKey = ip || "unknown"; if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429 }
      );
    }

    // پیدا کردن کاربر
    const user = await db.accessUser.findUnique({ where: { username } });

    // اگه کاربر وجود نداشت یا رمز اشتباه بود — پیام یکسان برای جلوگیری از user enumeration
    if (!user) {
      // skip log اگه کاربر وجود نداره (FK violation)
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      await logAccess(user.id, "login_failed", ip, userAgent, `username=${username}`);
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    // بررسی فعال بودن
    if (!user.active) {
      await logAccess(user.id, "access_denied_inactive", ip, userAgent, "login attempt on inactive account");
      return NextResponse.json({ ok: false, error: "account_inactive" }, { status: 403 });
    }

    // بررسی انقضا
    if (user.expiresAt && new Date() > user.expiresAt) {
      await logAccess(user.id, "access_denied_expired", ip, userAgent, "login attempt on expired account");
      return NextResponse.json({ ok: false, error: "account_expired" }, { status: 403 });
    }

    // ورود موفق — ساخت session و آپدیت آمار
    const token = createSessionToken(user.id);
    await db.accessUser.update({
      where: { id: user.id },
      data: {
        loginCount: { increment: 1 },
        lastLoginAt: new Date(),
      },
    });
    await logAccess(user.id, "login_success", ip, userAgent);

    const response = NextResponse.json({
      ok: true,
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    });
    // ست کردن cookie — httpOnly برای جلوگیری از XSS، secure در production
    response.cookies.set("access_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 ساعت
    });
    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
