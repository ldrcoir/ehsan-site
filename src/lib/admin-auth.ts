// ============================================================================
// admin-auth.ts — بررسی احراز هویت ادمین (فقط session cookie)
// ============================================================================
// V17.2: حذف password fallback — تمام admin routes فقط با session cookie کار می‌کنن
// این تغییر backdoor قدیمی رو می‌بنده که با ?password=xxx قابل exploit بود
// v1.1 (security pass 2):
//   - session token به passwordHash گره خورده (pwTag) → بعد از تغییر/ریست رمز،
//     همه‌ی توکن‌های قدیمی فوراً بی‌اعتبار می‌شن (session revocation)
//   - انقضا + ساعت/روز مجاز در «هر درخواست» چک می‌شه (قبلاً فقط موقع login بود)
// v1.0 (audit W16-20 #1 / W11-15 #10):
//   - سیستم permissions واقعی شد — قبلاً فیلد permissions در DB ذخیره و در UI
//     نمایش داده می‌شد ولی هیچ API آن را چک نمی‌کرد (dead feature گمراه‌کننده).
//     حالا checkAdminAuth(request, requiredTab?) برای تب‌های غیرمتمرکز (پیام‌ها،
//     کلیپ‌ها، محتوا، متن، منو، تم‌ها) دسترسی کاربر limited را بر اساس همین فیلد
//     می‌سنجد. تب‌های حساس (users، stats، settings، …) همچنان فقط ادمین‌اند.
// v1.0 (RBAC cleanup): نقش‌ها/لیست‌های واگذارشدنی به lib/rbac.ts منتقل شدند
//   (تک منبع حقیقت) — owner و admin هر دو elevated هستند؛ role واقعی در پاسخ
//   برگردانده می‌شود تا مسیرهای مدیریت کاربران سلسله‌مراتب را اعمال کنند.
// ============================================================================

import crypto from "crypto";
import { db } from "@/lib/db";
import { getSessionFromRequest, pwTagOf, SESSION_DURATION_MS } from "@/lib/access-auth";
import { isElevated, GRANTABLE_TABS, TAB_PERMISSIONS } from "@/lib/rbac";

// re-export برای سازگاری با importهای قدیمی
export { TAB_PERMISSIONS };

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
// pwTagMatches — مقایسه‌ی timing-safe دو pwTag (v1.0 — audit W1-5 #5)
// قبلاً !== معمولی بود؛ عملگرها با استاندارد timing-safe بقیه‌ی کد یکسان شدند
// ----------------------------------------------------------------------------
function pwTagMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// ----------------------------------------------------------------------------
// checkAdminAuth — بررسی session cookie ادمین (تنها روش احراز هویت)
// این تابع برای API routes استفاده می‌شه.
// فقط session cookie رو چک می‌کنه — هیچ password fallback نیست.
//
// v1.0: پارامتر اختیاری requiredTab — اگر مسیرهای واگذارشدنی صدا بزنند، کاربر
// limited که permissions آن شامل تب است هم قبول می‌شود. بدون requiredTab فقط ادمین.
// ----------------------------------------------------------------------------
export async function checkAdminAuth(
  request: Request,
  requiredTab?: string
): Promise<{ ok: boolean; userId?: string; role?: string }> {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return { ok: false };

    const user = await db.accessUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.active) return { ok: false };

    // v1.0: توکن‌های قدیمی (قبل از تغییر رمز) — pwTag دیگر با hash فعلی نمی‌خواند
    if (!pwTagMatches(pwTagOf(user.passwordHash), session.pwTag)) {
      return { ok: false };
    }

    // v1.1.1 (audit S1-M1): session revocation هنگام logout.
    // توکنِ صادرشده در زمان T در زمان T+24h منقضی می‌شود، پس T = expiresAt - 24h.
    // اگر sessionsValidAfter بعد از T باشد یعنی توکن قبل از logout صادر شده → رد.
    if (
      user.sessionsValidAfter &&
      session.expiresAt - SESSION_DURATION_MS < user.sessionsValidAfter.getTime()
    ) {
      return { ok: false };
    }

    // v1.1: انقضا/ساعت/روز در هر درخواست (نه فقط موقع login)
    const schedule = checkScheduleWindow(user);
    if (!schedule.ok) return { ok: false };

    // v1.0 (RBAC cleanup): owner و admin هر دو بالاتر از محدودیت تب هستند —
    // نقش واقعی برگردانده می‌شود تا مسیرهای مدیریت کاربران بتوانند
    // سلسله‌مراتب owner > admin > user را اعمال کنند
    if (isElevated(user.role)) {
      return { ok: true, userId: user.id, role: user.role };
    }

    // v1.0: کاربر limited — فقط اگر مسیر واگذارشدنی باشد و permission داشته باشد.
    // requiredTab باید از GRANTABLE_TABS باشد؛ تب‌های حساس هرگز از این رد نمی‌شوند.
    if (
      requiredTab &&
      GRANTABLE_TABS.has(requiredTab) &&
      user.permissions &&
      user.permissions.split(",").map(p => p.trim()).includes(requiredTab)
    ) {
      return { ok: true, userId: user.id, role: "user" };
    }

    return { ok: false };
  } catch {
    return { ok: false };
  }
}
