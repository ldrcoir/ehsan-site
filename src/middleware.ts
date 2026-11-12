// ============================================================================
// middleware.ts — محافظت server-side از مسیرهای ادمین + امنیت جهانی
// ============================================================================
// این middleware:
// 1. قبل از رسیدن به صفحه، session cookie را با HMAC واقعی بررسی می‌کند (V18.3)
// 2. دسترسی غیرمجاز به /user-dashboard را به /user-login هدایت می‌کند
// 3. دسترسی غیرمجاز به /api/admin/* را با 401 رد می‌کند
// 4. CSRF protection برای POST/PUT/DELETE با بررسی Origin
// 5. Rate limiting برای login/contact/chat/track (V18.3: per-path window)
// 6. Security headers + Cache-Control: no-store برای مسیرهای حساس (V18.3)
// 7. Body limit 1MB + جلوگیری از bypass با chunked encoding (V18.3)
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientIpSafe } from "@/lib/ip";

// مسیرهای ادمین که نیاز به session دارند
const ADMIN_PANEL_PATHS = ["/user-dashboard"];
const ADMIN_API_PREFIX = "/api/admin/";

// مسیرهای امنیتی برای rate limit
// V18.3: per-path config — /api/track: 30 درخواست در 60 ثانیه، بقیه مثل قبل
const RATE_LIMIT_PATHS: Record<string, { max: number; windowMs: number }> = {
  "/api/user/login": { max: 5, windowMs: 15 * 60 * 1000 },
  "/api/contact": { max: 8, windowMs: 15 * 60 * 1000 },
  "/api/chat": { max: 8, windowMs: 15 * 60 * 1000 },
  "/api/track": { max: 30, windowMs: 60 * 1000 },
};

// مسیرهای عمومی که نباید session چک شوند
// v1.1 (security pass 2): /api/user/login، /api/contact، /api/chat و /api/track
// از لیست معافیت CSRF حذف شدن — همه‌شون POST هم‌مبدأ می‌فرستن (Origin داره)،
// پس Origin check حالا روشون اعمال می‌شه (بستن login CSRF + cross-site spam).
// فقط webhookها معاف می‌مونن (auth خودشون با X-Webhook-Secret + timingSafeEqual).
const PUBLIC_API_PREFIXES = [
  "/api/content",
  "/api/clips",
  "/api/user/verify",
  // V18.0: /api/user/logout از PUBLIC_API_PREFIXES حذف شد (CSRF protection)
  "/api/bale/webhook",
  "/api/telegram/webhook",
];

