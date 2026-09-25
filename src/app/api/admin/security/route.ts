// ============================================================================
// /api/admin/security — مدیریت امنیت ادمین (تغییر رمز، handle، نام)
// ============================================================================
// SECURITY: فقط از دیتابیس چک می‌شه — هیچ fallback نیست.
// ============================================================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, logAccess, getClientIp } from "@/lib/access-auth";
import { checkAdminAuth } from "@/lib/admin-auth";

// ----------------------------------------------------------------------------
// GET /api/admin/security?password=xxx
// ----------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    const authCheck = await checkAdminAuth(req, password);
    if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      hasPassword: true,
    });
  } catch (err) {
    console.error("[/api/admin/security GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// ----------------------------------------------------------------------------
// POST /api/admin/security
// Body: { password, action: "change_password"|"change_handle"|"change_name", ... }
// ----------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");

    const authCheck = await checkAdminAuth(req, password);
    if (!authCheck.ok) {
      const ip = getClientIp(req as any);
      // skip log اگه کاربر وجود نداره (FK violation)
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "change_password": {
        const newPassword = String(body.newPassword || "").trim();
        const currentPassword = String(body.currentPassword || "");
        if (newPassword.length < 6) {
          return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
        }
        if (!currentPassword) {
          return NextResponse.json({ ok: false, error: "current_password_required" }, { status: 400 });
        }

        // پیدا کردن کاربر ادمین
        const adminUser = await db.accessUser.findFirst({
          where: { role: "admin", active: true },
        });

        if (!adminUser) {
          return NextResponse.json({ ok: false, error: "no_admin_user" }, { status: 404 });
        }

        // بررسی رمز فعلی (verify current password)
        const currentOk = await verifyPassword(currentPassword, adminUser.passwordHash);
        if (!currentOk) {
          // ثبت لاگ امنیتی برای تلاش ناموفق
          const ip = getClientIp(req);
          if (ip && authCheck.userId) {
            await logAccess(authCheck.userId, "password_change_failed", ip, req.headers.get("user-agent"), "Wrong current password");
          }
          return NextResponse.json({ ok: false, error: "wrong_current_password" }, { status: 403 });
        }

        // تغییر رمز
        const newHash = await hashPassword(newPassword);
        await db.accessUser.update({
          where: { id: adminUser.id },
          data: { passwordHash: newHash },
        });

        // ثبت لاگ موفقیت
        const ip = getClientIp(req);
        if (ip && authCheck.userId) {
          await logAccess(authCheck.userId, "password_changed", ip, req.headers.get("user-agent"), "Password changed successfully");
        }

        return NextResponse.json({ ok: true, message: "Password changed." });
      }

      case "change_handle": {
        const newHandle = String(body.newHandle || "").trim();
        if (!newHandle) {
          return NextResponse.json({ ok: false, error: "empty_handle" }, { status: 400 });
        }

        await db.siteSetting.upsert({
          where: { key: "handle" },
          update: { value: newHandle },
          create: { key: "handle", value: newHandle },
        });

        return NextResponse.json({ ok: true, message: "Handle changed." });
      }

      case "change_name": {
        const newName = String(body.newName || "").trim();
        const lang = String(body.lang || "en").slice(0, 3);
        if (!newName) {
          return NextResponse.json({ ok: false, error: "empty_name" }, { status: 400 });
        }
        if (!["fa", "en", "de"].includes(lang)) {
          return NextResponse.json({ ok: false, error: "invalid_lang" }, { status: 400 });
        }

        await db.siteSetting.upsert({
          where: { key: `name_${lang}` },
          update: { value: newName },
          create: { key: `name_${lang}`, value: newName },
        });

        return NextResponse.json({ ok: true, message: "Name changed." });
      }

      case "change_tagline": {
        const newTagline = String(body.newTagline || "").trim();
        const lang = String(body.lang || "en").slice(0, 3);
        if (!["fa", "en", "de"].includes(lang)) {
          return NextResponse.json({ ok: false, error: "invalid_lang" }, { status: 400 });
        }
        await db.siteSetting.upsert({
          where: { key: `tagline_${lang}` },
          update: { value: newTagline },
          create: { key: `tagline_${lang}`, value: newTagline },
        });
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/security POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
