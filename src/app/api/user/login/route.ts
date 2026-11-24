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
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { verifyPassword, createSessionToken, logAccess, getClientIp, SESSION_DURATION_MS } from "@/lib/access-auth";
import { isIpBlocked, recordSuspiciousActivity } from "@/lib/security";

// V18.3 (security): هش bcrypt ثابت برای مقایسه‌ی زمان-برابر وقتی کاربر وجود نداره
// (anti user-enumeration — بدون این، مسیر «کاربر ناموجود» سریع‌تر جواب می‌داد)
// v1.0 (audit W1-5 #1): با ارتقای hashPassword به cost 12، این hash هنوز cost 10 بود
// و شکاف ~۴× زمانی مسیر «کاربر ناموجود»/«کاربر موجود» دوباره قابل اندازه‌گیری می‌شد.
// hash زیر با bcrypt.hashSync("dummy-anti-enumeration", 12) تولید شده (cost = 12 مثل واقعی).
const DUMMY_HASH =
  "$2b$12$yKKZ4gkQvNi0K4WasjGlWe/WcIuwfBP9./rDbNH3SrPL4mIni/ZRS";

// Rate limiting — ۵ تلاش در ۱۵ دقیقه (per-IP + v1.1: per-username)
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
// v1.1 (security): محدودیت per-username — جلوگیری از brute-force توزیع‌شده روی
// یک اکانت از IPهای مختلف (IP-rotation هم لیست per-IP را دور می‌زد)
const usernameAttempts = new Map<string, { count: number; resetAt: number }>();

