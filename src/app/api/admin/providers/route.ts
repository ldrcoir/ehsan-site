import { checkAdminAuth } from "@/lib/admin-auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { seedDefaultProviders } from "@/lib/providers";
import { validateBaseUrl } from "@/lib/ssrf";

/**
 * GET /api/admin/providers?password=xxx
 * Returns all AI providers.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const password = ""; // V17.8: dead param removed (checkAdminAuth ignores it)

    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
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
    const authCheck = await checkAdminAuth(req, password); if (!authCheck.ok) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const action = String(body.action || "");
    const data = body.data || {};

    switch (action) {
      case "create": {
        // V18.1: SSRF validation at store time (not just fetch time)
        const rawBaseUrl = data.baseUrl ? String(data.baseUrl) : null;
        if (rawBaseUrl) {
          const check = validateBaseUrl(rawBaseUrl);
          if (!check.valid) {
            return NextResponse.json({ ok: false, error: "invalid_baseurl" }, { status: 400 });
          }
        }
        const created = await db.aiProvider.create({
          data: {
            name: String(data.name || "custom"),
            label: String(data.label || "New Provider"),
            model: String(data.model || ""),
            apiKey: data.apiKey ? String(data.apiKey) : null,
            baseUrl: rawBaseUrl,
            enabled: Boolean(data.enabled),
            priority: Number(data.priority) || 99,
          },
        });
        // V17.6: apiKey رو mask کن (مثل GET)
        return NextResponse.json({ ok: true, provider: maskApiKey(created) });
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) {
          return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
        }
        const updateData: any = {};
        if (data.name !== undefined) updateData.name = String(data.name);
        if (data.label !== undefined) updateData.label = String(data.label);
        if (data.model !== undefined) updateData.model = String(data.model);
        // V18.1: SSRF validation at update time too
        if (data.baseUrl !== undefined) {
          const rawUrl = data.baseUrl ? String(data.baseUrl) : null;
          if (rawUrl) {
            const check = validateBaseUrl(rawUrl);
            if (!check.valid) {
              return NextResponse.json({ ok: false, error: "invalid_baseurl" }, { status: 400 });
            }
          }
          updateData.baseUrl = rawUrl;
        }
        if (data.priority !== undefined) updateData.priority = Number(data.priority);
        if (data.enabled !== undefined) updateData.enabled = Boolean(data.enabled);
        // Only update apiKey if provided (not the masked value)
        if (data.apiKey && !String(data.apiKey).startsWith("••••")) {
          updateData.apiKey = String(data.apiKey);
        }
        const updated = await db.aiProvider.update({
          where: { id },
          data: updateData,
        });
        // V17.6: apiKey رو mask کن
        return NextResponse.json({ ok: true, provider: maskApiKey(updated) });
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
        // V17.6: apiKey رو mask کن
        return NextResponse.json({ ok: true, provider: maskApiKey(updated) });
      }

      default:
        return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[/api/admin/providers POST] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// V17.6: helper برای mask کردن apiKey در پاسخ‌ها
function maskApiKey(provider: any): any {
  if (!provider) return provider;
  return {
    ...provider,
    apiKey: provider.apiKey ? "••••••••" + String(provider.apiKey).slice(-4) : null,
  };
}
