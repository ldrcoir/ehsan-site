// ============================================================================
// admin-auth.ts 
// ============================================================================
// این ماژول برای چک‌کردن رمز ادمین توی API routes استفاده می‌شه.
// اول از دیتابیس (AccessUser با role=admin) چک می‌کنه،
// فقط از دیتابیس.
//
// اینطوری اگه رمز از پنل عوض بشه، APIهای دیگه هم می‌فهمن.
// ============================================================================

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/access-auth";

// ----------------------------------------------------------------------------
// checkAdminPassword — بررسی رمز ادمین
// ----------------------------------------------------------------------------
// فقط از دیتابیس (AccessUser با role=admin) چک می‌کنه.
// هیچ fallback به PERSONAL.adminPassword نیست — امنیت کامل.
// ----------------------------------------------------------------------------
export async function checkAdminPassword(password: string): Promise<{ ok: boolean; userId?: string }> {
  const adminUser = await db.accessUser.findFirst({
    where: { role: "admin", active: true },
  });

  if (adminUser) {
    const ok = await verifyPassword(password, adminUser.passwordHash);
    if (ok) {
      return { ok: true, userId: adminUser.id };
    }
  }

  return { ok: false };
}
