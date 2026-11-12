// V1.1 (security pass 2): harden IP extraction.
// Old behaviour trusted x-real-ip FIRST and unconditionally — but Caddy does not
// set X-Real-IP, so a client-supplied header passed straight through and every
// rate limit / IP block could be bypassed by rotating the header.
//
// New behaviour:
// 1. TRUST_PROXY === "false"  → ignore all headers (direct exposure).
// 2. Prefer the LAST x-forwarded-for entry (appended by our own proxy in both
//    nginx $proxy_add_x_forwarded_for and Caddy default).
// 3. Fall back to x-real-ip only when it is a syntactically valid IP.
// 4. Anything else → "unknown" (shared safe bucket).

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

export function getClientIpSafe(request: Request): string {
  if (process.env.TRUST_PROXY === "false") {
    return "unknown";
  }

  // 1) rightmost XFF entry = appended by the trusted proxy chain
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map(s => s.trim()).filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && isValidIp(last)) {
      return last;
    }
  }

  // 2) x-real-ip — only if it parses as a real IP (nginx sets it correctly;
  //    Caddy is configured with `header_up X-Real-IP {remote_host}`)
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && isValidIp(xRealIp)) {
    return xRealIp.trim();
  }

  return "unknown";
}
