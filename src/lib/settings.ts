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
  // v1.1.1 (audit P4): کلیدهای مرده adminDisplayName/adminTagline/adminStatus حذف شدند —
  // هیچ مصرف‌کننده و مسیر ویرایشی نداشتند و فقط PUBLIC_KEYS را آلوده می‌کردند
  visitorCount: "0",
};

export async function getSetting(key: string): Promise<string> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return DEFAULTS[key] ?? "";
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

// v1.1.1 (audit Q2): getSettings و incrementVisitorCount حذف شدند — export مرده
// بودند (هیچ importی نداشتند) و track route منطق خودش را inline دارد.
