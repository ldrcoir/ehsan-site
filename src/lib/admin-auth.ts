// ============================================================================
// admin-auth.ts — بررسی احراز هویت ادمین (فقط session cookie)
// ============================================================================
// V17.2: حذف password fallback — تمام admin routes فقط با session cookie کار می‌کنن
// این تغییر backdoor قدیمی رو می‌بنده که با ?password=xxx قابل exploit بود
// v1.1 (security pass 2):
//   - session token به passwordHash گره خورده (pwTag) → بعد از تغییر/ریست رمز،
//     همه‌ی توکن‌های قدیمی فوراً بی‌اعتبار می‌شن (session revocation)
//   - انقضا + ساعت/روز مجاز در «هر درخواست» چک می‌شه (قبلاً فقط موقع login بود)
// ============================================================================

import { db } from "@/lib/db";
import { getSessionFromRequest, pwTagOf } from "@/lib/access-auth";

// ----------------------------------------------------------------------------
// checkScheduleWindow — بررسی انقضا + روز/ساعت مجاز روی آبجکت کاربر (بدون query اضافه)
// منطق یکسان با checkAccess در access-auth.ts ولی بر اساس UTC روی user موجود.
// ----------------------------------------------------------------------------
function checkScheduleWindow(user: {
  expiresAt?: Date | null;
  allowedDays?: string | null;
  allowedHourStart?: number | null;
  allowedHourEnd?: number | null;
}): { ok: boolean; reason?: string } {
  const now = new Date();
  if (user.expiresAt && now > user.expiresAt) {
    return { ok: false, reason: "account_expired" };
  }
  if (user.allowedDays) {
    const todayDay = now.getUTCDay();
    const allowedDays = user.allowedDays
      .split(",")
      .map(d => parseInt(d.trim(), 10))
      .filter(n => !isNaN(n));
    if (allowedDays.length > 0 && !allowedDays.includes(todayDay)) {
      return { ok: false, reason: "off_day" };
    }
  }
  const hs = user.allowedHourStart;
  const he = user.allowedHourEnd;
  if (hs !== null && he !== null && hs !== undefined && he !== undefined) {
    const currentHour = now.getUTCHours();
    if (hs <= he) {
      if (currentHour < hs || currentHour >= he) return { ok: false, reason: "off_hours" };
    } else {
      if (currentHour < hs && currentHour >= he) return { ok: false, reason: "off_hours" };
    }
  }
  return { ok: true };
}

// ----------------------------------------------------------------------------
// checkAdminAuth — بررسی session cookie ادمین (تنها روش احراز هویت)
// این تابع برای API routes استفاده می‌شه.
// فقط session cookie رو چک می‌کنه — هیچ password fallback نیست.
// ----------------------------------------------------------------------------
export async function checkAdminAuth(request: Request): Promise<{ ok: boolean; userId?: string }> {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return { ok: false };

    const user = await db.accessUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.active) return { ok: false };
    if (user.role !== "admin") return { ok: false };

    // v1.1: توکن‌های قدیمی (قبل از تغییر رمز) — pwTag دیگر با hash فعلی نمی‌خواند
    if (pwTagOf(user.passwordHash) !== session.pwTag) {
      return { ok: false };
    }

    // v1.1.1 (audit S1-M1): session revocation هنگام logout.
    // توکنِ صادرشده در زمان T در زمان T+24h منقضی می‌شود، پس T = expiresAt - 24h.
    // اگر sessionsValidAfter بعد از T باشد یعنی توکن قبل از logout صادر شده → رد.
    const SESSION_MS = 24 * 60 * 60 * 1000;
    if (
      user.sessionsValidAfter &&
      session.expiresAt - SESSION_MS < user.sessionsValidAfter.getTime()
    ) {
      return { ok: false };
    }

    // v1.1: انقضا/ساعت/روز در هر درخواست (نه فقط موقع login)
    const schedule = checkScheduleWindow(user);
    if (!schedule.ok) return { ok: false };

    return { ok: true, userId: user.id };
  } catch {
    return { ok: false };
  }
}
