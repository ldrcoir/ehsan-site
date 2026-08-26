import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * GET /api/admin/content?password=xxx&type=books
 * Returns all content of a type (including hidden) for admin management.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const type = url.searchParams.get("type") || "all";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    if (type === "all") {
      const [books, articles, tutorials, skills, instructions] = await Promise.all([
        db.book.findMany({ orderBy: { order: "asc" } }),
        db.article.findMany({ orderBy: { order: "asc" } }),
        db.tutorial.findMany({ orderBy: { order: "asc" } }),
        db.skill.findMany({ orderBy: { order: "asc" } }),
        db.aiInstruction.findMany({ orderBy: { order: "asc" } }),
      ]);
      return NextResponse.json({
        ok: true,
        books, articles, tutorials, skills, aiInstructions: instructions,
      });
    }

    const model = (db as any)[type];
    if (!model) {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }
    const items = await model.findMany({ orderBy: { order: "asc" } });
    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("[/api/admin/content GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/content
 * Body: { password, type, action, id?, data? }
 * Actions: create, update, delete, reorder, bulk_import
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
    }

    const password = String(body.password || "");
    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const type = String(body.type || "");
    const action = String(body.action || "");
    const model = (db as any)[type];

    if (!model || !["book", "article", "tutorial", "skill", "aiInstruction"].includes(type)) {
      return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
    }

    switch (action) {
      case "create": {
        const data = body.data || {};
        const created = await model.create({ data });
        return NextResponse.json({ ok: true, item: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = body.data || {};
        const updated = await model.update({ where: { id }, data });
        return NextResponse.json({ ok: true, item: updated });
      }

      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        await model.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      case "toggle": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const current = await model.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
        const visibilityField = type === "aiInstruction" ? "enabled" : "visible";
        const updated = await model.update({
          where: { id },
          data: { [visibilityField]: !current[visibilityField] },
        });
        return NextResponse.json({ ok: true, item: updated });
      }

      case "bulk_import": {
        // Bulk import — for tutorials especially (100 Aparat clips)
        const items = body.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ ok: false, error: "no_items" }, { status: 400 });
        }
        let created = 0;
        for (const item of items) {
          try {
            await model.create({ data: item });
            created++;
          } catch (e) {
            // Skip duplicates/errors
          }
        }
        return NextResponse.json({ ok: true, created, total: items.length });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/content POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
