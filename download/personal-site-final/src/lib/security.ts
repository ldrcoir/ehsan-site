import { db } from "@/lib/db";

/**
 * Security utilities — IP blocking, logging, captcha verification.
 */

/** Check if an IP is blocked */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const blocked = await db.blockedIp.findUnique({ where: { ip } });
  if (!blocked) return false;
  // Check expiry
  if (blocked.expiresAt && blocked.expiresAt < new Date()) {
    await db.blockedIp.delete({ where: { ip } });
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

/** Simple math captcha — generates a challenge */
export function generateCaptcha(): { question: string; answer: number } {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  const ops = ["+", "-", "×"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer: number;
  let question: string;
  switch (op) {
    case "+": answer = a + b; question = `${a} + ${b}`; break;
    case "-": answer = a >= b ? a - b : b - a; question = a >= b ? `${a} - ${b}` : `${b} - ${a}`; break;
    case "×": answer = a * b; question = `${a} × ${b}`; break;
  }
  return { question, answer };
}