// V17.4: پاکسازی دوره‌ای Map برای جلوگیری از memory leak
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of loginAttempts) {
      if (v.resetAt < now) loginAttempts.delete(k);
    }
    for (const [k, v] of usernameAttempts) {
      if (v.resetAt < now) usernameAttempts.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  max: number = RATE_LIMIT_MAX
): boolean {
  const now = Date.now();
  const record = map.get(key);
  if (!record || now > record.resetAt) {
    if (!record && map.size >= 10000) {
      // v1.0 (audit W1-5 #8): هم‌مثل middleware — منقضی‌ها + smallest-resetAt eviction
      let evicted = false;
      for (const [k, v] of map) {
        if (v.resetAt < now) { map.delete(k); evicted = true; if (map.size < 10000) break; }
      }
      if (!evicted && map.size >= 10000) {
        let victimKey: string | undefined;
        let victimReset = Infinity;
        for (const [k, v] of map) {
          if (v.resetAt < victimReset) { victimReset = v.resetAt; victimKey = k; }
        }
        if (victimKey !== undefined) map.delete(victimKey);
      }
    }
    map.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (record.count >= max) return false;
  record.count++;
  return true;
}

// v1.0 (audit W1-5 #4): لاگین موفق باید سهمیه‌ی per-username را نسوزاند —
// قبلاً ۵ لاگین موفق در ۱۵ دقیقه، اکانت را برای تلاش بعدی قفل می‌کرد (NAT/اسکریپت)
function resetRateLimit(map: Map<string, { count: number; resetAt: number }>, key: string): void {
  map.delete(key);
}

export async function POST(request: NextRequest) {
  // v1.0 (audit W1-5 #3): هشدار کانفیگ — وقتی TRUST_PROXY فعال نیست، همه‌ی IPها
  // «unknown» می‌شوند و rate limit عمومی و مسدودسازی خودکار عملاً کور می‌شوند
  if (process.env.NODE_ENV === "production" && process.env.TRUST_PROXY !== "true") {
    console.warn("[security] TRUST_PROXY != true — per-IP rate limiting and IP blocking are degraded (all clients share one 'unknown' bucket)");
  }
  try {
    // V18.3 (security): IP block check — قبل از هر کاری (حتی parse کردن body)
    const ip = getClientIp(request);
    if (ip && (await isIpBlocked(ip))) {
      return NextResponse.json({ ok: false, error: "ip_blocked" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const username: string = (body.username || "").trim().toLowerCase();
    const password: string = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    const userAgent = request.headers.get("user-agent");

    // Rate limit check — per-IP و per-username
    // v1.0 rev3 (audit SEC-a LOW): وقتی TRUST_PROXY خاموش است همه‌ی بازدیدکننده‌ها
    // در یک bucket «unknown» جمع می‌شوند — سقف این bucket خاص بالاتر می‌رود تا
    // قفل سراسری لاگین (DoS) ممکن نشود؛ محدودیت per-username (۵/۱۵د) سرِ جایش
    // است و brute-force روی اکانت همچنان بسته است.
    const rateLimitKey = ip || "unknown";
    const degradedProxy =
      process.env.NODE_ENV === "production" &&
      process.env.TRUST_PROXY !== "true" &&
      rateLimitKey === "unknown";
    if (
      !checkRateLimit(loginAttempts, rateLimitKey, degradedProxy ? 30 : RATE_LIMIT_MAX) ||
      !checkRateLimit(usernameAttempts, username)
    ) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429 }
      );
    }

    // پیدا کردن کاربر
    const user = await db.accessUser.findUnique({ where: { username } });

    // اگه کاربر وجود نداشت یا رمز اشتباه بود — پیام یکسان برای جلوگیری از user enumeration
    if (!user) {
      // V18.3 (security): مقایسه‌ی bcrypt با هش dummy تا هر دو مسیر (~همان زمان) طول بکشن
      await bcrypt.compare(password, DUMMY_HASH);
      // V18.3 (security): لاگ امنیتی + ثبت فعالیت مشکوک (fire-and-forget)
      // (AccessLog نمی‌شه نوشت چون userId FK violation می‌ده → SecurityLog بدون FK)
      db.securityLog
        .create({ data: { type: "failed_login", ip, detail: username } })
        .catch(() => {});
      if (ip) recordSuspiciousActivity(ip, "failed_login").catch(() => {});
      return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
    }

    const passwordOk = await verifyPassword(password, user.passwordHash);
    if (!passwordOk) {
      // v1.1 (timing parity): fire-and-forget — هم‌مسیرِ «کاربر ناموجود» تا زمان‌بندی
      // دو مسیر یکسان بماند و username enumeration از روی timing ممکن نباشد
      logAccess(user.id, "login_failed", ip, userAgent, `username=${username}`).catch(() => {});
      // V18.3 (security): لاگ امنیتی + ثبت فعالیت مشکوک (fire-and-forget)
      db.securityLog
        .create({ data: { type: "failed_login", ip, detail: username } })
        .catch(() => {});
      if (ip) recordSuspiciousActivity(ip, "failed_login").catch(() => {});
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
    // v1.0 (audit W1-5 #4): bucket per-username موفق → ریست (سهمیه برای تلاش‌های خراب می‌ماند)
    resetRateLimit(usernameAttempts, username);
    // v1.1: token به passwordHash گره خورده (pwTag) → تغییر رمز همه sessionهای قدیمی را می‌کشد
    const token = createSessionToken(user.id, user.passwordHash);
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
    // ست کردن cookie — httpOnly برای جلوگیری از XSS
    // v1.1.1 (audit S1-L3): secure بر اساس پروتکل واقعی درخواست (نه NODE_ENV) —
    // روی HTTPS همیشه Secure، روی HTTPِ اولیه (قبل از certbot) login کار می‌کند.
    // قبلاً به NODE_ENV گره خورده بود و استقرار بدون NODE_ENV=production کوکی را
    // بدون Secure می‌فرستاد حتی روی HTTPS.
    const requestIsHttps =
      new URL(request.url).protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set("access_session", token, {
      httpOnly: true,
      secure: requestIsHttps,
      sameSite: "strict",
      path: "/",
      // v1.0 (audit W1-5 #9): از ثابت واحد session — قبلاً مقدار خام 24h بود
      maxAge: SESSION_DURATION_MS / 1000,
    });
    return response;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
