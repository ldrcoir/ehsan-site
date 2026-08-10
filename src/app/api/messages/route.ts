import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

// GET /api/messages?password=xxx
// Returns last 50 contact messages. Password-protected.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    // Timing-safe-ish comparison (not perfect, but ok for low-stakes admin)
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const messages = await db.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        message: true,
        ip: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      count: messages.length,
      messages,
    });
  } catch (err) {
    console.error("[/api/messages] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
