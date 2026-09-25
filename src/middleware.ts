// ============================================================================
// middleware.ts — محافظت server-side از مسیرهای ادمین + امنیت جهانی
// ============================================================================
// این middleware:
// 1. قبل از رسیدن به صفحه، session cookie را بررسی می‌کند
// 2. دسترسی غیرمجاز به /user-dashboard را به /user-login هدایت می‌کند
// 3. دسترسی غیرمجاز به /api/admin/* را با 401 رد می‌کند
// 4. CSRF protection برای POST/PUT/DELETE با بررسی Origin
// 5. Rate limiting ساده برای login/contact/chat
// 6. Security headers اضافه می‌کند
// ============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// مسیرهای ادمین که نیاز به session دارند
const ADMIN_PANEL_PATHS = ["/user-dashboard"];
const ADMIN_API_PREFIX = "/api/admin/";

// مسیرهای امنیتی برای rate limit
const RATE_LIMIT_PATHS = ["/api/user/login", "/api/contact", "/api/chat"];

// مسیرهای عمومی که نباید session چک شوند
const PUBLIC_API_PREFIXES = [
  "/api/content",
  "/api/clips",
  "/api/track",
  "/api/user/login",
  "/api/user/verify",
  "/api/user/logout",
  "/api/contact",
  "/api/chat",
  "/api/bale/webhook",
  "/api/telegram/webhook",
  "/api/rss",
  "/api/sitemap",
];

// ---------------------------------------------------------------------------
// In-memory rate limiter — مقاوم در برابر restart نه، اما برای single-instance OK
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 دقیقه

function checkRateLimit(key: string, max: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
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
// بررسی session cookie (بدون import کردن lib — فقط درایور JWT-like)
// ---------------------------------------------------------------------------
function hasValidSession(cookieHeader: string): boolean {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map(c => {
      const [k, ...v] = c.trim().split("=");
      return [k, v.join("=")];
    })
  );
  const token = cookies["access_session"];
  if (!token) return false;
  try {
    const decoded = Buffer.from(decodeURIComponent(token), "base64").toString("utf8");
    const parts = decoded.split(".");
    if (parts.length !== 3) return false;
    const [userId, expiresAtStr] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return false;
    // در middleware نمی‌تونیم HMAC رو verify کنیم چون SESSION_SECRET بهش دسترسی نداریم
    // فقط ساختار رو چک می‌کنیم — API route اصلی خودش HMAC رو verify می‌کنه
    return userId.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Security headers اضافه می‌کنیم به همه پاسخ‌ها
// ---------------------------------------------------------------------------
function addSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("X-XSS-Protection", "0"); // مرورگرهای مدرن از CSP استفاده می‌کنن
  res.headers.set("X-Powered-By", ""); // مخفی کردن Next.js
  return res;
}

// ---------------------------------------------------------------------------
// CSP — Content Security Policy
// ---------------------------------------------------------------------------
const CSP = [
  "default-src 'self'",
  // script-src — اجازه اسکریپت‌های inline برای Next.js + reCAPTCHA
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
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
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;
  const cookieHeader = req.headers.get("cookie") || "";

  // --- 1. Rate limit برای login/contact/chat ---
  if (RATE_LIMIT_PATHS.includes(pathname)) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || "unknown";
    const max = pathname === "/api/user/login" ? 5 : 8; // login: 5، contact/chat: 8
    if (!checkRateLimit(`${pathname}:${ip}`, max)) {
      const res = NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429, headers: { "Retry-After": "900" } }
      );
      return addSecurityHeaders(res);
    }
  }

  // --- 2. CSRF protection برای POST/PUT/DELETE به مسیرهای non-public ---
  const isPublicApi = PUBLIC_API_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
  if ((method === "POST" || method === "PUT" || method === "DELETE") && !isPublicApi) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    // Origin باید مطابق host باشه (همان-origin)
    if (!origin || !host) {
      const res = NextResponse.json({ ok: false, error: "missing_origin" }, { status: 403 });
      return addSecurityHeaders(res);
    }
    try {
      const originUrl = new URL(origin);
      if (originUrl.host !== host) {
        const res = NextResponse.json({ ok: false, error: "origin_mismatch" }, { status: 403 });
        return addSecurityHeaders(res);
      }
    } catch {
      const res = NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
      return addSecurityHeaders(res);
    }
  }

  // --- 3. محافظت از /user-dashboard — نیاز به session ---
  if (ADMIN_PANEL_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"))) {
    if (!hasValidSession(cookieHeader)) {
      const loginUrl = new URL("/user-login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- 4. محافظت از /api/admin/* و /api/messages — نیاز به session ---
  if (pathname.startsWith(ADMIN_API_PREFIX) || pathname === "/api/messages") {
    if (!hasValidSession(cookieHeader)) {
      const res = NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
      return addSecurityHeaders(res);
    }
  }

  // --- 5. محدودیت حجم body برای جلوگیری از DoS ---
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > 1024 * 1024) { // 1MB limit
      const res = NextResponse.json(
        { ok: false, error: "payload_too_large" },
        { status: 413 }
      );
      return addSecurityHeaders(res);
    }
  }

  // --- 6. ادامه با security headers ---
  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", CSP);
  // HSTS — فقط روی HTTPS (روی HTTP ست نکن — اگه سایت پشت CDN بدون HTTPS باشه مشکل ایجاد می‌کنه)
  if (req.url.startsWith("https://")) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return addSecurityHeaders(res);
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
