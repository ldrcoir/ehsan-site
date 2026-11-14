import { db } from "@/lib/db";

/**
 * Security utilities — IP blocking and logging.
 * (V18.3: dead generateCaptcha removed — superseded by reCAPTCHA;
 *  isIpBlocked + recordSuspiciousActivity are wired into /api/user/login.)
 */

/** Check if an IP is blocked */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const blocked = await db.blockedIp.findUnique({ where: { ip } });
  if (!blocked) return false;
  // Check expiry
  if (blocked.expiresAt && blocked.expiresAt < new Date()) {
    // v1.1.2 (audit CODE-01-M): deleteMany — در حالت رقابتی دو درخواست همزمان
    // هر دو ردیف منقضی را می‌بینند؛ delete دومی P2025 می‌داد و 500 می‌شد.
    await db.blockedIp.deleteMany({ where: { ip } });
    return false;
  }
  return true;
}

/** Log a security event */
export async function logSecurityEvent(type: string, ip: string | null, detail: string): Promise<void> {
  try {
    await db.securityLog.create({ data: { type, ip, detail } });
  } catch {}
}

/** Record suspicious activity and auto-block if threshold exceeded */
export async function recordSuspiciousActivity(ip: string, reason: string): Promise<boolean> {
  try {
    // Log the event
    await logSecurityEvent("suspicious_message", ip, reason);

    // Check how many suspicious events from this IP in last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.securityLog.count({
      where: {
        type: "suspicious_message",
        ip,
        createdAt: { gte: hourAgo },
      },
    });

    // Auto-block after 3 suspicious attempts in 1 hour
    if (recentCount >= 3) {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h block
      await db.blockedIp.upsert({
        where: { ip },
        update: { reason: `Auto-blocked: ${recentCount} suspicious attempts`, attempts: recentCount, expiresAt },
        create: { ip, reason: `Auto-blocked: ${recentCount} suspicious attempts`, attempts: recentCount, expiresAt },
      });
      await logSecurityEvent("blocked_ip", ip, `Auto-blocked after ${recentCount} suspicious attempts`);
      return true; // Was blocked
    }
    return false;
  } catch {
    return false;
  }
}
