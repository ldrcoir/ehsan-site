import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/security-dashboard?password=xxx
 * Returns security overview: blocked IPs, recent security events, stats.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [blockedIps, recentLogs, suspiciousCount, failedLoginCount, blockedCount, todayEvents] = await Promise.all([
      db.blockedIp.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.securityLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
      db.securityLog.count({ where: { type: "suspicious_message" } }),
      db.securityLog.count({ where: { type: "failed_login" } }),
      db.blockedIp.count(),
      db.securityLog.count({ where: { createdAt: { gte: dayAgo } } }),
    ]);

    return NextResponse.json({
      ok: true,
      data: {
        blockedIps,
        recentLogs,
        stats: { suspiciousCount, failedLoginCount, blockedCount, todayEvents },
      },
    });
  } catch (err) {
    console.error("[/api/admin/security-dashboard]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/security-dashboard
 * { password, action: "unblock"|"block"|"clear_logs", ip? }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    const ip = String(body.ip || "");

    // v1.1.2 (hardening): validate ip format (IPv4 or IPv6) before storing/logging —
    // garbage strings would poison the security dashboard and block lists
    const IPV4_RE = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
    // IPv6 (full and compressed forms, including ::)
    const IPV6_RE = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
    const isValidIp = (v: string): boolean => IPV4_RE.test(v) || IPV6_RE.test(v);

    switch (action) {
      case "unblock": {
        if (!ip) return NextResponse.json({ ok: false, error: "missing_ip" }, { status: 400 });
        if (!isValidIp(ip)) return NextResponse.json({ ok: false, error: "invalid_ip" }, { status: 400 });
        await db.blockedIp.deleteMany({ where: { ip } });
        await db.securityLog.create({ data: { type: "manual_unblock", ip, detail: "Manually unblocked by admin" } });
        return NextResponse.json({ ok: true });
      }
      case "block": {
        if (!ip) return NextResponse.json({ ok: false, error: "missing_ip" }, { status: 400 });
        if (!isValidIp(ip)) return NextResponse.json({ ok: false, error: "invalid_ip" }, { status: 400 });
        await db.blockedIp.upsert({
          where: { ip },
          update: { reason: String(body.reason || "Manually blocked"), attempts: 99 },
          create: { ip, reason: String(body.reason || "Manually blocked"), attempts: 99 },
        });
        await db.securityLog.create({ data: { type: "manual_block", ip, detail: "Manually blocked by admin" } });
        return NextResponse.json({ ok: true });
      }
      case "clear_logs": {
        await db.securityLog.deleteMany({});
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
