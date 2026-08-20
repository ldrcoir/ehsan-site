import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";
import { sendBaleMessage } from "@/lib/bale";

/**
 * POST /api/admin/email
 * Body: { password, to, subject, body, messageId? }
 * Sends an email via SMTP and optionally notifies Bale.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const bodyText = String(body.body || "").trim();

    if (!to || !subject || !bodyText) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
    }

    // Load email config
    const emailConfig = await db.emailConfig.findUnique({ where: { id: "default" } });

    if (!emailConfig?.enabled || !emailConfig.smtpHost) {
      // Email not configured — store as reply in DB and notify Bale
      if (body.messageId) {
        await db.messageReply.create({
          data: { messageId: body.messageId, reply: bodyText },
        });
      }
      // Try Bale notification
      await sendBaleMessage(`📧 Email reply (SMTP not configured):\nTo: ${to}\nSubject: ${subject}\n\n${bodyText.slice(0, 200)}`).catch(() => {});

      return NextResponse.json({
        ok: false,
        error: "email_not_configured",
        message: "SMTP not configured. Reply saved in DB. Configure SMTP in admin settings.",
      });
    }

    // Send email using SMTP via nodemailer (dynamic import)
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: parseInt(emailConfig.smtpPort || "587"),
        secure: emailConfig.smtpPort === "465",
        auth: emailConfig.smtpUser ? {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass || "",
        } : undefined,
      });

      await transporter.sendMail({
        from: `"${emailConfig.fromName || PERSONAL.handle}" <${emailConfig.fromEmail || emailConfig.smtpUser}>`,
        to,
        subject,
        text: bodyText,
        html: bodyText.replace(/\n/g, "<br>"),
      });

      // Save reply in DB
      if (body.messageId) {
        await db.messageReply.create({
          data: { messageId: body.messageId, reply: bodyText },
        });
      }

      // Update message status
      if (body.messageId) {
        await db.contactMessage.update({
          where: { id: body.messageId },
          data: { status: "replied" },
        });
      }

      return NextResponse.json({ ok: true, sent: true });
    } catch (emailErr) {
      console.error("[email] send error:", emailErr);
      return NextResponse.json(
        { ok: false, error: "send_failed", message: String(emailErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[/api/admin/email] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * GET /api/admin/email?password=xxx
 * Returns current email configuration.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const config = await db.emailConfig.findUnique({ where: { id: "default" } });
    return NextResponse.json({
      ok: true,
      config: config ? {
        ...config,
        smtpPass: config.smtpPass ? "••••••••" : null,
      } : null,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/email
 * Update email configuration.
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const data = {
      smtpHost: body.smtpHost || null,
      smtpPort: body.smtpPort || null,
      smtpUser: body.smtpUser || null,
      smtpPass: body.smtpPass && !body.smtpPass.startsWith("••••") ? body.smtpPass : undefined,
      fromEmail: body.fromEmail || null,
      fromName: body.fromName || null,
      enabled: body.enabled ?? false,
    };

    // Remove undefined fields
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    await db.emailConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
