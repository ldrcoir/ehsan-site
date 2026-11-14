import { checkAdminAuth, TAB_PERMISSIONS } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/text?password=xxx
 * Returns all site text strings.
 *
 * POST /api/admin/text
 * { password, action: "set", key, valueEn, valueFa, valueDe }
 * { password, action: "bulk_set", items: [{key, valueEn, valueFa, valueDe}] }
 * { password, action: "delete", key }   — V1.1: remove a text key entirely
 */
export async function GET(req: Request) {
  try {
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/text"]);
    if (!authCheck.ok) {
      // V18.3: public branch removed — was returning data without proper auth
      // Public text content is available via /api/content (which has PUBLIC_KEYS filter)
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req, TAB_PERMISSIONS["/api/admin/text"]); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");

    switch (action) {
      case "set": {
        const key = String(body.key || "");
        if (!key) return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
        // v1.1.2 (hardening): cap key at 200 chars and values at 10000 chars
        if (key.length > 200) {
          return NextResponse.json({ ok: false, error: "key_too_long" }, { status: 400 });
        }
        const valueEn = String(body.valueEn || "");
        const valueFa = String(body.valueFa || "");
        const valueDe = String(body.valueDe || "");
        if (valueEn.length > 10000 || valueFa.length > 10000 || valueDe.length > 10000) {
          return NextResponse.json({ ok: false, error: "value_too_long" }, { status: 400 });
        }
        await db.siteText.upsert({
          where: { key },
          update: { valueEn, valueFa, valueDe },
          create: { key, valueEn, valueFa, valueDe },
        });
        return NextResponse.json({ ok: true });
      }

      case "bulk_set": {
        const items = body.items || [];
        if (!Array.isArray(items)) {
          return NextResponse.json({ ok: false, error: "no_items" }, { status: 400 });
        }
        // v1.1.2 (hardening): cap batch size at 300
        if (items.length > 300) {
          return NextResponse.json({ ok: false, error: "too_many_items" }, { status: 400 });
        }
        // v1.1.2 (hardening): validate caps for every item before writing (no partial writes)
        for (const item of items) {
          const key = String(item.key || "");
          if (key.length > 200) {
            return NextResponse.json({ ok: false, error: "key_too_long" }, { status: 400 });
          }
          const values = [String(item.valueEn || ""), String(item.valueFa || ""), String(item.valueDe || "")];
          if (values.some((v) => v.length > 10000)) {
            return NextResponse.json({ ok: false, error: "value_too_long" }, { status: 400 });
          }
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

      // V1.1: delete a text key (used by the 🗑 button in TextEditor)
      case "delete": {
        const key = String(body.key || "");
        if (!key) return NextResponse.json({ ok: false, error: "missing_key" }, { status: 400 });
        // deleteMany → idempotent (no error if the key doesn't exist)
        const res = await db.siteText.deleteMany({ where: { key } });
        return NextResponse.json({ ok: true, deleted: res.count });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/text POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
