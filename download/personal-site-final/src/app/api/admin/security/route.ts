import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

/**
 * GET /api/admin/security?password=xxx
 * Returns current security settings (handle, has password, etc.)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      ok: true,
      currentHandle: PERSONAL.handle,
      currentName: PERSONAL.fullName,
      hasPassword: true,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/security
 * Body: { password, action: "change_password"|"change_handle"|"change_name", ... }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    const contentPath = join(process.cwd(), "src/lib/content.ts");
    let content = readFileSync(contentPath, "utf-8");

    switch (action) {
      case "change_password": {
        const newPassword = String(body.newPassword || "").trim();
        if (newPassword.length < 6) {
          return NextResponse.json({ ok: false, error: "password_too_short" }, { status: 400 });
        }
        // Replace password in content.ts
        content = content.replace(
          /adminPassword:\s*"[^"]*"/,
          `adminPassword: "${newPassword}"`
        );
        writeFileSync(contentPath, content, "utf-8");

        // Also store in DB for runtime access
        await db.siteSetting.upsert({
          where: { key: "adminPassword" },
          update: { value: newPassword },
          create: { key: "adminPassword", value: newPassword },
        });

        return NextResponse.json({ ok: true, message: "Password changed. Use new password next time." });
      }

      case "change_handle": {
        const newHandle = String(body.newHandle || "").trim();
        if (!newHandle) {
          return NextResponse.json({ ok: false, error: "empty_handle" }, { status: 400 });
        }
        content = content.replace(
          /handle:\s*"[^"]*"/,
          `handle: "${newHandle}"`
        );
        writeFileSync(contentPath, content, "utf-8");

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
        // Update name in content.ts for specific language
        const nameField = lang === "fa" ? "fa" : lang === "de" ? "de" : "en";
        const regex = new RegExp(`(${nameField}:\\s*")([^"]*)(")`);
        // This is simplified — in production, use proper AST parsing
        content = content.replace(regex, `$1${newName}$3`);
        writeFileSync(contentPath, content, "utf-8");

        return NextResponse.json({ ok: true, message: "Name changed." });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/security] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
