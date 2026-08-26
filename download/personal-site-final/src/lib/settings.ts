import { db } from "@/lib/db";

/**
 * Site settings helper.
 * Reads/writes key-value pairs from the SiteSetting table.
 * Falls back to defaults if a key is missing.
 */

const DEFAULTS: Record<string, string> = {
  apiEnabled: "true",
  baleEnabled: "false",
  baleBotToken: "",
  baleChatId: "",
  adminDisplayName: "",
  adminTagline: "",
  adminStatus: "",
  visitorCount: "0",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return DEFAULTS[key] ?? "";
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const rows = await db.siteSetting.findMany({ where: { key: { in: keys } } });
  const result: Record<string, string> = {};
  for (const k of keys) {
    const row = rows.find((r) => r.key === k);
    result[k] = row ? row.value : DEFAULTS[k] ?? "";
  }
  return result;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.siteSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function isApiEnabled(): Promise<boolean> {
  const v = await getSetting("apiEnabled");
  return v === "true";
}

export async function incrementVisitorCount(): Promise<number> {
  const current = parseInt(await getSetting("visitorCount"), 10) || 0;
  const next = current + 1;
  await setSetting("visitorCount", String(next));
  return next;
}
