import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Simple in-memory rate limiter: max 3 messages per IP per 10 minutes
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const hits = new Map<string, number[]>();

function rateLimit(ip: string): boolean {
  // Skip rate limit in development for localhost
  if (process.env.NODE_ENV !== "production" && (ip === "::1" || ip === "127.0.0.1" || ip === "unknown")) {
    return true;
  }
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (arr.length >= RATE_LIMIT_MAX) return false;
  arr.push(now);
  hits.set(ip, arr);
  return true;
}

function isSpammy(text: string): boolean {
  const lower = text.toLowerCase();
  // Common spam patterns
  const spamPatterns = [
    /\b(viagra|cialis|casino|lottery|prize|winner|bitcoin investment)\b/,
    /(https?:\/\/[^\s]+){3,}/, // 3+ URLs
    /(.)\1{10,}/, // 11+ of same char in a row
  ];
  return spamPatterns.some((re) => re.test(lower));
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "";

    // Bot detection
    if (/bot|crawl|spider|slurp|wget|curl/i.test(userAgent) && userAgent.length < 80) {
      return NextResponse.json(
        { ok: false, error: "Blocked" },
        { status: 403 }
      );
    }

    if (!rateLimit(ip)) {
      return NextResponse.json(
        { ok: false, error: "rate_limit" },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "invalid_body" },
        { status: 400 }
      );
    }

    const name = String(body.name || "").trim().slice(0, 100);
    const email = String(body.email || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 5000);

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "missing_fields" },
        { status: 400 }
      );
    }
    if (!emailRe.test(email)) {
      return NextResponse.json(
        { ok: false, error: "invalid_email" },
        { status: 400 }
      );
    }
    if (message.length < 10) {
      return NextResponse.json(
        { ok: false, error: "message_too_short" },
        { status: 400 }
      );
    }
    if (isSpammy(message)) {
      return NextResponse.json(
        { ok: false, error: "spam_detected" },
        { status: 422 }
      );
    }

    const saved = await db.contactMessage.create({
      data: { name, email, message, ip, userAgent },
    });

    // Send Bale notification (async, non-blocking)
    import("@/lib/bale")
      .then(({ notifyNewContactMessage }) =>
        notifyNewContactMessage({ id: saved.id, name, email, message })
      )
      .catch(() => {});

    return NextResponse.json({
      ok: true,
      id: saved.id,
      receivedAt: saved.createdAt,
    });
  } catch (err) {
    console.error("[/api/contact] error:", err);
    return NextResponse.json(
      { ok: false, error: "server_error" },
      { status: 500 }
    );
  }
}
