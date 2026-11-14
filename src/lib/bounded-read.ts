// ============================================================================
// bounded-read.ts — خواندن امن بدنه‌ی پاسخ‌های fetch سمت سرور (v1.0)
// ============================================================================
// v1.0 (audit W11-15 #4/#5): `res.json()` خام یعنی هر پاسخ chunked بدون
// Content-Length کل حافظه را می‌بلعد (حتی از hostهای معتبر، وقتی آلوده‌اند یا
// پاسخ عجیب می‌دهند). این helper با شمارش بایت، بیش از سقف مشخص را می‌خواند و
// آن‌سرِ سقف پاسخ را «ناموفق» اعلام می‌کند — همان قرارداد providers.ts.
// ============================================================================

export const MAX_JSON_BYTES = 64 * 1024; // پاسخ APIهای پیام‌رسان/رکپچا هرگز اینقدر بزرگ نیست

/**
 * بدنه‌ی Response را تا سقف maxBytes می‌خواند؛ اگر بزرگ‌تر بود null برمی‌گرداند
 * (fail-closed — مثل response cap در providers.ts).
 */
export async function readBoundedText(res: Response, maxBytes: number = MAX_JSON_BYTES): Promise<string | null> {
  const reader = res.body?.getReader();
  if (!reader) {
    // بدنه‌ای نیست — رشته‌ی خالی معتبر است (برخی APIها 200 با بدنه‌ی خالی می‌دهند)
    return "";
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        reader.cancel().catch(() => {});
        return null; // بزرگ‌تر از سقف — fail-closed
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

/**
 * JSONِ محدودشده — برمی‌گرداند { data, truncated } یا null اگر بدنه نامعتبر/بزرگ‌تر از سقف بود.
 */
export async function readBoundedJson(
  res: Response,
  maxBytes: number = MAX_JSON_BYTES
): Promise<{ data: unknown } | null> {
  const text = await readBoundedText(res, maxBytes);
  if (text === null) return null;
  try {
    return { data: JSON.parse(text) };
  } catch {
    return null;
  }
}
