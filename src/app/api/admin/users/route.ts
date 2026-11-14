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
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/access-auth";
import { checkAdminAuth } from "@/lib/admin-auth";

// v1.0 (audit W11-15 #1 / W1-5 #7): قاعده‌ی واحد username — مشابه PUT در [id]/route.ts
// و login (که همیشه lowercase می‌کند). POST قبلاً فقط length چک می‌کرد: unicode،
// فاصله و usernameهای چندمگابایتی قبول می‌شدند و بعداً قابل لاگین نبودند.
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,64}$/;
// v1.0 (audit W16-20 #1): whitelist permission های واگذارشدنی — همان GRANTABLE_TABS
const GRANTABLE_PERMS = new Set(["messages", "clips", "content", "text", "nav", "themes"]);

// ----------------------------------------------------------------------------
// GET /api/admin/users — لیست کاربران
// ----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(request);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const users = await db.accessUser.findMany({
      orderBy: { createdAt: "desc" },
      take: 200, // v1.1.2 (hardening): cap list size
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
  } catch (err) {
    console.error("[/api/admin/users GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// POST /api/admin/users — ساخت کاربر جدید
// ----------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const authCheck = await checkAdminAuth(request);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
  // v1.0 (audit W11-15 #6): ورودی‌ها باید string باشند — عدد/آبجکت قبلاً در
  // .trim() می‌ترکید و 500 مبهم می‌داد
  if (typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, error: "invalid_input" }, { status: 400 });
  }
  const username: string = (body.username || "").trim().toLowerCase();
  const password: string = body.password || "";
  const displayName: string = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 100) : "";
  const role: string = body.role === "admin" ? "admin" : "user";
  const allowedHourStart = body.allowedHourStart === null || body.allowedHourStart === undefined ? null : Number(body.allowedHourStart);
  const allowedHourEnd = body.allowedHourEnd === null || body.allowedHourEnd === undefined ? null : Number(body.allowedHourEnd);
  const allowedDays: string | null = typeof body.allowedDays === "string" && /^[0-6](,[0-6])*$/.test(body.allowedDays) ? body.allowedDays : null;
  // v1.0: permission ها فقط از whitelist — مقادیر ناشناخته حذف می‌شوند
  const permissions: string | null = typeof body.permissions === "string" && body.permissions
    ? body.permissions.split(",").map((p: string) => p.trim()).filter((p: string) => GRANTABLE_PERMS.has(p)).join(",") || null
    : null;
  const expiresAtRaw = body.expiresAt;
  const expiresAt: Date | null = expiresAtRaw ? new Date(expiresAtRaw) : null;
  // v1.0 (audit W11-15 #6): strict boolean — Boolean("false") قبلاً true می‌داد
  const active: boolean = body.active === undefined ? true : body.active === true;

  // اعتبارسنجی
  // v1.0: قاعده‌ی یکسان username (charset + حداقل/حداکثر) — مشابه PUT
  if (!username || !USERNAME_RE.test(username)) {
    return NextResponse.json({ ok: false, error: "username_too_short" }, { status: 400 });
  }
  // v1.1.1 (audit S1-M2): ادمین حداقل ۱۲ کاراکتر، کاربر عادی حداقل ۸ (قبل‌تر ۶ بود)
  const minPw = role === "admin" ? 12 : 8;
  if (!password || password.length < minPw) {
    return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
  }
  if (password.length > 128) {
    return NextResponse.json({ ok: false, error: "password_too_long" }, { status: 400 });
  }
  if (allowedHourStart !== null && (allowedHourStart < 0 || allowedHourStart > 23)) {
    return NextResponse.json({ ok: false, error: "invalid_hour_start" }, { status: 400 });
  }
  if (allowedHourEnd !== null && (allowedHourEnd < 0 || allowedHourEnd > 23)) {
    return NextResponse.json({ ok: false, error: "invalid_hour_end" }, { status: 400 });
  }
  // v1.0 (audit W1-5 #12): start == end یعنی بازه‌ی خالی — اکانت برای همیشه قفل می‌شد
  if (allowedHourStart !== null && allowedHourEnd !== null && allowedHourStart === allowedHourEnd) {
    return NextResponse.json({ ok: false, error: "invalid_hour_range" }, { status: 400 });
  }
  // v1.0 (audit W11-15 #5): تاریخ نامعتبر → 400 (فقط PUT این را داشت — POST 500 می‌داد)
  if (expiresAt && isNaN(expiresAt.getTime())) {
    return NextResponse.json({ ok: false, error: "invalid_date" }, { status: 400 });
  }

  // بررسی یکتا بودن username
  const existing = await db.accessUser.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ ok: false, error: "username_exists" }, { status: 409 });
  }

  // هش رمز عبور
  const passwordHash = await hashPassword(password);

  // v1.1.2 (hardening): findUnique pre-check above is not race-safe — a concurrent
  // create with the same username raises P2002 → 409 instead of 500
  try {
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
    // v1.0 (audit W11-15 #4): حسابرسی اقدام ادمین روی کاربران — قبلاً ساخت/ویرایش
    // کاربر هیچ ردی در SecurityLog نداشت
    await db.securityLog.create({
      data: {
        type: "user_admin_action",
        ip: null,
        detail: `admin=${authCheck.userId} action=create target=${username} role=${role}`,
      },
    }).catch(() => {});
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: false, error: "username_exists" }, { status: 409 });
    }
    throw e;
  }
  } catch (err) {
    console.error("[/api/admin/users POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
