import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";

/**
 * /api/admin/content
 * GET  ?password=xxx&type=book  → list all items (including hidden)
 * POST { password, type, action, id?, data? }  → CRUD
 *
 * type: book | article | tutorial | skill | aiInstruction
 * action: create | update | delete | toggle | bulk_import
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const models: Record<string, any> = {
      book: db.book,
      article: db.article,
      tutorial: db.tutorial,
      skill: db.skill,
      aiInstruction: db.aiInstruction,
    };

    const results: any = {};
    for (const [name, model] of Object.entries(models)) {
      results[name + "s"] = await model.findMany({ orderBy: { order: "asc" } });
      if (name === "skill") {
        results[name + "s"] = results[name + "s"].map((s: any) => ({
          ...s,
          items: s.items.split(",").map((i: string) => i.trim()).filter(Boolean),
        }));
      }
      if (name === "aiInstruction") {
        results["aiInstructions"] = results[name + "s"];
        delete results[name + "s"];
      }
    }
    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error("[/api/admin/content GET]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });

    const password = String(body.password || "");
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const type = String(body.type || "");
    const action = String(body.action || "");

    const models: Record<string, any> = {
      book: db.book,
      article: db.article,
      tutorial: db.tutorial,
      skill: db.skill,
      aiInstruction: db.aiInstruction,
    };

    const model = models[type];
    if (!model) {
      return NextResponse.json({ ok: false, error: "invalid_type", validTypes: Object.keys(models) }, { status: 400 });
    }

    switch (action) {
      case "create": {
        const data = { ...body.data };
        // Convert skill items array to string
        if (type === "skill" && Array.isArray(data.items)) {
          data.items = data.items.join(", ");
        }
        const created = await model.create({ data });
        return NextResponse.json({ ok: true, item: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = { ...body.data };
        delete data.id; delete data.createdAt; delete data.updatedAt;
        if (type === "skill" && Array.isArray(data.items)) {
          data.items = data.items.join(", ");
        }
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
        const field = type === "aiInstruction" ? "enabled" : "visible";
        const updated = await model.update({ where: { id }, data: { [field]: !current[field] } });
        return NextResponse.json({ ok: true, item: updated });
      }

      case "bulk_import": {
        const items = body.items || [];
        if (!Array.isArray(items) || items.length === 0) {
          return NextResponse.json({ ok: false, error: "no_items" }, { status: 400 });
        }
        let created = 0;
        for (const item of items) {
          try {
            const data = { ...item };
            if (type === "skill" && Array.isArray(data.items)) {
              data.items = data.items.join(", ");
            }
            delete data.id;
            await model.create({ data });
            created++;
          } catch {}
        }
        return NextResponse.json({ ok: true, created, total: items.length });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/content POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
