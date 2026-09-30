// ============================================================================
// /api/user/logout — خروج کاربر (پاک کردن cookie)
// ============================================================================

import { NextResponse } from "next/server";
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
