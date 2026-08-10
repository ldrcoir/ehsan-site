import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

// GET /api/messages?password=xxx
// Returns last 50 contact messages + chat session count.
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const [messages, chatCount, totalChats] = await Promise.all([
      db.contactMessage.findMany({
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
      }),
      db.chatMessage.count({ where: { role: "user" } }),
      db.chatSession.count(),
    ]);

    return NextResponse.json({
      ok: true,
      messages,
      stats: {
        contactMessages: messages.length,
        chatMessages: chatCount,
        chatSessions: totalChats,
      },
    });
  } catch (err) {
    console.error("[/api/messages] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
