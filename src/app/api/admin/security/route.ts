import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, logAccess, getClientIp } from "@/lib/access-auth";
import { PERSONAL } from "@/lib/content";

// ----------------------------------------------------------------------------
// GET /api/admin/security?password=xxx
// Returns current security settings
// ----------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    // بررسی رمز: اول از دیتابیس، بعد از PERSONAL
    const adminUser = await db.accessUser.findFirst({
      where: { role: "admin", active: true },
    });

    let passwordOk = false;
    if (adminUser) {
      passwordOk = await verifyPassword(password, adminUser.passwordHash);
    }
    if (!passwordOk && password === PERSONAL.adminPassword) {
      passwordOk = true;
    }

    if (!passwordOk) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      currentHandle: PERSONAL.handle,
      currentName: PERSONAL.fullName,
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

    // بررسی رمز: اول از دیتابیس، بعد از PERSONAL
    const adminUser = await db.accessUser.findFirst({
      where: { role: "admin", active: true },
    });

    let passwordOk = false;
    if (adminUser) {
      passwordOk = await verifyPassword(password, adminUser.passwordHash);
    }
    if (!passwordOk && password === PERSONAL.adminPassword) {
      passwordOk = true;
    }

    if (!passwordOk) {
      await logAccess(adminUser?.id || "unknown", "admin_login_failed", getClientIp(req as any), req.headers.get("user-agent"), "wrong admin password");
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "change_password": {
        const newPassword = String(body.newPassword || "").trim();
        if (newPassword.length < 6) {
          return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
        }

        // عوض‌کردن رمز توی دیتابیس (نه فایل content.ts — چون تو standalone کار نمی‌کنه)
        if (adminUser) {
          const newHash = await hashPassword(newPassword);
          await db.accessUser.update({
            where: { id: adminUser.id },
            data: { passwordHash: newHash },
          });
        }

        // فقط هش bcrypt در دیتابیس ذخیره می‌شه — نه plain text
        return NextResponse.json({ ok: true, message: "Password changed. Use new password next time." });
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
        const lang = String(body.lang || "en");
        if (!newName) {
          return NextResponse.json({ ok: false, error: "empty_name" }, { status: 400 });
        }

        await db.siteSetting.upsert({
          where: { key: `name_${lang}` },
          update: { value: newName },
          create: { key: `name_${lang}`, value: newName },
        });

        return NextResponse.json({ ok: true, message: "Name changed." });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/security POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
