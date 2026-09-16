// ============================================================================
// admin-auth.ts — بررسی رمز ادمین (از دیتابیس و از PERSONAL)
// ============================================================================
// این ماژول برای چک‌کردن رمز ادمین توی API routes استفاده می‌شه.
// اول از دیتابیس (AccessUser با role=admin) چک می‌کنه،
// بعد از PERSONAL.adminPassword (که hardcoded توی content.ts هست).
//
// اینطوری اگه رمز از پنل عوض بشه، APIهای دیگه هم می‌فهمن.
// ============================================================================

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/access-auth";
import { PERSONAL } from "@/lib/content";

// ----------------------------------------------------------------------------
// checkAdminPassword — بررسی رمز ادمین
// ----------------------------------------------------------------------------
// برمی‌گردونه: { ok: boolean, userId?: string }
//
// منطق:
// ۱. اگه کاربر admin توی AccessUser وجود داشته باشه، رمز رو با bcrypt چک می‌کنه
// ۲. اگه نباشه یا رمز اشتباه باشه، با PERSONAL.adminPassword چک می‌کنه
// ۳. اگه هیچکدوم درست نباشن، unauthorized
// ----------------------------------------------------------------------------
export async function checkAdminPassword(password: string): Promise<{ ok: boolean; userId?: string }> {
  // اول از دیتابیس چک کن
  const adminUser = await db.accessUser.findFirst({
    where: { role: "admin", active: true },
  });

  if (adminUser) {
    const ok = await verifyPassword(password, adminUser.passwordHash);
    if (ok) {
      return { ok: true, userId: adminUser.id };
    }
  }

  // fallback: PERSONAL.adminPassword
  if (password === PERSONAL.adminPassword) {
    return { ok: true, userId: adminUser?.id };
  }

  return { ok: false };
}
