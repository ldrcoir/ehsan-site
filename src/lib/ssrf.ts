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
// v1.1.2 (audit SEC-08-M):
//   - https-only برای هاست‌های عمومی (http فقط برای استثنای Ollama روی loopback) —
//     قبلاً http://public-host مجاز بود و کلیدهای API به‌صورت clear-text می‌رفتند
//   - محدودیت پورت: هاست عمومی فقط 443 — قبلاً http://public:6379 رد نمی‌شد
//   - pre-resolve DNS و چک کردن همه‌ی IPهای resolved (کاهش پنجره‌ی DNS-rebinding
//     TOCTOU — حلقه‌ی کامل نیاز به custom agent دارد؛ این لایه حمله را به‌شدت سخت می‌کند)

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
  // v1.1.1 (audit S5-L1): reserved/documentation/multicast/broadcast ranges
  /^192\.0\.0\./,                                 // 192.0.0.0/24    — IETF protocol assignments
  /^192\.0\.2\./,                                 // 192.0.2.0/24    — TEST-NET-1 (docs)
  /^198\.51\.100\./,                              // 198.51.100.0/24 — TEST-NET-2 (docs)
  /^203\.0\.113\./,                               // 203.0.113.0/24  — TEST-NET-3 (docs)
  /^198\.(1[89]|2\d)\./,                          // 198.18.0.0/15   — benchmarking
  /^2(2[3-9]|[34]\d)\./,                          // 224.0.0.0/4     — multicast
  /^2[45]\d\./,                                   // 240.0.0.0/4     — reserved + broadcast
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
  // v1.0 (audit W21-25 #6): محدوده‌های transition IPv6 — 6to4 (2002::/16) آدرس
  // IPv4 را در بیت‌ها جاسازی می‌کند (مثل 2002:a9fe:a9fe:: = 169.254.169.254) و
  // Teredo (2001:0::/32)؛ هر دو deprecated ولی حذفشان هزینه‌ای ندارد
  if (/^2002:/i.test(h)) return true;
  if (/^2001:0:/i.test(h)) return true;
  if (/^2001:db8:/i.test(h)) return true; // documentation range
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

export function validateBaseUrl(baseUrl: string): { valid: boolean; sanitized: string; host: string } {
  const fail = { valid: false, sanitized: "", host: "" };
  try {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return fail;
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
      "metadata.goog", // v1.0 (audit W21-25 #7): دامنه‌ی کوتاه گوگل برای metadata
    ]);
    if (blockedHosts.has(host)) return fail;

    // V18.3: block IPv6-mapped IPv4 — after new URL() these appear in canonical
    // hex form, e.g. [::ffff:169.254.169.254] → "[::ffff:a9fe:a9fe]" (brackets
    // already stripped above).
    if (host.startsWith("::ffff:")) {
      const dotted = ipv6MappedToDotted(host.slice("::ffff:".length));
      // explicit Ollama exception: [::ffff:127.0.0.1] allowed only on port 11434
      if (dotted === "127.0.0.1" && u.port === "11434") {
        return { valid: true, sanitized: baseUrl, host: "127.0.0.1" };
      }
      // run the IPv4 private patterns on the converted v4 when conversion worked
      if (dotted && isPrivateHost(dotted)) return fail;
      // fail-closed: any other ::ffff: host (including unparseable ones) gets rejected
      return fail;
    }

    // Ollama exception — localhost / 127.0.0.1 / ::1 allowed ONLY on port 11434.
    // V18.3: applied AFTER the trailing-dot strip and numeric normalization so
    // "localhost." and numeric loopback forms can't dodge the port restriction.
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
      if (u.port !== "11434") return fail;
      return { valid: true, sanitized: baseUrl, host };
    }

    // block private/reserved IPs
    if (isPrivateHost(host)) return fail;

    // v1.1.2 (audit SEC-08-M): هاست عمومی → فقط https و فقط پورت 443 (یا پیش‌فرض)
    if (u.protocol !== "https:") return fail;
    if (u.port !== "" && u.port !== "443") return fail;

    return { valid: true, sanitized: baseUrl, host };
  } catch {
    return fail;
  }
}

/**
 * v1.1.2 (audit SEC-08-M): async wrapper — علاوه بر چک‌های متنی، host را از
 * DNS resolve می‌کند و همه‌ی IPهای resolved را هم روی private/reserved چک می‌کند.
 * این پنجره‌ی DNS-rebinding (TOCTOU بین validation و fetch) را می‌بندد؛ fetch
 * ممکن است دوباره resolve کند، اما rebinding حالا باید بین دو lookup با TTL کوتاه
 * هم‌زمان شود که در عمل غیرقابل تکیه است. هر فراخواننده‌ی async باید از این نسخه
 * استفاده کند.
 */
export async function validateBaseUrlAsync(baseUrl: string): Promise<{ valid: boolean; sanitized: string }> {
  const sync = validateBaseUrl(baseUrl);
  if (!sync.valid) return { valid: false, sanitized: "" };
  // v1.0 (audit W21-25 #1): استثنای Ollama — sync لایه localhost:11434 را قبول می‌کند
  // ولی async بعداً چون DNS آن به 127.0.0.1 resolve می‌شد رد می‌کرد ( contradictions؛
  // provider پیش‌فرض seed شده دقیقاً http://localhost:11434 است و همیشه fail می‌شد).
  // محدودیت پورت 11434 در sync اعمال شده — اینجا فقط ردِ private-IP را برای همین
  // استثنای خاص رد می‌کنیم.
  const isOllamaLoopbackException =
    (sync.host === "localhost" || sync.host.endsWith(".localhost")) ;
  if (isOllamaLoopbackException) return { valid: true, sanitized: sync.sanitized };
  // IP literal ها (dotted-decimal یا IPv6 با :) توسط چک‌های متنی بالا پوشش داده شده‌اند
  const isIpLiteral = /^\d{1,3}(\.\d{1,3}){3}$/.test(sync.host) || sync.host.includes(":");
  if (isIpLiteral) return { valid: true, sanitized: sync.sanitized };
  try {
    const dns = await import("dns");
    const lookup = dns.promises.lookup;
    const records = await lookup(sync.host, { all: true, verbatim: true });
    // fail-closed: hostname بدون هیچ رکورد A/AAAA را رد کن
    if (!records || records.length === 0) return { valid: false, sanitized: "" };
    for (const rec of records) {
      let addr = rec.address;
      if (addr.startsWith("[")) addr = addr.slice(1, -1);
      if (addr.startsWith("::ffff:")) {
        const dotted = ipv6MappedToDotted(addr.slice("::ffff:".length));
        if (dotted && isPrivateHost(dotted)) return { valid: false, sanitized: "" };
        if (!dotted) return { valid: false, sanitized: "" };
      } else if (isPrivateHost(addr)) {
        return { valid: false, sanitized: "" };
      }
    }
    return { valid: true, sanitized: sync.sanitized };
  } catch {
    // DNS failure → fail-closed (fetch هم در همین حالت شکست می‌خورد)
    return { valid: false, sanitized: "" };
  }
}
