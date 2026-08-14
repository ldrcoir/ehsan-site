import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/content
 * Public endpoint — returns all visible content for the site.
 */
export async function GET() {
  try {
    const [books, articles, tutorials, skills, instructions, equipment] = await Promise.all([
      db.book.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.article.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.tutorial.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.skill.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
      db.aiInstruction.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
      db.labEquipment.findMany({ where: { visible: true }, orderBy: { order: "asc" } }),
    ]);

    return NextResponse.json({
      ok: true,
      books,
      articles,
      tutorials,
      skills: skills.map(s => ({
        ...s,
        items: s.items.split(",").map((i: string) => i.trim()).filter(Boolean),
      })),
      aiInstructions: instructions,
      equipment: equipment.map(e => ({
        ...e,
        specs: e.specs ? (typeof e.specs === "string" ? JSON.parse(e.specs) : e.specs) : null,
      })),
    });
  } catch (err) {
    console.error("[/api/content] error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
