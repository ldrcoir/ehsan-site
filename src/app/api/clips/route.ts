// ============================================================================
// /api/clips — لیست کلیپ‌های آپارات (عمومی — فقط کلیپ‌های visible)
// ============================================================================
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const clips = await db.aparatClip.findMany({
      where: { visible: true },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ ok: true, clips });
  } catch (e) {
    console.error("[/api/clips GET]", e);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
