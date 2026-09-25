import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #000)",
      color: "var(--green, #00ff41)",
      fontFamily: "monospace",
      padding: 20,
    }}>
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <h1 style={{
          fontSize: 72,
          margin: 0,
          color: "var(--green, #00ff41)",
          textShadow: "0 0 20px rgba(0,255,65,0.5)",
        }}>
          404
        </h1>
        <h2 style={{
          fontSize: 16,
          margin: "16px 0",
          color: "var(--text, #c8ffc8)",
          textTransform: "uppercase",
          letterSpacing: 2,
        }}>
          صفحه پیدا نشد
        </h2>
        <p style={{
          fontSize: 12,
          color: "var(--text-dim, #4a7a4a)",
          marginBottom: 32,
          lineHeight: 1.6,
        }}>
          صفحه‌ای که دنبالش بودید وجود نداره یا منتقل شده.
        </p>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "var(--green, #00ff41)",
            color: "#000",
            border: "none",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "bold",
            cursor: "pointer",
            borderRadius: 4,
            textTransform: "uppercase",
            letterSpacing: 1,
            textDecoration: "none",
          }}
        >
          ← بازگشت به خانه
        </Link>
      </div>
    </div>
  );
}
