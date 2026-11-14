// V1.1.1 (audit S4-H1 / S6-M5): harden IP extraction — fail-closed default.
//
// Old behaviour (v1.1): trusted client-controlled X-Forwarded-For / X-Real-IP
// unless TRUST_PROXY === "false" exactly. If the app was ever reachable without
// the trusted proxy (direct :3000, second CDN hop, unset env), every rate limit
// and IP block could be bypassed by rotating the header, and a victim's IP
// could be poisoned into BlockedIp (login lockout DoS).
//
// New behaviour:
// 1. Headers are trusted ONLY when TRUST_PROXY === "true" (deployments behind
//    our nginx/Caddy set this explicitly in .env / docker-compose / systemd).
// 2. Otherwise → "unknown" shared safe bucket (fail-closed; direct deployments
//    must bind to loopback — install.sh does HOSTNAME=127.0.0.1 + nginx proxy).
// 3. When trusted, prefer the LAST x-forwarded-for entry (appended by our own
//    proxy in both nginx $proxy_add_x_forwarded_for and Caddy), then fall back
//    to x-real-ip only when it is a syntactically valid IP.
// 4. IPv6 addresses are normalised to their /64 prefix as the rate-limit key —
//    a /128 is free to rotate, a /64 is the smallest routable allocation, so
//    rotating single IPv6 addresses can no longer bypass per-IP limits/blocks.
//    IPv4 is kept exact (/24 would cause CGNAT collateral damage).

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6_RE = /^[0-9a-fA-F:]{2,45}$/; // loose: hex digits + colons, used only as a rate-limit key

function isValidIp(value: string): boolean {
  const v = value.trim();
  const m = v.match(IPV4_RE);
  if (m) {
    return m.slice(1).every(oct => parseInt(oct, 10) <= 255);
  }
  if (v.includes(":")) {
    return IPV6_RE.test(v);
  }
  return false;
}

// v1.1.1 (S6-M5): normalise an IPv6 address to its /64 prefix so per-IP rate
// limits, daily caps and BlockedIp entries cannot be bypassed by rotating
// addresses inside the same /64. IPv4 passes through unchanged.
// Examples: 2001:db8:1234:5678:ab::1        → 2001:db8:1234:5678
//           ::ffff:203.0.113.7 (mapped v4) → 203.0.113.7
export function normalizeIpKey(ip: string): string {
  if (!ip || ip === "unknown") return ip;
  // IPv6-mapped IPv4 → use the dotted IPv4 (exact, not normalized)
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1];
  if (!ip.includes(":")) return ip; // IPv4 — keep exact

  // strip zone index and brackets, expand leading "::" padding conservatively
  let v = ip.replace(/^\[|\]$/g, "").split("%")[0];
  const groups = v.split(":");
  const fill = 8 - groups.filter(g => g !== "").length;
  const expanded: string[] = [];
  for (const g of groups) {
    if (g === "") {
      for (let i = 0; i < Math.max(fill, 1); i++) expanded.push("0");
    } else {
      expanded.push(g);
    }
  }
  // /64 = first 4 hextets
  return expanded.slice(0, 4).map(g => (parseInt(g, 16) || 0).toString(16)).join(":");
}

export function getClientIpSafe(request: Request): string {
  if (process.env.TRUST_PROXY !== "true") {
    // v1.1.1: fail-closed — never trust client-supplied headers by default.
    return "unknown";
  }

  // 1) rightmost XFF entry = appended by the trusted proxy chain
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map(s => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && isValidIp(last)) {
      return normalizeIpKey(last);
    }
  }

  // 2) x-real-ip — only if it parses as a real IP (nginx sets it correctly;
  //    Caddy is configured with `header_up X-Real-IP {remote_host}`)
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && isValidIp(xRealIp)) {
    return normalizeIpKey(xRealIp.trim());
  }

  return "unknown";
}
