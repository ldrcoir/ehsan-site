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
import { hashPassword, getSessionFromRequest, pwTagOf } from "@/lib/access-auth";

// v1.1 (security): این بررسی از admin-auth.ts استفاده نمی‌کنه چون به خود آبجکت user
// نیاز داریم — ولی دقیقاً همان دروازه رو اعمال می‌کنه: pwTag (ابطال session بعد
// از تغییر رمز) + انقضا/ساعت/روز مجاز در هر درخواست.
async function checkAdmin(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return null;
  const user = await db.accessUser.findUnique({ where: { id: session.userId } });
  if (!user || !user.active) return null;
  if (user.role !== "admin") return null;
  if (pwTagOf(user.passwordHash) !== session.pwTag) return null;
  const now = new Date();
  if (user.expiresAt && now > user.expiresAt) return null;
  if (user.allowedDays) {
    const days = user.allowedDays.split(",").map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n));
    if (days.length > 0 && !days.includes(now.getUTCDay())) return null;
  }
  const hs = user.allowedHourStart, he = user.allowedHourEnd;
  if (hs !== null && he !== null && hs !== undefined && he !== undefined) {
    const h = now.getUTCHours();
    if (hs <= he ? (h < hs || h >= he) : (h < hs && h >= he)) return null;
  }
  return user;
}

// ----------------------------------------------------------------------------
// PUT /api/admin/users/[id] — ویرایش کاربر
// ----------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const v = body.allowedHourStart === null ? null : Number(body.allowedHourStart);
    // v1.1: اعتبارسنجی بازه‌ی ساعت (قبلاً هر عددی قبول می‌شد)
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > 23)) {
      return NextResponse.json({ ok: false, error: "invalid_hour" }, { status: 400 });
    }
    data.allowedHourStart = v;
  }
  if (body.allowedHourEnd !== undefined) {
    const v = body.allowedHourEnd === null ? null : Number(body.allowedHourEnd);
    if (v !== null && (!Number.isInteger(v) || v < 0 || v > 23)) {
      return NextResponse.json({ ok: false, error: "invalid_hour" }, { status: 400 });
    }
    data.allowedHourEnd = v;
  }
  if (body.allowedDays !== undefined) data.allowedDays = body.allowedDays || null;
  if (body.permissions !== undefined) data.permissions = body.permissions || null;
  if (body.expiresAt !== undefined) {
    if (body.expiresAt) {
      const d = new Date(body.expiresAt);
      // v1.1: تاریخ نامعتبر → 400 (قبلاً Invalid Date به Prisma می‌رسید → 500 مبهم)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
      }
      data.expiresAt = d;
    } else {
      data.expiresAt = null;
    }
  }
  if (body.active !== undefined) {
    data.active = Boolean(body.active);
    if (!data.active && body.deactivatedReason) {
      data.deactivatedReason = String(body.deactivatedReason);
    }
  }
  // اگه password ارسال شده، هش کن — v1.1: رمز کوتاه دیگه بی‌صدا نادیده گرفته نمی‌شه
  if (body.password !== undefined && body.password !== "") {
    if (typeof body.password !== "string" || body.password.length < 6) {
      return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

  // اگه کاربر داره خودش رو غیرفعال می‌کنه — جلوگیری کن
  if (id === admin.id && data.active === false) {
    return NextResponse.json({ ok: false, error: "cannot_deactivate_self" }, { status: 400 });
  }

  // V18.3: ادمین نمی‌تونه خودش رو به user تنزل بده (قفل شدن کامل پنل)
  if (id === admin.id && body.role !== undefined && body.role !== "admin") {
    return NextResponse.json({ ok: false, error: "cannot_demote_self" }, { status: 400 });
  }

  // V18.3: تنزل یک ادمینِ فعال دیگه به user — نباید آخرین ادمین فعال باشه
  if (data.role === "user" && existing.role === "admin" && existing.active) {
    const activeAdminCount = await db.accessUser.count({ where: { role: "admin", active: true } });
    if (activeAdminCount <= 1) {
      return NextResponse.json({ ok: false, error: "cannot_demote_last_admin" }, { status: 400 });
    }
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
  } catch (err) {
    console.error("[/api/admin/users/[id] PUT] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// DELETE /api/admin/users/[id] — حذف کاربر
// ----------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

  // V18.3: حذف آخرین ادمین فعال ممنوع — سایت بدون ادمین می‌مونه
  if (existing.role === "admin" && existing.active) {
    const activeAdminCount = await db.accessUser.count({ where: { role: "admin", active: true } });
    if (activeAdminCount <= 1) {
      return NextResponse.json({ ok: false, error: "cannot_delete_last_admin" }, { status: 400 });
    }
  }

  // حذف (AccessLog ها به‌خاطر onDelete: Cascade خودکار حذف می‌شن)
  await db.accessUser.delete({ where: { id } });

  return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/users/[id] DELETE] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
