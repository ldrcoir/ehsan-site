// ============================================================================
// sanitize-embed.ts — پاک‌سازی کد امبد آپارات از XSS
// ============================================================================
// فقط تگ iframe با src از دامنه‌های مجاز قبول می‌شه.
// بقیه تگ‌ها و attribute ها حذف می‌شن.
// ============================================================================

const ALLOWED_DOMAINS = [
  "aparat.com",
  "www.aparat.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "player.vimeo.com",
];

export function sanitizeEmbed(input: string): string {
  // فقط تگ iframe رو استخراج کن
  const iframeMatch = input.match(/<iframe[^>]*>/i);
  if (!iframeMatch) return "";

  const iframeTag = iframeMatch[0];

  // src رو استخراج کن
  const srcMatch = iframeTag.match(/src=["']([^"']*)["']/i);
  if (!srcMatch) return "";

  const src = srcMatch[1];

  // بررسی دامنه‌ی مجاز
  try {
    const url = new URL(src);
    if (!ALLOWED_DOMAINS.includes(url.hostname)) {
      return "";
    }
  } catch {
    return "";
  }

  // iframe تمیز بساز
  return `<iframe src="${src}" frameborder="0" allowfullscreen style="width:100%;height:100%;border:0;"></iframe>`;
}
