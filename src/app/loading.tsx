// ============================================================================
// loading.tsx — v1.0
// صفحه‌ی loading سراسری — اسپینر ترمینال‌مانند سبز (هویت بصری سایت).
// ============================================================================

export default function Loading() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #000)",
      color: "var(--green, #00ff41)",
      fontFamily: "monospace",
      fontSize: 14,
    }}>
      Loading...
    </div>
  );
}
