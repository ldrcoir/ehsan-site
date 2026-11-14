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
import { getSessionFromRequest, checkAccess, logAccess, getClientIp, pwTagOf } from "@/lib/access-auth";

export async function GET(request: NextRequest) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ ok: false });
    }

    const user = await db.accessUser.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ ok: false });
    }

    // v1.1 (security): توکن متعلق به رمز قبلی است (بعد از تغییر/ریست رمز) → باطل
    if (pwTagOf(user.passwordHash) !== session.pwTag) {
      return NextResponse.json({ ok: false, error: "session_stale" });
    }

    // v1.1.1 (audit S1-M1): session revocation + schedule با token expiry چک می‌شود
    const access = await checkAccess(user.id, session.expiresAt);
    if (!access.allowed) {
      // لاگ دسترسی رد شده — v1.1.1: رویداد session_revoked لاگ نمی‌شود (جلوگیری از
      // پر شدن AccessLog با polling بعد از logout)
      if (access.reason !== "session_revoked") {
        await logAccess(user.id, access.reason, getClientIp(request), request.headers.get("user-agent"));
      }
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
  } catch (err) {
    console.error("[/api/user/verify] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
