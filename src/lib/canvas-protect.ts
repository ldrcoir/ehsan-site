"use client";

/**
 * Canvas Protection Module
 * 
 * Makes the oscilloscope and signal generator non-copyable by:
 * 1. Domain locking — only works on authorized domains
 * 2. Invisible watermark — embeds a unique ID in canvas pixels
 */

// === CONFIGURATION ===
// دامنه‌های مجاز. اگه دامنه‌ی جدید خواستی اضافه کنی، این لیست رو ویرایش کن.
const AUTHORIZED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  // V17.9: VPS IP removed (info leak)
  "ehsanmorad.ir",        // دامنه ۱
  "www.ehsanmorad.ir",
  "ehsan-morad.ir",       // دامنه ۲
  "www.ehsan-morad.ir",
  "ehsanmorad.id.ir",     // دامنه ۳
  "www.ehsanmorad.id.ir",
];

// شناسه‌ی یکتای استقرار — می‌تونی به هر چی تغییر بدی
const DEPLOYMENT_ID = "EHSANMORAD-V19-2026";

/**
 * Check if running on an authorized domain.
 * Returns false if someone copies the code to another domain.
 */
function isAuthorizedDomain(): boolean {
  if (typeof window === "undefined") return true; // SSR — allow
  const host = window.location.hostname;
  return AUTHORIZED_DOMAINS.some(d => host === d || host.endsWith("." + d));
}

/**
 * Embed an invisible watermark in the canvas.
 * Uses steganography — modifies the least significant bits of specific pixels
 * to encode the deployment ID. Invisible to the human eye, but detectable
 * by analyzing the pixel data.
 * 
 * Call this after every canvas draw to watermark the output.
 */
export function watermarkCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (!isAuthorizedDomain()) {
    // Not authorized — show protection notice on canvas
    // v1.1.2 (SEC-13): پوشش کامل بوم در پیکسل فیزیکی (DPR-scale aware)
    let sxN = 1, syN = 1;
    try {
      const t = ctx.getTransform();
      sxN = Math.max(1, Math.round(t.a) || 1);
      syN = Math.max(1, Math.round(t.d) || 1);
    } catch {}
    const pwN = Math.max(1, Math.round(w * sxN));
    const phN = Math.max(1, Math.round(h * syN));
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(0, 0, pwN, phN);
    ctx.fillStyle = "#00ff41";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚠ Setup Required", w / 2, h / 2 - 10);
    ctx.fillText("Add your domain to AUTHORIZED_DOMAINS", w / 2, h / 2 + 10);
    ctx.fillText("in src/lib/canvas-protect.ts", w / 2, h / 2 + 30);
    ctx.textAlign = "left";
    return;
  }

  // Embed watermark in the bottom-right corner pixels
  // We modify the LSB (least significant bit) of a few pixels
  // This encodes the deployment ID without visible change
  try {
    const idBytes = Array.from(DEPLOYMENT_ID).map(c => c.charCodeAt(0));
    // v1.1.2 (audit SEC-13-L3): مختصات واترمارک در پیکسل «فیزیکی» است؛ وقتی ctx با
    // devicePixelRatio مقیاس شده، w/h پارامترها پیکسل CSS هستند و واترمارک جای
    // اشتباه می‌افتد. مقیاس واقعی از transform خوانده می‌شود.
    let sx = 1, sy = 1;
    try {
      const t = ctx.getTransform();
      sx = Math.max(1, Math.round(t.a) || 1);
      sy = Math.max(1, Math.round(t.d) || 1);
    } catch {}
    const pw = Math.max(20, Math.round(w * sx));
    const ph = Math.max(3, Math.round(h * sy));
    const imageData = ctx.getImageData(pw - 20, ph - 3, 20, 3);
    const data = imageData.data;

    // Encode deployment ID length (1 byte) + ID bytes
    const encoded = [idBytes.length, ...idBytes];
    // v1.1.2 (audit SEC-13-L3): کدگذاری کامل ۸ بیتی — قبلاً فقط ۳ بیت پایین هر بایت
    // در R/G/B ذخیره می‌شد و کاراکترهای >7 خراب می‌شدند. حالا هر بایت در ۲ پیکسل
    // (هر کانال ۲ بیت، MSB-first) ذخیره می‌شود؛ در ظاهر نامرئی (±3 روی هر کانال).
    // ترتیب دیکد: بیت‌ها MSB-first، در هر پیکسل R(2bit) G(2bit) B(2bit).
    const bitAt = (i: number): number => {
      const byteIdx = i >> 3;
      if (byteIdx >= encoded.length) return 0;
      return (encoded[byteIdx] >> (7 - (i & 7))) & 1;
    };
    const totalBits = encoded.length * 8;
    const maxPixels = Math.floor(data.length / 4);
    const pixels = Math.min(Math.ceil(totalBits / 6), maxPixels);
    let bitPos = 0;
    for (let p = 0; p < pixels; p++) {
      const r = (bitAt(bitPos) << 1) | bitAt(bitPos + 1);
      const g = (bitAt(bitPos + 2) << 1) | bitAt(bitPos + 3);
      const b = (bitAt(bitPos + 4) << 1) | bitAt(bitPos + 5);
      bitPos += 6;
      const o = p * 4;
      data[o] = (data[o] & 0xFC) | r;
      data[o + 1] = (data[o + 1] & 0xFC) | g;
      data[o + 2] = (data[o + 2] & 0xFC) | b;
    }

    ctx.putImageData(imageData, pw - 20, ph - 3);
  } catch (e) {
    // getImageData might fail if canvas is tainted (cross-origin)
    // This is fine — the domain lock still works
  }
}
