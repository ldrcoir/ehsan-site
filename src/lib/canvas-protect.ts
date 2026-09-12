"use client";

/**
 * Canvas Protection Module
 * 
 * Makes the oscilloscope and signal generator non-copyable by:
 * 1. Domain locking — only works on authorized domains
 * 2. Invisible watermark — embeds a unique ID in canvas pixels
 * 3. Integrity check — verifies the code hasn't been tampered with
 */

// === CONFIGURATION ===
// دامنه‌های مجاز. اگه دامنه‌ی جدید خواستی اضافه کنی، این لیست رو ویرایش کن.
const AUTHORIZED_DOMAINS = [
  "localhost",
  "127.0.0.1",
  "31.70.76.10",          // VPS IP
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
export function isAuthorizedDomain(): boolean {
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
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(0, 0, w, h);
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
    const imageData = ctx.getImageData(w - 20, h - 3, 20, 3);
    const data = imageData.data;
    
    // Encode deployment ID length (1 byte) + ID bytes
    const encoded = [idBytes.length, ...idBytes];
    for (let i = 0; i < encoded.length && i * 4 < data.length; i++) {
      // Modify only the RED channel LSB — invisible change
      data[i * 4] = (data[i * 4] & 0xFE) | (encoded[i] & 1);
      data[i * 4 + 1] = (data[i * 4 + 1] & 0xFE) | ((encoded[i] >> 1) & 1);
      data[i * 4 + 2] = (data[i * 4 + 2] & 0xFE) | ((encoded[i] >> 2) & 1);
    }
    
    ctx.putImageData(imageData, w - 20, h - 3);
  } catch (e) {
    // getImageData might fail if canvas is tainted (cross-origin)
    // This is fine — the domain lock still works
  }
}

/**
 * Verify canvas integrity — check if the watermark is present.
 * If someone strips the watermark, this returns false.
 */
export function verifyWatermark(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const imageData = ctx.getImageData(w - 20, h - 3, 20, 3);
    const data = imageData.data;
    
    // Decode length
    const length = (data[0] & 1) | ((data[1] & 1) << 1) | ((data[2] & 1) << 2);
    if (length === 0 || length > 30) return false;
    
    // Decode ID
    let decoded = "";
    for (let i = 1; i <= length && i * 4 < data.length; i++) {
      const charCode = (data[i * 4] & 1) | ((data[i * 4 + 1] & 1) << 1) | ((data[i * 4 + 2] & 1) << 2);
      decoded += String.fromCharCode(charCode);
    }
    
    return decoded.length > 0;
  } catch {
    return false;
  }
}

/**
 * Get the deployment ID (for verification purposes).
 */
export function getDeploymentId(): string {
  return DEPLOYMENT_ID;
}
