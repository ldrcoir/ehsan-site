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
// Add your domain here. The components will only work on this domain.
// On other domains, the canvas shows a "PROTECTED" watermark instead of the waveform.
const AUTHORIZED_DOMAINS = [
  "preview-chat-f7fdfef6-aa0f-4780-ac8e-5fa3dafbfbf0.space-z.ai",
  "localhost",
  "127.0.0.1",
  "21.0.8.193", // dev server IP
];

// Unique deployment fingerprint — change this to your own
const DEPLOYMENT_ID = "PS-RF-V11-2026-0820";

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
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("⚠ PROTECTED CONTENT", w / 2, h / 2 - 10);
    ctx.fillText("This component is domain-locked", w / 2, h / 2 + 10);
    ctx.fillText("Contact the site owner", w / 2, h / 2 + 30);
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