// ---------------------------------------------------------------------------
// In-memory rate limiter — مقاوم در برابر restart نه، اما برای single-instance OK
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    // v1.1 (security): سقف سخت روی تعداد کلیدها — جلوگیری از memory-DoS با
    // چرخش IP/مسیر بین دو پاکسازی دوره‌ای
    if (!entry && rateLimitMap.size >= 10000) {
      // قدیمی‌ترین کلیدهای منقضی را حذف کن؛ اگر باز هم پر بود، قدیمی‌ترین را حذف کن
      let evicted = false;
      for (const [k, v] of rateLimitMap) {
        if (v.resetAt < now) {
          rateLimitMap.delete(k);
          evicted = true;
          if (rateLimitMap.size < 10000) break;
        }
      }
      if (!evicted && rateLimitMap.size >= 10000) {
        const firstKey = rateLimitMap.keys().next().value;
        if (firstKey !== undefined) rateLimitMap.delete(firstKey);
      }
    }
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// پاکسازی دوره‌ای برای جلوگیری از نشت حافظه
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of rateLimitMap) {
      if (v.resetAt < now) rateLimitMap.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

// ---------------------------------------------------------------------------
// بررسی session cookie — V18.3 (security): REAL HMAC verification با Web Crypto
// ---------------------------------------------------------------------------
// token format (باید دقیقاً mirror بشه با src/lib/access-auth.ts):
//   base64( userId + "." + expiresAt + "." + hex(HMAC-SHA256(userId + "." + expiresAt)) )
// قبلاً فقط ساختار چک می‌شد → هر کسی می‌تونست با ساخت token fake از middleware
// رد بشه (API route اصلی بعدش ردش می‌کرد، ولی صفحه dashboard باز می‌شد).
// حالا امضا واقعاً verify می‌شه — بدون SESSION_SECRET یا با خطا → session نامعتبر.
const sessionEncoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  // Note: must be backed by a real ArrayBuffer (not ArrayBufferLike) to satisfy
  // crypto.subtle.verify's BufferSource parameter on TS >= 5.7
  const bytes = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function hasValidSession(cookieHeader: string): Promise<boolean> {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const token = cookies["access_session"];
  if (!token) return false;
  // V18.3: بدون secret هیچ توکنی قابل verify نیست → fail-closed
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    // Edge runtime: Buffer ممکنه موجود نباشه → atob() برای base64 decode
    let tokenValue = token;
    try {
      tokenValue = decodeURIComponent(token);
    } catch {
      // مقدار raw نگه داشته می‌شه (decodeURIComponent روی ورودی خراب throw می‌کنه)
    }
    const decoded = atob(tokenValue);
    const parts = decoded.split(".");
    // v1.1: فرمت ۴ بخشی — userId.expiresAt.pwTag.sig (pwTag session را به رمز عبور گره می‌زند)
    if (parts.length !== 4) return false;
    const [userId, expiresAtStr, pwTag, sig] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
    if (userId.length === 0) return false;
    if (!/^[0-9a-f]{10}$/.test(pwTag)) return false;
    // امضا hex از HMAC-SHA256 هست → دقیقاً 64 کاراکتر hex
    if (!/^[0-9a-f]{64}$/.test(sig)) return false;
    // HMAC-SHA256(userId + "." + expiresAt + "." + pwTag) — همان ورودی امضای access-auth.ts
    const key = await crypto.subtle.importKey(
      "raw",
      sessionEncoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      hexToBytes(sig),
      sessionEncoder.encode(`${userId}.${expiresAt}.${pwTag}`)
    );
    return valid;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Security headers اضافه می‌کنیم به همه پاسخ‌ها
// ---------------------------------------------------------------------------
// V18.3: مسیرهای حساس — پاسخ‌ها هرگز cache نشن (جلوگیری از leak با back button
// یا shared cache / proxy)
function isSensitivePath(pathname: string): boolean {
  return (
    pathname.startsWith(ADMIN_API_PREFIX) ||
    pathname === "/api/messages" ||
    ADMIN_PANEL_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))
  );
}

function addSecurityHeaders(res: NextResponse, pathname?: string): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("X-XSS-Protection", "0"); // مرورگرهای مدرن از CSP استفاده می‌کنن
  res.headers.set("X-Powered-By", ""); // مخفی کردن Next.js
  // V18.3 (security): no-store برای مسیرهای حساس
  if (pathname && isSensitivePath(pathname)) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}

// ---------------------------------------------------------------------------
// CSP — Content Security Policy
// ---------------------------------------------------------------------------
const CSP = [
  "default-src 'self'",
  // script-src — اجازه اسکریپت‌های inline برای Next.js + reCAPTCHA
  // v1.1 (security): 'unsafe-eval' فقط در dev لازم است — در production حذف شد
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"} https://www.google.com https://www.gstatic.com`,
  // style-src — اجازه استایل‌های inline + فونت‌های گوگل
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // font-src — فونت‌های گوگل و لوکال
  "font-src 'self' data: https://fonts.gstatic.com",
  // img-src — تصاویر عمومی + data URLs
  "img-src 'self' data: blob: https:",
  // frame-src — reCAPTCHA + آپارات + یوتیوب + vimeo
  "frame-src 'self' https://www.google.com https://www.gstatic.com https://www.aparat.com https://aparat.com https://www.youtube.com https://youtube.com https://youtu.be https://player.vimeo.com",
  // connect-src — API های خودمون + reCAPTCHA + LLM providers
  "connect-src 'self' https://www.google.com https://www.gstatic.com",
  // object-src — هیچ پلاگینی
  "object-src 'none'",
  // base-uri — جلوگیری از hijack
  "base-uri 'self'",
  // form-action — فقط به خودمون + formsubmit.co
  "form-action 'self' https://formsubmit.co",
  // frame-ancestors — جلوگیری از clickjacking
  "frame-ancestors 'none'",
].join("; ");

