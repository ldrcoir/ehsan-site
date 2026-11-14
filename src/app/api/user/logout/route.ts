// ============================================================================
// /api/user/logout — خروج کاربر (پاک کردن cookie)
// v1.1.1 (audit S1-M1): علاوه بر پاک‌کردن cookie، sessionsValidAfter کاربر bump
// می‌شود تا توکن‌های صادرشده قبل از logout (مثلاً توکن مسروقه) بلافاصله باطل شوند.
// sessionsValidAfter در checkAdminAuth و checkAccess در هر درخواست چک می‌شود.
// ============================================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIpSafe } from "@/lib/ip";
import { logAccess, getSessionFromRequest } from "@/lib/access-auth";

export async function POST(req: Request) {
  try {
    // V17.5: logout رو در AccessLog ثبت کن
    try {
      const session = getSessionFromRequest(req);
      if (session?.userId) {
        // V18.2: use shared IP helper
        const ip = getClientIpSafe(req);
        const ipStr = ip === "unknown" ? null : ip;
        await logAccess(session.userId, "logout", ipStr, req.headers.get("user-agent"));
        // v1.1.1 (audit S1-M1): باطل کردن همه‌ی توکن‌های صادرشده قبل از الان
        await db.accessUser.update({
          where: { id: session.userId },
          data: { sessionsValidAfter: new Date() },
        });
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
