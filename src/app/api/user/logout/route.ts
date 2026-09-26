// ============================================================================
// /api/user/logout — خروج کاربر (پاک کردن cookie)
// ============================================================================

import { NextResponse } from "next/server";
import { logAccess, getSessionFromRequest } from "@/lib/access-auth";

export async function POST(req: Request) {
  try {
    // V17.5: logout رو در AccessLog ثبت کن
    try {
      const session = getSessionFromRequest(req);
      if (session?.userId) {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
                   req.headers.get("x-real-ip") || null;
        await logAccess(session.userId, "logout", ip, req.headers.get("user-agent"));
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
