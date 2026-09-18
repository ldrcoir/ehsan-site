// ============================================================================
// /api/admin/users — مدیریت کاربران AccessUser توسط ادمین
// ============================================================================
// GET  : لیست همه کاربران (بدون passwordHash)
// POST : ساخت کاربر جدید
//   body: { username, password, displayName?, role?, allowedHourStart?, allowedHourEnd?, allowedDays?, expiresAt?, active? }
//
// نکات امنیتی:
// - این endpoint فقط با session ادمین قابل دسترسی هست
// - passwordHash هرگز در response برگردانده نمی‌شه
// - username قبل از ذخیره lowercase می‌شه
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, getSessionFromRequest } from "@/lib/access-auth";

// ----------------------------------------------------------------------------
// checkAdmin — بررسی اینکه درخواست‌دهنده ادمین هست
// ----------------------------------------------------------------------------
async function checkAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return null;
  const user = await db.accessUser.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  if (user.role !== "admin") return null;
  return user;
}

// ----------------------------------------------------------------------------
// GET /api/admin/users — لیست کاربران
// ----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const users = await db.accessUser.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      allowedHourStart: true,
      allowedHourEnd: true,
      allowedDays: true,
      permissions: true,
      expiresAt: true,
      active: true,
      loginCount: true,
      lastLoginAt: true,
      deactivatedReason: true,
      createdAt: true,
      updatedAt: true,
      // passwordHash هرگز برگردانده نمی‌شه
    },
  });
  return NextResponse.json({ ok: true, users });
}

// ----------------------------------------------------------------------------
// POST /api/admin/users — ساخت کاربر جدید
// ----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username: string = (body.username || "").trim().toLowerCase();
  const password: string = body.password || "";
  const displayName: string = (body.displayName || "").trim();
  const role: string = body.role === "admin" ? "admin" : "user";
  const allowedHourStart = body.allowedHourStart === null || body.allowedHourStart === undefined ? null : Number(body.allowedHourStart);
  const allowedHourEnd = body.allowedHourEnd === null || body.allowedHourEnd === undefined ? null : Number(body.allowedHourEnd);
  const allowedDays: string | null = body.allowedDays || null;
  const permissions: string | null = body.permissions || null;
  const expiresAt: Date | null = body.expiresAt ? new Date(body.expiresAt) : null;
  const active: boolean = body.active !== false;

  // اعتبارسنجی
  if (!username || username.length < 3) {
    return NextResponse.json({ ok: false, error: "username_too_short" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }
  if (allowedHourStart !== null && (allowedHourStart < 0 || allowedHourStart > 23)) {
    return NextResponse.json({ ok: false, error: "invalid_hour_start" }, { status: 400 });
  }
  if (allowedHourEnd !== null && (allowedHourEnd < 0 || allowedHourEnd > 23)) {
    return NextResponse.json({ ok: false, error: "invalid_hour_end" }, { status: 400 });
  }

  // بررسی یکتا بودن username
  const existing = await db.accessUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "username_exists" }, { status: 409 });
  }

  // هش رمز عبور
  const passwordHash = await hashPassword(password);

  const user = await db.accessUser.create({
    data: {
      username,
      passwordHash,
      displayName,
      role,
      allowedHourStart,
      allowedHourEnd,
      allowedDays,
      permissions,
      expiresAt,
      active,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      role: true,
      allowedHourStart: true,
      allowedHourEnd: true,
      allowedDays: true,
      permissions: true,
      expiresAt: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, user });
}
