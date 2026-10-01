// V18.1: SSRF protection utility — shared between admin/providers route and providers lib

export function validateBaseUrl(baseUrl: string): { valid: boolean; sanitized: string } {
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { valid: false, sanitized: "" };
    }
    let host = u.hostname;

    // decimal IP bypass fix
    if (/^\d+$/.test(host) && !host.includes(":")) {
      const decimal = parseInt(host, 10);
      if (decimal >= 0 && decimal <= 0xFFFFFFFF) {
        host = `${(decimal >>> 24) & 0xFF}.${(decimal >>> 16) & 0xFF}.${(decimal >>> 8) & 0xFF}.${decimal & 0xFF}`;
      }
    }

    // hex IP bypass fix
    if (host.startsWith("0x") || /^0x[0-9a-f]+$/i.test(host)) {
      const decimal = parseInt(host, 16);
      if (!isNaN(decimal) && decimal >= 0 && decimal <= 0xFFFFFFFF) {
        host = `${(decimal >>> 24) & 0xFF}.${(decimal >>> 16) & 0xFF}.${(decimal >>> 8) & 0xFF}.${decimal & 0xFF}`;
      }
    }

    // octal IP bypass fix (e.g., 0177.0.0.1 = 127.0.0.1)
    if (/^0\d+$/.test(host)) {
      const decimal = parseInt(host, 8);
      if (!isNaN(decimal) && decimal >= 0 && decimal <= 0xFFFFFFFF) {
        host = `${(decimal >>> 24) & 0xFF}.${(decimal >>> 16) & 0xFF}.${(decimal >>> 8) & 0xFF}.${decimal & 0xFF}`;
      }
    }

    // block cloud metadata hostnames
    const blockedHosts = new Set([
      "metadata.google.internal", "metadata", "169.254.169.254", "metadata.azure.com",
    ]);
    if (blockedHosts.has(host)) return { valid: false, sanitized: "" };

    // block private IPs
    const privatePatterns = [
      /^169\.254\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
      /^127\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
      /^::1$/, /^fc00:/, /^fd00:/, /^fe80:/,
    ];
    for (const p of privatePatterns) {
      if (p.test(host)) return { valid: false, sanitized: "" };
    }
    // localhost only for Ollama port
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      if (u.port !== "11434") return { valid: false, sanitized: "" };
    }
    return { valid: true, sanitized: baseUrl };
  } catch {
    return { valid: false, sanitized: "" };
  }
}
