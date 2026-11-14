// ============================================================================
// /api/user/logout — خروج کاربر (پاک کردن cookie)
// v1.1.1 (audit S1-M1): علاوه بر پاک‌کردن cookie، sessionsValidAfter کاربر bump
// می‌شود تا توکن‌های صادرشده قبل از logout (مثلاً توکن مسروقه) بلافاصله باطل شوند.
// sessionsValidAfter در checkAdminAuth و checkAccess در هر درخواست چک می‌شود.
//
// v1.0 (audit W1-5 #2 — MEDIUM): قبلاً هر توکنی با امضای معتبر (حتی توکن قدیمیِ
// قبل از logout قبلی یا قبل از تغییر رمز) می‌توانست sessionsValidAfter را bump کند:
//   - DoS forced-logout: دارنده‌ی توکن کهنه، session فعلیِ قربانی را مدام می‌بُرد
//   - flooding: هر درخواست یک ردیف AccessLog می‌ساخت (بدون rate limit)
// حالا فقط session ای که «الان معتبر» است (pwTag با hash فعلی می‌خواند + بعد از
// sessionsValidAfter صادر شده) اجازه‌ی bump دارد.
// ============================================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIpSafe } from "@/lib/ip";
import { logAccess, getSessionFromRequest, pwTagOf, SESSION_DURATION_MS } from "@/lib/access-auth";

// v1.0 (audit W1-5 #2): مقایسه‌ی timing-safe دو pwTag — همان قرارداد checkAdminAuth
import { timingSafeEqual } from "crypto";

function pwTagMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    // V17.5: logout رو در AccessLog ثبت کن
    try {
      const session = getSessionFromRequest(req);
      if (session?.userId) {
        const user = await db.accessUser.findUnique({ where: { id: session.userId } });
        // v1.0 (audit W1-5 #2): bump فقط برای session واقعاً معتبر —
        // pwTag باید با hash فعلی بخواند (توکنِ قبل از تغییر رمز رد می‌شود) و
        // زمان صدور باید بعد از sessionsValidAfter باشد (توکنِ قبل از logout قبلی رد می‌شود)
        const issuedAt = session.expiresAt - SESSION_DURATION_MS;
        const currentlyValid =
          user &&
          user.active &&
          pwTagMatches(pwTagOf(user.passwordHash), session.pwTag) &&
          (!user.sessionsValidAfter || issuedAt >= user.sessionsValidAfter.getTime());

        if (currentlyValid && user) {
          // V18.2: use shared IP helper
          const ip = getClientIpSafe(req);
          const ipStr = ip === "unknown" ? null : ip;
          await logAccess(session.userId, "logout", ipStr, req.headers.get("user-agent"));
          // v1.1.1 (audit S1-M1): باطل کردن همه‌ی توکن‌های صادرشده قبل از الان
          await db.accessUser.update({
            where: { id: user.id },
            data: { sessionsValidAfter: new Date() },
          });
        }
        // توکن نامعتبر: هیچ bump و هیچ AccessLog — فقط cookie پاک می‌شود (بی‌سرعت‌سنجی؛
        // middleware هم روی mutation ها rate limit دارد، پس flooding هم محدود است)
      }
    } catch {}
    const response = NextResponse.json({ ok: true });
    response.cookies.delete("access_session");
    return response;
  } catch (err) {
    console.error("[/api/user/logout] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
