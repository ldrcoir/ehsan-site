// ============================================================================
// /api/admin/users/logs — لاگ‌های دسترسی کاربران
// ============================================================================
// GET: لیست لاگ‌های دسترسی (با pagination)
//   query: ?userId=xxx&limit=100&offset=0
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/access-auth";

async function checkAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return null;
  const user = await db.accessUser.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  if (user.role !== "admin") return null;
  return user;
}

export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

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
}