// ===========================================================================
// MAIN MIDDLEWARE
// ===========================================================================
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const cookieHeader = req.headers.get("cookie") || "";

  // --- 1. Rate limit برای login/contact/chat/track ---
  const rateLimit = RATE_LIMIT_PATHS[pathname];
  if (rateLimit) {
    // V18.2: use shared IP helper (prefer x-real-ip, then last XFF entry)
    const ip = getClientIpSafe(req);
    if (!checkRateLimit(`${pathname}:${ip}`, rateLimit.max, rateLimit.windowMs)) {
      const res = NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.windowMs / 1000)) } }
      );
      return addSecurityHeaders(res, pathname);
    }
  }

  // --- 2. CSRF protection برای POST/PUT/DELETE به مسیرهای non-public ---
  const isPublicApi = PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
  // V17.8: PATCH هم اضافه شد (قبلاً missing بود)
  if ((method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") && !isPublicApi) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    // Origin باید مطابق host باشه (همان-origin)
    if (!origin || !host) {
      const res = NextResponse.json({ ok: false, error: "missing_origin" }, { status: 403 });
      return addSecurityHeaders(res, pathname);
    }
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        const res = NextResponse.json({ ok: false, error: "origin_mismatch" }, { status: 403 });
        return addSecurityHeaders(res, pathname);
      }
    } catch {
      const res = NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
      return addSecurityHeaders(res, pathname);
    }
  }

  // --- 3. محافظت از /user-dashboard — نیاز به session ---
  if (ADMIN_PANEL_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    if (!(await hasValidSession(cookieHeader))) {
      const loginUrl = new URL("/user-login", req.url);
      // V17.9: security headers روی redirect هم اعمال بشن
      const redirectRes = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(redirectRes, pathname);
    }
  }

  // --- 4. محافظت از /api/admin/* و /api/messages — نیاز به session ---
  if (pathname.startsWith(ADMIN_API_PREFIX) || pathname === "/api/messages") {
    if (!(await hasValidSession(cookieHeader))) {
      const res = NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      return addSecurityHeaders(res, pathname);
    }
  }

  // --- 5. محدودیت حجم body برای جلوگیری از DoS ---
  // V17.8: DELETE هم اضافه شد (قبلاً missing بود)
  if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
    const contentLengthHeader = req.headers.get("content-length");
    const contentLength = parseInt(contentLengthHeader || "0", 10);
    if (contentLength > 1024 * 1024) { // 1MB limit
      const res = NextResponse.json(
        { ok: false, error: "payload_too_large" },
        { status: 413 }
      );
      return addSecurityHeaders(res, pathname);
    }
    // V18.3 (security): chunked-encoding bypass — درخواست با transfer-encoding
    // و بدون content-length از چک بالا رد می‌شه (chunked → content-length ست نیست)
    if (req.headers.get("transfer-encoding") && !contentLengthHeader) {
      const res = NextResponse.json(
        { ok: false, error: "payload_too_large" },
        { status: 413 }
      );
      return addSecurityHeaders(res, pathname);
    }
  }

  // --- 6. ادامه با security headers ---
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  // HSTS — فقط روی HTTPS (روی HTTP ست نکن — اگه سایت پشت CDN بدون HTTPS باشه مشکل ایجاد می‌کنه)
  // V17.8: HSTS — روی HTTPS واقعی یا پشت TLS-terminating proxy (x-forwarded-proto)
  const isHttps = req.url.startsWith("https://") || req.headers.get("x-forwarded-proto") === "https";
  if (isHttps) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return addSecurityHeaders(res, pathname);
}

// ===========================================================================
// matcher — روی کدام مسیرها اجرا شود
// ===========================================================================
export const config = {
  matcher: [
    /*
     * همه مسیرها به جز:
     * - فایل‌های استاتیک (_next/static, _next/image, favicon.ico)
     * - فایل‌های عمومی (png, jpg, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};
