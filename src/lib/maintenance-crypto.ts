// ============================================================================
// lib/maintenance-crypto — رمزنگاری کانال نگهداری (v1.0 rev3)
// ============================================================================
// کانال /api/maintenance از این نسخه می‌تواند کامل رمز شود (درخواست + پاسخ):
//
//   · کلید:  MAINTENANCE_ENC_KEY در .env — دقیقا ۶۴ کاراکتر hex = ۳۲ بایت
//     (AES-256). install.sh تولیدش می‌کند و یک بار چاپ می‌کند؛ کپی امن:
//     sudo cat db/.maintenance-enc-key.txt
//
//   · قالب پاکت:  {"enc":"v1","data":"<base64(iv[12B] | ciphertext | tag[16B])>"}
//     الگوریتم: AES-256-GCM — احراز صحت (auth tag) داخلی دارد، پس دستکاری
//     پیام در مسیر هم detect می‌شود.
//
//   · داخل پیام (plaintext):  {"ts": <epochMs>, "n": "<nonce hex ≥۱۶>", ...payload}
//     - ts باید داخل پنجره‌ی ±۵ دقیقه باشد (ضد replay بلندمدت)
//     - n یک‌بارمصرف است و ۱۰ دقیقه در حافظه‌ی سرور کش می‌شود (ضد replay سریع)
//
//   · کلاینت مرجع: scripts/maintenance-enc.mjs — همین قالب با node:crypto خالص
//     (maintenance.sh و sync-from-online.sh خودکار از آن استفاده می‌کنند).
//
// fail-closed: وقتی کلید در .env هست، هر درخواستِ متنیِ بدون پاکت با 426 رد
// می‌شود؛ اگر کلید نیست، کانال مثل قبل با توکن ساده کار می‌کند (legacy).
// ============================================================================

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ENC_WINDOW_MS = 5 * 60 * 1000; // پنجره‌ی مجاز ts: ±۵ دقیقه
const NONCE_TTL_MS = 10 * 60 * 1000; // دو برابر پنجره — پوشش کامل replay
const NONCE_CACHE_MAX = 10_000; // سقف کش nonce (ضد رشد حافظه)

// nonce → زمان انقضا (module-scope — در هر instance پروسس جدا است،
// برای کانال نگهداری با نرخ پایین کاملا کافی است)
const seenNonces = new Map<string, number>();

function gcNonces(): void {
  const now = Date.now();
  for (const [k, exp] of seenNonces) {
    if (exp <= now) seenNonces.delete(k);
  }
  // سقف سخت — اخراج قدیمی‌ترین‌ها اگر باز هم پر بود
  while (seenNonces.size >= NONCE_CACHE_MAX) {
    const oldest = seenNonces.keys().next().value;
    if (oldest === undefined) break;
    seenNonces.delete(oldest);
  }
}

// ---------------------------------------------------------------------------
// کلید رمزنگاری — فقط ۶۴ کاراکتر hex معتبر (۳۲ بایت) پذیرفته می‌شود
// ---------------------------------------------------------------------------
export function getEncKeyHex(): string | null {
  const k = process.env.MAINTENANCE_ENC_KEY || "";
  if (!/^[0-9a-fA-F]{64}$/.test(k)) return null;
  return k;
}

// ---------------------------------------------------------------------------
// مقایسه‌ی timing-safe روی digest SHA-256 — حتی «طول» راز هم از روی زمان
// اجرا قابل حدس نیست (همان الگوی SEC-09 که وب‌هوک‌ها دارند)
// ---------------------------------------------------------------------------
export function hashEqSecure(provided: string, real: string): boolean {
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(real, "utf8").digest();
  return timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// بازکردن پاکت — اعتبارسنجی ts + nonce یک‌بارمصرف
// ---------------------------------------------------------------------------
export type EnvelopeResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string };

export function decryptEnvelope(
  dataB64: unknown,
  keyHex: string
): EnvelopeResult {
  try {
    if (typeof dataB64 !== "string" || dataB64.length < 40) {
      return { ok: false, error: "enc_bad_data" };
    }
    const raw = Buffer.from(dataB64, "base64");
    if (raw.length < 12 + 16 + 2) return { ok: false, error: "enc_bad_data" };
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(raw.length - 16);
    const ct = raw.subarray(12, raw.length - 16);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      Buffer.from(keyHex, "hex"),
      iv
    );
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(plain) as Record<string, unknown>;

    // پنجره‌ی زمانی — replay با پیام‌های قدیمی را می‌بندد
    const ts = typeof parsed.ts === "number" ? parsed.ts : NaN;
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > ENC_WINDOW_MS) {
      return { ok: false, error: "enc_stale_timestamp" };
    }

    // nonce یک‌بارمصرف — همان پیام رمزشده دوباره قابل پخش نیست
    const nonce = typeof parsed.n === "string" ? parsed.n : "";
    if (nonce.length < 16) return { ok: false, error: "enc_bad_nonce" };
    gcNonces();
    if (seenNonces.has(nonce)) {
      return { ok: false, error: "enc_replay_detected" };
    }
    seenNonces.set(nonce, Date.now() + NONCE_TTL_MS);

    return { ok: true, body: parsed };
  } catch {
    // GCM روی هر دستکاری/کلید اشتباه final() را throw می‌کند
    return { ok: false, error: "enc_decrypt_failed" };
  }
}

// ---------------------------------------------------------------------------
// ساختن پاکت — برای رمز کردن پاسخ‌ها (همان قالب)
// ---------------------------------------------------------------------------
export function encryptEnvelope(plain: string, keyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}
