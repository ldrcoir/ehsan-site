// ============================================================================
// /api/admin/users/[id] — ویرایش و حذف کاربر AccessUser
// ============================================================================
// PUT    : ویرایش کاربر
//   body: { displayName?, role?, password?, allowedHourStart?, allowedHourEnd?, allowedDays?, expiresAt?, active?, deactivatedReason? }
// DELETE : حذف کاربر (همراه با AccessLog ها به‌خاطر onDelete: Cascade)
//
// نکته: ادمین نمی‌تونه خودش رو حذف یا غیرفعال کنه
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, getSessionFromRequest } from "@/lib/access-auth";

async function checkAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return null;
  const user = await db.accessUser.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  if (user.role !== "admin") return null;
  return user;
}

// ----------------------------------------------------------------------------
// PUT /api/admin/users/[id] — ویرایش کاربر
// ----------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // بررسی وجود کاربر
  const existing = await db.accessUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  // ساخت data برای update
  const data: any = {};
  if (body.displayName !== undefined) data.displayName = String(body.displayName).trim();
  if (body.role !== undefined) data.role = body.role === "admin" ? "admin" : "user";
  if (body.allowedHourStart !== undefined) {
    data.allowedHourStart = body.allowedHourStart === null ? null : Number(body.allowedHourStart);
  }
  if (body.allowedHourEnd !== undefined) {
    data.allowedHourEnd = body.allowedHourEnd === null ? null : Number(body.allowedHourEnd);
  }
  if (body.allowedDays !== undefined) data.allowedDays = body.allowedDays || null;
  if (body.permissions !== undefined) data.permissions = body.permissions || null;
  if (body.expiresAt !== undefined) {
    data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  }
  if (body.active !== undefined) {
    data.active = Boolean(body.active);
    if (!data.active && body.deactivatedReason) {
      data.deactivatedReason = String(body.deactivatedReason);
    }
  }
  // اگه password ارسال شده، هش کن
  if (body.password && body.password.length >= 6) {
    data.passwordHash = await hashPassword(body.password);
  }

  // اگه کاربر داره خودش رو غیرفعال می‌کنه — جلوگیری کن
  if (id === admin.id && data.active === false) {
    return NextResponse.json({ ok: false, error: "cannot_deactivate_self" }, { status: 400 });
  }

  const updated = await db.accessUser.update({
    where: { id },
    data,
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
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updated });
}

// ----------------------------------------------------------------------------
// DELETE /api/admin/users/[id] — حذف کاربر
// ----------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await checkAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // جلوگیری از حذف خود
  if (id === admin.id) {
    return NextResponse.json({ ok: false, error: "cannot_delete_self" }, { status: 400 });
  }

  // بررسی وجود کاربر
  const existing = await db.accessUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  // حذف (AccessLog ها به‌خاطر onDelete: Cascade خودکار حذف می‌شن)
  await db.accessUser.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
