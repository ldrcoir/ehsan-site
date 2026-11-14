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
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSessionFromRequest, checkAccess, logAccess, getClientIp, pwTagOf } from "@/lib/access-auth";

// v1.0 (audit W1-5 #2): throttle لاگ انکارهای verify — هر بارِ polling یک ردیف
// AccessLog می‌نوشت و لاگ حسابرسی غرق access_denied تکراری می‌شد (SQLite هم رشد
// بی‌رویه می‌کرد). حالا برای هر (userId+reason) حداکثر یک لاگ در ۵ دقیقه.
const DENIAL_LOG_THROTTLE_MS = 5 * 60 * 1000;
const denialLogMap = new Map<string, number>();
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, t] of denialLogMap) {
      if (now - t > DENIAL_LOG_THROTTLE_MS) denialLogMap.delete(k);
    }
  }, 10 * 60 * 1000).unref?.();
}

function shouldLogDenial(userId: string, reason: string): boolean {
  const key = `${userId}:${reason}`;
  const now = Date.now();
  const last = denialLogMap.get(key);
  if (last && now - last < DENIAL_LOG_THROTTLE_MS) return false;
  denialLogMap.set(key, now);
  return true;
}

// v1.0 (audit W1-5 #5): مقایسه‌ی timing-safe pwTag — هم‌مثل استاندارد بقیه‌ی کد
function pwTagMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

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
    if (!pwTagMatches(pwTagOf(user.passwordHash), session.pwTag)) {
      return NextResponse.json({ ok: false, error: "session_stale" });
    }

    // v1.1.1 (audit S1-M1): session revocation + schedule با token expiry چک می‌شود
    const access = await checkAccess(user.id, session.expiresAt);
    if (!access.allowed) {
      // لاگ دسترسی رد شده — v1.1.1: رویداد session_revoked لاگ نمی‌شود (جلوگیری از
      // پر شدن AccessLog با polling بعد از logout)
      // v1.0 (audit W1-5 #2): throttle ۵ دقیقه‌ای per user+reason
      if (access.reason !== "session_revoked" && shouldLogDenial(user.id, access.reason)) {
        await logAccess(user.id, access.reason, getClientIp(request), request.headers.get("user-agent"));
      }
      // v1.1.2 (audit SEC-02): انکارهای قطعی (revoke/inactive/expired/off_day) →
      // ok:false تا dashboard کاربر را به login برگرداند؛ قبلاً ok:true با آبجکت
      // کامل کاربر برمی‌گشت در حالی که همه‌ی APIهای بعدی 401 می‌دادند.
      // off_hours باقی می‌ماند (کاربر بعداً در بازه‌ی مجاز برمی‌گردد).
      if (access.reason !== "access_denied_off_hours") {
        return NextResponse.json({ ok: false, error: access.reason });
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
