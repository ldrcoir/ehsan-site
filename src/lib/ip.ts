// V18.2: Shared IP extraction — prefer x-real-ip (nginx-set, unspoofable)
// x-forwarded-for is trusted only as fallback (may be spoofed by client)

export function getClientIpSafe(request: Request): string {
  // Priority: x-real-ip (set by nginx) > x-forwarded-for LAST entry (set by trusted proxy chain) > connection
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp && xRealIp.trim()) {
    return xRealIp.trim();
  }
  // x-forwarded-for: take the LAST entry (rightmost = set by our trusted proxy, not the client)
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      // Use the last entry — this is what our nginx proxy appended
      return parts[parts.length - 1];
    }
  }
  return "unknown";
}
