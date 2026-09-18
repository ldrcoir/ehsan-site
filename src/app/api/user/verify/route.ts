// ============================================================================
// /api/user/verify — بررسی وضعیت session فعلی
// ============================================================================
// GET: اگه session معتبر باشه و کاربر در بازه‌ی زمانی مجاز باشه:
//   response: { ok: true, user: {...}, access: { allowed: true } }
// اگه session نباشه یا نامعتبر باشه:
//   response: { ok: false }
// اگه session باشه ولی خارج از ساعت مجاز:
//   response: { ok: true, user: {...}, access: { allowed: false, reason: "..." } }
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest, checkAccess, logAccess, getClientIp } from "@/lib/access-auth";

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ ok: false });
  }

  const user = await db.accessUser.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ ok: false });
  }

  const access = await checkAccess(user.id);
  if (!access.allowed) {
    // لاگ دسترسی رد شده
    await logAccess(user.id, access.reason, getClientIp(request), request.headers.get("user-agent"));
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
        permissions: user.permissions,
      allowedHourStart: user.allowedHourStart,
      allowedHourEnd: user.allowedHourEnd,
      allowedDays: user.allowedDays,
      expiresAt: user.expiresAt,
      active: user.active,
      lastLoginAt: user.lastLoginAt,
    },
    access,
  });
}
