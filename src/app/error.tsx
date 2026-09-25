"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

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
      <div style={{ maxWidth: 600, textAlign: "center" }}>
        <h1 style={{ fontSize: 24, color: "#ff0040", marginBottom: 16 }}>⚠️</h1>
        <h2 style={{ fontSize: 16, color: "var(--green, #00ff41)", marginBottom: 12 }}>
          خطا در بارگذاری صفحه
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-dim, #4a7a4a)", marginBottom: 24, lineHeight: 1.6 }}>
          لطفاً صفحه را refresh کنید. اگه مشکل ادامه داشت، با مدیر سایت تماس بگیرید.
        </p>
        <pre style={{
          fontSize: 11,
          color: "var(--text-faint, #2a4a2a)",
          background: "var(--bg-panel, #050d05)",
          padding: 12,
          borderRadius: 4,
          overflow: "auto",
          textAlign: "left",
          direction: "ltr",
          border: "1px solid var(--border, #1a3a1a)",
        }}>
          {error.message || "Unknown error"}
        </pre>
        <button
          onClick={reset}
          style={{
            marginTop: 24,
            padding: "10px 20px",
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
          }}
        >
          تلاش مجدد
        </button>
      </div>
    </div>
  );
}
