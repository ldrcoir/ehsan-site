// V18.1: SSRF protection utility — shared between admin/providers route and providers lib
// V18.3 (security): hardened —
//   - IPv6 hostnames are bracketed by new URL() ("[fe80::1]") — brackets are now
//     stripped so the IPv6 checks actually match (the old ^fc00:/^fe80:/^::1$
//     patterns were dead code and never matched anything)
//   - single trailing-dot strip ("localhost." bypass — "127.0.0.1." is already
//     normalized by the URL parser, but DNS names like "localhost." are not)
//   - IPv6-mapped IPv4 blocking (canonical "[::ffff:a9fe:a9fe]" = 169.254.169.254)
//   - proper IPv6 ULA (fc00::/7) and link-local (fe80::/10) ranges
//   - Ollama exception (localhost/127.0.0.1/::1) allowed ONLY on port 11434,
//     applied AFTER the trailing-dot strip

// IPv4 private / reserved / loopback / link-local / CGNAT ranges
// (run against dotted-decimal hosts)
const IPV4_PRIVATE_PATTERNS = [
  /^169\.254\./,                                  // 169.254.0.0/16  — link-local (cloud metadata)
  /^10\./,                                        // 10.0.0.0/8      — private
  /^172\.(1[6-9]|2[0-9]|3[01])\./,                // 172.16.0.0/12   — private
  /^192\.168\./,                                  // 192.168.0.0/16  — private
  /^127\./,                                       // 127.0.0.0/8     — loopback
  /^0\./,                                         // 0.0.0.0/8       — "this" network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,     // 100.64.0.0/10   — CGNAT
];

function isPrivateHost(h: string): boolean {
  // IPv4 ranges
  for (const p of IPV4_PRIVATE_PATTERNS) {
    if (p.test(h)) return true;
  }
  // IPv6 loopback (::1)
  if (h === "::1") return true;
  // v1.1 (security): unspecified address "::" — exact form of "any/this host"
  if (h === "::" || h === "") return true;
  // v1.1 (security): IPv4-compatible ::/96 — ::7f00:1 = 127.0.0.1.
  // (::ffff:/96 mapped form by itself handled below via ipv6MappedToDotted)
  if (/^::[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(h) && !h.toLowerCase().startsWith("::ffff:")) return true;
  // v1.1 (security): deprecated site-local fec0::/10
  if (/^fec[0-9a-f]:/.test(h)) return true;
  // v1.1 (security): NAT64 local-use 64:ff9b:1::/48
  if (/^64:ff9b:1:/i.test(h)) return true;
  // IPv6 ULA — fc00::/7 = fc00:–fdff: (covers the old fc00:/fd00: prefixes and everything between)
  if (/^f[cd][0-9a-f]{2}:/.test(h)) return true;
  // IPv6 link-local — fe80::/10 = fe80:–febf:
  if (/^fe[89ab][0-9a-f]:/.test(h)) return true;
  // NAT64 well-known prefix 64:ff9b::/96 — embeds an IPv4 literal in the last 32 bits
  if (/^64:ff9b:/i.test(h)) return true;
  return false;
}

/**
 * Convert the part after "::ffff:" (canonical IPv6-mapped IPv4 form) to
 * dotted-decimal IPv4. Example: "a9fe:a9fe" → "169.254.169.254".
 * Returns null when the mapped part is not exactly two hex hextets.
 */
function ipv6MappedToDotted(mapped: string): string | null {
  const parts = mapped.split(":");
  if (parts.length !== 2) return null;
  const bytes: number[] = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
    const v = parseInt(part, 16);
    bytes.push((v >>> 8) & 0xff, v & 0xff);
  }
  return bytes.join(".");
}

export function validateBaseUrl(baseUrl: string): { valid: boolean; sanitized: string } {
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { valid: false, sanitized: "" };
    }
    let host = u.hostname;

    // V18.3: IPv6 hosts are serialized WITH brackets ("[::ffff:a9fe:a9fe]") —
    // strip them so the IPv6 patterns below can match.
    if (host.startsWith("[") && host.endsWith("]")) {
      host = host.slice(1, -1);
    }

    // V18.3: strip a single trailing dot BEFORE all checks — DNS treats
    // "localhost." as "localhost", so a trailing dot used to bypass the
    // literal-host checks ("http://localhost.:6379" passed validation).
    if (host.endsWith(".")) {
      host = host.slice(0, -1);
    }

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

    // V18.3: block IPv6-mapped IPv4 — after new URL() these appear in canonical
    // hex form, e.g. [::ffff:169.254.169.254] → "[::ffff:a9fe:a9fe]" (brackets
    // already stripped above).
    if (host.startsWith("::ffff:")) {
      const dotted = ipv6MappedToDotted(host.slice("::ffff:".length));
      // explicit Ollama exception: [::ffff:127.0.0.1] allowed only on port 11434
      if (dotted === "127.0.0.1" && u.port === "11434") {
        return { valid: true, sanitized: baseUrl };
      }
      // run the IPv4 private patterns on the converted v4 when conversion worked
      if (dotted && isPrivateHost(dotted)) return { valid: false, sanitized: "" };
      // fail-closed: any other ::ffff: host (including unparseable ones) gets rejected
      return { valid: false, sanitized: "" };
    }

    // Ollama exception — localhost / 127.0.0.1 / ::1 allowed ONLY on port 11434.
    // V18.3: applied AFTER the trailing-dot strip and numeric normalization so
    // "localhost." and numeric loopback forms can't dodge the port restriction.
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      if (u.port !== "11434") return { valid: false, sanitized: "" };
      return { valid: true, sanitized: baseUrl };
    }

    // block private/reserved IPs
    if (isPrivateHost(host)) return { valid: false, sanitized: "" };

    return { valid: true, sanitized: baseUrl };
  } catch {
    return { valid: false, sanitized: "" };
  }
}
