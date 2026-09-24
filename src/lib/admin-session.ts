import { getSessionFromRequest } from "@/lib/access-auth";
import { db } from "@/lib/db";
// ============================================================================
// admin-session.ts — بررسی session ادمین از cookie (نه password)
// ============================================================================
// این ماژول برای API routes که از داشبورد ادمین صدا زده می‌شن.
// به‌جای password، session cookie رو چک می‌کنه.
// ============================================================================
// checkAdminSession — بررسی session ادمین از cookie
// ----------------------------------------------------------------------------
export async function checkAdminSession(request: Request): Promise<{ ok: boolean; userId?: string }> {
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
