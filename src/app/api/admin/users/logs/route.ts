// ============================================================================
// /api/admin/users/logs — لاگ‌های دسترسی کاربران
// ============================================================================
// GET: لیست لاگ‌های دسترسی (با pagination)
//   query: ?userId=xxx&limit=100&offset=0
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(request);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    // v1.0 (audit W11-15 #8): NaN/negative → Prisma 500 می‌داد — الان clamp امن
    const parseClamp = (raw: string | null, def: number, max: number) => {
      const n = Number.parseInt(raw || String(def), 10);
      return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : def;
    };
    const limit = parseClamp(searchParams.get("limit"), 100, 500);
    const offset = parseClamp(searchParams.get("offset"), 0, Number.MAX_SAFE_INTEGER);

    const where = userId ? { userId } : {};
    const logs = await db.accessLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { username: true, displayName: true },
        },
      },
    });

    const total = await db.accessLog.count({ where });

    return NextResponse.json({ ok: true, logs, total });
  } catch (err) {
    console.error("[/api/admin/users/logs] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
