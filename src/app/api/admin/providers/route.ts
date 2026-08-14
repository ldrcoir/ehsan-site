import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PERSONAL } from "@/lib/content";
import { seedDefaultProviders } from "@/lib/providers";

/**
 * GET /api/admin/providers?password=xxx
 * Returns all AI providers.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";

    if (password !== PERSONAL.adminPassword) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Seed defaults if empty
    await seedDefaultProviders();

    const providers = await db.aiProvider.findMany({
      orderBy: { priority: "asc" },
    });

    // Mask API keys in response
    const masked = providers.map(p => ({
      ...p,
      apiKey: p.apiKey ? "••••••••" + p.apiKey.slice(-4) : null,
    }));

    return NextResponse.json({ ok: true, providers: masked });
  } catch (err) {
    console.error("[/api/admin/providers GET] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/providers
 * Body: { password, action: "create"|"update"|"delete"|"toggle", id?, data? }
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

    const action = String(body.action || "");
    const data = body.data || {};

    switch (action) {
      case "create": {
        const created = await db.aiProvider.create({
          data: {
            name: String(data.name || "custom"),
            label: String(data.label || "New Provider"),
            model: String(data.model || ""),
            apiKey: data.apiKey ? String(data.apiKey) : null,
            baseUrl: data.baseUrl ? String(data.baseUrl) : null,
            enabled: Boolean(data.enabled),
            priority: Number(data.priority) || 99,
          },
        });
        return NextResponse.json({ ok: true, provider: created });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        const updateData: any = {};
        if (data.label !== undefined) updateData.label = String(data.label);
        if (data.model !== undefined) updateData.model = String(data.model);
        if (data.baseUrl !== undefined) updateData.baseUrl = data.baseUrl ? String(data.baseUrl) : null;
        if (data.priority !== undefined) updateData.priority = Number(data.priority);
        // Only update apiKey if provided (not the masked value)
        if (data.apiKey && !data.apiKey.startsWith("••••")) {
          updateData.apiKey = String(data.apiKey);
        }
        const updated = await db.aiProvider.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json({ ok: true, provider: updated });
      }

      case "delete": {
        const id = String(body.id || "");
        if (!id) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        await db.aiProvider.delete({ where: { id } });
        return NextResponse.json({ ok: true });
      }

      case "toggle": {
        const id = String(body.id || "");
        if (!id) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        const current = await db.aiProvider.findUnique({ where: { id } });
        if (!current) {
          return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
        }
        const updated = await db.aiProvider.update({
          where: { id },
          data: { enabled: !current.enabled },
        });
        return NextResponse.json({ ok: true, provider: updated });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/providers POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
