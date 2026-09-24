// ============================================================================
// admin-auth.ts — بررسی رمز ادمین (از دیتابیس)
// ============================================================================
// فقط از دیتابیس (AccessUser با role=admin) چک می‌کنه.
// هیچ fallback به PERSONAL.adminPassword نیست — امنیت کامل.
// ============================================================================

import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/access-auth";
import { getSessionFromRequest } from "@/lib/access-auth";

// ----------------------------------------------------------------------------
// checkAdminPassword — بررسی رمز ادمین با password
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

// ----------------------------------------------------------------------------
// checkAdminAuth — بررسی احراز هویت ادمین (password یا session cookie)
// ----------------------------------------------------------------------------
// این تابع برای API routes استفاده می‌شه.
// اول session cookie رو چک می‌کنه (برای user-dashboard).
// اگه نشد، password رو چک می‌کنه (برای پنل قدیمی #admin).
// ----------------------------------------------------------------------------
export async function checkAdminAuth(request: Request, password?: string): Promise<{ ok: boolean; userId?: string }> {
  // ۱. اول session cookie رو چک کن
  try {
    const session = getSessionFromRequest(request);
    if (session) {
      const user = await db.accessUser.findUnique({ where: { id: session.userId } });
      if (user && user.active && user.role === "admin") {
        return { ok: true, userId: user.id };
      }
    }
  } catch {}

  // ۲. اگه session نبود، password رو چک کن
  if (password) {
    return checkAdminPassword(password);
  }

  return { ok: false };
}
