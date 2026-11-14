import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const models: Record<string, any> = {
      book: db.book,
      article: db.article,
      tutorial: db.tutorial,
      skill: db.skill,
      aiInstruction: db.aiInstruction,
    };

    // V17.8: parallel queries instead of sequential (5× faster)
    // v1.1.2 (hardening): take cap so a bloated table can't return unbounded payloads
    const [books, articles, tutorials, skills, aiInstructions] = await Promise.all([
      db.book.findMany({ orderBy: { order: "asc" }, take: 500 }),
      db.article.findMany({ orderBy: { order: "asc" }, take: 500 }),
      db.tutorial.findMany({ orderBy: { order: "asc" }, take: 500 }),
      db.skill.findMany({ orderBy: { order: "asc" }, take: 500 }),
      db.aiInstruction.findMany({ orderBy: { order: "asc" }, take: 500 }),
    ]);

    const results: any = {
      books,
      articles,
      tutorials,
      skills: skills.map((s: any) => ({
        ...s,
        items: s.items.split(",").map((i: string) => i.trim()).filter(Boolean),
      })),
      aiInstructions,
      aiInstruction: aiInstructions, // alias for backward compat
    };
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

    // V18.3: dead password param removed (checkAdminAuth ignores it)
    const authCheck = await checkAdminAuth(req); if (!authCheck.ok) {
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

    // v1.1.1 (audit Q1/P5): whitelist فیلدها per model — قبلاً body.data خام به
    // Prisma می‌رفت؛ فیلد ناموجود → PrismaClientValidationError (500 خام)، و کلاینت
    // می‌توانست id/timestamp را تزریق کند. فیلدهای مجاز دقیقاً همان ستون‌های schema هستند.
    const FIELD_WHITELIST: Record<string, string[]> = {
      book: ["titleEn", "titleFa", "titleDe", "year", "publisherEn", "publisherFa", "publisherDe", "descEn", "descFa", "descDe", "cover", "link", "order", "visible"],
      article: ["titleEn", "titleFa", "titleDe", "venueEn", "venueFa", "venueDe", "date", "typeEn", "typeFa", "typeDe", "summaryEn", "summaryFa", "summaryDe", "link", "order", "visible"],
      tutorial: ["titleEn", "titleFa", "titleDe", "duration", "levelEn", "levelFa", "levelDe", "descEn", "descFa", "descDe", "embedUrl", "platform", "playlist", "order", "visible"],
      skill: ["categoryEn", "categoryFa", "categoryDe", "items", "order", "visible"],
      aiInstruction: ["name", "content", "enabled", "order"],
    };
    const sanitize = (raw: any): Record<string, unknown> => {
      const clean: Record<string, unknown> = {};
      const allowed = FIELD_WHITELIST[type] || [];
      for (const k of allowed) {
        if (raw && raw[k] !== undefined) clean[k] = raw[k];
      }
      // v1.1.1: طول متن‌ها محدود شود (تزریق چند-مگابایتی ناممکن شود)
      for (const [k, v] of Object.entries(clean)) {
        if (typeof v === "string" && k !== "cover" && k !== "link") clean[k] = v.slice(0, 5000);
        if (typeof v === "string" && (k === "cover" || k === "link")) clean[k] = v.slice(0, 500);
      }
      return clean;
    };
    const joinItems = (data: Record<string, unknown>): Record<string, unknown> => {
      if (type === "skill" && Array.isArray(data.items)) {
        data.items = (data.items as unknown[]).map(String).join(", ");
      }
      return data;
    };

    // v1.1.2 (hardening): link/cover/embedUrl must be http(s) URLs — blocks
    // javascript:/data: URIs (XSS vectors) from being stored and re-served as hrefs/srcs
    const URL_FIELDS = ["link", "cover", "embedUrl"];
    const validateUrls = (data: Record<string, unknown>): boolean => {
      for (const f of URL_FIELDS) {
        const v = data[f];
        if (typeof v === "string" && v.trim() !== "") {
          if (!v.startsWith("http://") && !v.startsWith("https://")) return false;
        }
      }
      return true;
    };

    switch (action) {
      case "create": {
        const data = joinItems(sanitize(body.data));
        if (!validateUrls(data)) {
          return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
        }
        const created = await model.create({ data });
        return NextResponse.json({ ok: true, item: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        const data = joinItems(sanitize(body.data));
        if (!validateUrls(data)) {
          return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
        }
        // v1.1.2 (hardening): stale id (P2025) → 404 instead of 500
        try {
          const updated = await model.update({ where: { id }, data });
          return NextResponse.json({ ok: true, item: updated });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          throw e;
        }
      }

      case "delete": {
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        // v1.1.2 (hardening): stale id (P2025) → 404 instead of 500
        try {
          await model.delete({ where: { id } });
        } catch (e) {
          if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
            return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
          }
          throw e;
        }
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
        // v1.1.2 (hardening): cap batch size — previously unbounded loop → DoS via huge payload
        if (items.length > 200) {
          return NextResponse.json({ ok: false, error: "too_many_items" }, { status: 400 });
        }
        let created = 0;
        let failed = 0;
        const errors: string[] = [];
        for (const item of items) {
          try {
            const data = joinItems(sanitize(item));
            await model.create({ data });
            created++;
          } catch (e) {
            // v1.1.1 (audit Q1): شکست ردیف دیگر swallow نمی‌شود — شمرده و گزارش می‌شود
            failed++;
            if (errors.length < 5) errors.push(e instanceof Error ? e.message.slice(0, 120) : "row error");
          }
        }
        return NextResponse.json({ ok: true, created, total: items.length, failed, errors });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/content POST]", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
