import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/chat/messages?sessionId=xxx&since=timestamp
 * Returns messages in a chat session since a given timestamp.
 * Used by the visitor's chat box to poll for new messages (from AI or admin).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId") || "";
    const since = url.searchParams.get("since") || "0";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "missing_session" }, { status: 400 });
    }

    const sinceDate = new Date(parseInt(since, 10) || 0);

    const messages = await db.chatMessage.findMany({
      where: {
        sessionId,
        role: "assistant",
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      messages,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error("[/api/chat/messages] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
