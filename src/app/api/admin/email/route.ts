import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * SIMPLE EMAIL API — no SMTP complexity.
 *
 * GET  ?password=xxx  → returns { email: "user@example.com" }
 * POST { password, action: "set_email", email }  → saves email
 * POST { password, action: "send", to, subject, body }  → sends via formsubmit.co (free, no signup)
 *
 * How it works:
 * 1. Admin enters their email (e.g. myname@gmail.com) in the panel
 * 2. When a visitor sends a contact message, the API forwards it to that email
 * 3. Uses formsubmit.co — a free service that sends form submissions to your email
 *    No signup needed. First submission triggers a confirmation email from formsubmit.co
 */

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }
    const setting = await db.siteSetting.findUnique({ where: { key: "forwardEmail" } });
    return NextResponse.json({ ok: true, email: setting?.value || "" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "set_email": {
        const email = String(body.email || "").trim();
        if (!email || !email.includes("@")) {
          return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
        }
        await db.siteSetting.upsert({
          where: { key: "forwardEmail" },
          update: { value: email },
          create: { key: "forwardEmail", value: email },
        });
        return NextResponse.json({ ok: true, email });
      }

      case "send": {
        // Forward a message to the admin's email via formsubmit.co
        const setting = await db.siteSetting.findUnique({ where: { key: "forwardEmail" } });
        const toEmail = setting?.value || "";

        if (!toEmail) {
          return NextResponse.json({ ok: false, error: "no_email_set" });
        }

        const subject = String(body.subject || "New message from your portfolio");
        const text = String(body.body || "");

        // Use formsubmit.co — free, no signup
        // First time: formsubmit.co sends a confirmation email to activate
        try {
          const res = await fetch(`https://formsubmit.co/ajax/${toEmail}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _subject: subject,
              _template: "table",
              message: text,
              _captcha: "false",
            }),
          });
          const data = await res.json();
          if (data.success || res.ok) {
            return NextResponse.json({ ok: true, sent: true, message: "Email forwarded to " + toEmail });
          }
          return NextResponse.json({ ok: false, error: "forward_failed" });
        } catch {
          return NextResponse.json({ ok: false, error: "forward_failed" });
        }
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/email]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
