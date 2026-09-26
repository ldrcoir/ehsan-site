// ============================================================================
// admin-auth.ts — بررسی احراز هویت ادمین (فقط session cookie)
// ============================================================================
// V17.2: حذف password fallback — تمام admin routes فقط با session cookie کار می‌کنن
// این تغییر backdoor قدیمی رو می‌بنده که با ?password=xxx قابل exploit بود
// ============================================================================

import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/access-auth";

// ----------------------------------------------------------------------------
// checkAdminAuth — بررسی session cookie ادمین (تنها روش احراز هویت)
// ----------------------------------------------------------------------------
// این تابع برای API routes استفاده می‌شه.
// فقط session cookie رو چک می‌کنه — هیچ password fallback نیست.
// ----------------------------------------------------------------------------
export async function checkAdminAuth(request: Request, _password?: string): Promise<{ ok: boolean; userId?: string }> {
  // password param برای backward compatibility نگه داشته شده ولی نادیده گرفته می‌شه
  try {
    const session = getSessionFromRequest(request);
    if (!session) return { ok: false };

    const user = await db.accessUser.findUnique({ where: { id: session.userId } });
    if (!user || !user.active) return { ok: false };
    if (user.role !== "admin") return { ok: false };

    return { ok: true, userId: user.id };
  } catch {
    return { ok: false };
  }
}

// ----------------------------------------------------------------------------
// checkAdminPassword — نگه داشته شده برای reset-admin-password.sh و install
// ----------------------------------------------------------------------------
// این تابع فقط برای اسکریپت‌های خارج از Next.js (مثل reset password) استفاده می‌شه
// API routes از این تابع استفاده نمی‌کنن
// ----------------------------------------------------------------------------
export async function checkAdminPassword(password: string): Promise<{ ok: boolean; userId?: string }> {
  const { verifyPassword } = await import("@/lib/access-auth");
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
