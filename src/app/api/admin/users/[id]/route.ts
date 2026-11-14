// ============================================================================
// /api/admin/users/[id] — ویرایش و حذف کاربر AccessUser
// ============================================================================
// PUT    : ویرایش کاربر
//   body: { username?, displayName?, role?, password?, allowedHourStart?, allowedHourEnd?, allowedDays?, expiresAt?, active?, deactivatedReason? }
// DELETE : حذف کاربر — AccessLog ها قبل از حذف به SecurityLog آرشیو می‌شوند
//
// نکته: ادمین نمی‌تونه خودش رو حذف یا غیرفعال کنه
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/access-auth";
import { checkAdminAuth } from "@/lib/admin-auth";

// v1.0 (audit W11-15 #2): نام کاربری همیشه lowercase — login همیشه lowercase می‌کند؛
// وگرنه تغییر نام به «Bob» باعث اکانتِ غیرقابل‌لاگین + duplicate حساس به حروف می‌شد
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;
const GRANTABLE_PERMS = new Set(["messages", "clips", "content", "text", "nav", "themes"]);

// ----------------------------------------------------------------------------
// PUT /api/admin/users/[id] — ویرایش کاربر
// ----------------------------------------------------------------------------
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // v1.1.2 (audit SEC-05-M): از checkAdminAuth استفاده می‌شود تا همه‌ی لایه‌ها
    // (pwTag + session revocation + schedule) مثل بقیه‌ی مسیرهای ادمین اعمال شوند —
    // کپی محلی قدیمی sessionsValidAfter را چک نمی‌کرد و توکنِ قبل از logout تا ۲۴h
    // برای PUT/DELETE معتبر می‌ماند.
    const authCheck = await checkAdminAuth(request);
    if (!authCheck.ok || !authCheck.userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const adminId = authCheck.userId;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));

  // بررسی وجود کاربر
  const existing = await db.accessUser.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
  }

  // ساخت data برای update
  const data: any = {};
  // v1.1.2 (audit PANEL-09): ویرایش username — قبلاً API فیلد username را نادیده می‌گرفت
  if (body.username !== undefined) {
    const newUsername = String(body.username).trim().toLowerCase();
    if (!USERNAME_RE.test(newUsername)) {
      return NextResponse.json({ ok: false, error: "invalid_username" }, { status: 400 });
    }
    if (newUsername !== existing.username) {
      const dupe = await db.accessUser.findUnique({ where: { username: newUsername } });
      if (dupe) {
        return NextResponse.json({ ok: false, error: "username_exists" }, { status: 409 });
      }
      data.username = newUsername;
    }
  }
  if (body.displayName !== undefined) {
    // v1.0 (audit W11-15 #9): cap طول فیلدهای free-text
    if (typeof body.displayName !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    data.displayName = body.displayName.trim().slice(0, 100);
  }
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
  if (body.allowedDays !== undefined) {
    // v1.0 (audit W11-15 #9): فقط روزهای ۰-۶ معتبر — قبلاً هر رشته‌ای ذخیره می‌شد
    data.allowedDays = typeof body.allowedDays === "string" && /^[0-6](,[0-6])*$/.test(body.allowedDays)
      ? body.allowedDays
      : null;
  }
  if (body.permissions !== undefined) {
    // v1.0: whitelist permission ها — مقادیر ناشناخته حذف می‌شوند
    data.permissions = typeof body.permissions === "string" && body.permissions
      ? body.permissions.split(",").map((p: string) => p.trim()).filter((p: string) => GRANTABLE_PERMS.has(p)).join(",") || null
      : null;
  }
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
    // v1.0 (audit W11-15 #6): strict boolean — Boolean("false") قبلاً true می‌داد
    data.active = body.active === true;
    if (!data.active && body.deactivatedReason) {
      data.deactivatedReason = String(body.deactivatedReason).slice(0, 300);
    }
  }
  // اگه password ارسال شده، هش کن — v1.1: رمز کوتاه دیگه بی‌صدا نادیده گرفته نمی‌شه
  if (body.password !== undefined && body.password !== "") {
    // v1.0 (audit W11-15 #6): typeof چک — عدد قبلاً از length-guard رد می‌شد و در bcrypt 500 می‌داد
    if (typeof body.password !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
    }
    // v1.1.1 (audit S1-M2): حداقل طول بر اساس نقش هدف — ادمین ۱۲، کاربر ۸
    const targetRole = body.role !== undefined ? (body.role === "admin" ? "admin" : "user") : existing.role;
    const minPw = targetRole === "admin" ? 12 : 8;
    if (body.password.length < minPw) {
      return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
    }
    if (body.password.length > 128) {
      return NextResponse.json({ ok: false, error: "password_too_long" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.password);
  }

  // v1.0 (audit W1-5 #12): start == end یعنی بازه‌ی خالی — اکانت برای همیشه قفل می‌شد
  const newStart = data.allowedHourStart !== undefined ? data.allowedHourStart : existing.allowedHourStart;
  const newEnd = data.allowedHourEnd !== undefined ? data.allowedHourEnd : existing.allowedHourEnd;
  if (newStart !== null && newEnd !== null && newStart === newEnd) {
    return NextResponse.json({ ok: false, error: "invalid_hour_range" }, { status: 400 });
  }

  // اگه کاربر داره خودش رو غیرفعال می‌کنه — جلوگیری کن
  if (id === adminId && data.active === false) {
    return NextResponse.json({ ok: false, error: "cannot_deactivate_self" }, { status: 400 });
  }

  // V18.3: ادمین نمی‌تونه خودش رو به user تنزل بده (قفل شدن کامل پنل)
  if (id === adminId && body.role !== undefined && body.role !== "admin") {
    return NextResponse.json({ ok: false, error: "cannot_demote_self" }, { status: 400 });
  }

  // V18.3: تنزل یک ادمینِ فعال دیگه به user — نباید آخرین ادمین فعال باشه
  if (data.role === "user" && existing.role === "admin" && existing.active) {
    const activeAdminCount = await db.accessUser.count({ where: { role: "admin", active: true } });
    if (activeAdminCount <= 1) {
      return NextResponse.json({ ok: false, error: "cannot_demote_last_admin" }, { status: 400 });
    }
  }

  // v1.0 (audit W11-15 #7): race-safe — P2002 از concurrent rename/create → 409
  // (قبلاً generic 500 می‌داد؛ POST همین الگو را داشت)
  let updated;
  try {
    updated = await db.accessUser.update({
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
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: false, error: "username_exists" }, { status: 409 });
    }
    throw e;
  }

  // v1.0 (audit W11-15 #4): حسابرسی اقدام ادمین — کدام ادمین چه فیلدهایی را عوض کرد
  await db.securityLog.create({
    data: {
      type: "user_admin_action",
      ip: null,
      detail: `admin=${adminId} action=update target=${existing.username} fields=${Object.keys(data).join(",")}`,
    },
  }).catch(() => {});

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
    // v1.1.2 (audit SEC-05-M): gate کامل مشابه PUT — از checkAdminAuth
    const authCheck = await checkAdminAuth(request);
    if (!authCheck.ok || !authCheck.userId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const adminId = authCheck.userId;

  const { id } = await params;

  // جلوگیری از حذف خود
  if (id === adminId) {
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

  // v1.0 (audit W11-15 #3): آرشیو «همه‌ی» لاگ‌ها قبل از حذف — قبلاً فقط ۵۰۰ تای آخر
  // آرشیو می‌شد (onDelete: Cascade بقیه را بی‌صدا نابود می‌کرد) و شکست createMany
  // در try/catch خالی پوشانده می‌شد و حذف ادامه پیدا می‌کرد. الان:
  // - همه‌ی لاگ‌ها به‌صورت صفحه‌بندی‌شده آرشیو می‌شوند
  // - شکست آرشیو = توقف حذف (500) تا ردپای حسابرسی از بین نرود
  try {
    let archived = 0;
    let cursor = 0;
    for (;;) {
      const logs = await db.accessLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: 500,
        skip: cursor,
        select: { action: true, ip: true, details: true, createdAt: true },
      });
      if (logs.length === 0) break;
      await db.securityLog.createMany({
        data: logs.map(l => ({
          type: "access_log_archived",
          ip: l.ip,
          detail: `user=${existing.username} action=${l.action} at=${l.createdAt.toISOString()} ${l.details}`.slice(0, 500),
        })),
      });
      archived += logs.length;
      cursor += 500;
      if (logs.length < 500) break;
    }
    await db.securityLog.create({
      data: {
        type: "user_admin_action",
        ip: null,
        detail: `admin=${adminId} action=delete target=${existing.username} archivedLogs=${archived}`,
      },
    });
  } catch (archiveErr) {
    console.error("[/api/admin/users/[id] DELETE] archive failed — aborting delete:", archiveErr);
    return NextResponse.json(
      { ok: false, error: "archive_failed_delete_aborted" },
      { status: 500 }
    );
  }

  // حذف (AccessLog ها به‌خاطر onDelete: Cascade خودکار حذف می‌شن — نسخه‌ی آرشیو بالا در SecurityLog می‌ماند)
  await db.accessUser.delete({ where: { id } });

  return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/admin/users/[id] DELETE] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
