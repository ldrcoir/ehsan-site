import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /api/admin/text?password=xxx
 * Returns all site text strings.
 *
 * POST /api/admin/text
 * { password, action: "set", key, valueEn, valueFa, valueDe }
 * { password, action: "bulk_set", items: [{key, valueEn, valueFa, valueDe}] }
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      // Public — return only EN values for display
      const texts = await db.siteText.findMany();
      const result: Record<string, string> = {};
      for (const t of texts) {
        result[t.key] = t.valueEn || t.valueFa || t.valueDe || "";
      }
      return NextResponse.json({ ok: true, texts: result });
    }

    // Admin — return all languages
    const texts = await db.siteText.findMany();
    const result: Record<string, { en: string; fa: string; de: string }> = {};
    for (const t of texts) {
      result[t.key] = { en: t.valueEn, fa: t.valueFa, de: t.valueDe };
    }
    return NextResponse.json({ ok: true, texts: result });
  } catch (err) {
    console.error("[/api/admin/text GET]", err);
    return NextResponse.json({ ok: false, texts: {} });
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
      case "set": {
        const key = String(body.key || "");
        if (!key) return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
        await db.siteText.upsert({
          where: { key },
          update: {
            valueEn: String(body.valueEn || ""),
            valueFa: String(body.valueFa || ""),
            valueDe: String(body.valueDe || ""),
          },
          create: {
            key,
            valueEn: String(body.valueEn || ""),
            valueFa: String(body.valueFa || ""),
            valueDe: String(body.valueDe || ""),
          },
        });
        return NextResponse.json({ ok: true });
      }

      case "bulk_set": {
        const items = body.items || [];
        if (!Array.isArray(items)) {
          return NextResponse.json({ ok: false, error: "no_items" }, { status: 400 });
        }
        for (const item of items) {
          await db.siteText.upsert({
            where: { key: String(item.key) },
            update: {
              valueEn: String(item.valueEn || ""),
              valueFa: String(item.valueFa || ""),
              valueDe: String(item.valueDe || ""),
            },
            create: {
              key: String(item.key),
              valueEn: String(item.valueEn || ""),
              valueFa: String(item.valueFa || ""),
              valueDe: String(item.valueDe || ""),
            },
          });
        }
        return NextResponse.json({ ok: true, count: items.length });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/text POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
