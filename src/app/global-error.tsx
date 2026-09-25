"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "monospace",
        background: "#000",
        color: "#00ff41",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          maxWidth: 600,
          padding: 32,
          textAlign: "center",
        }}>
          <h1 style={{ fontSize: 24, marginBottom: 16, color: "#ff0040" }}>⚠️ خطای بحرانی</h1>
          <p style={{ fontSize: 14, color: "#4a7a4a", marginBottom: 24, lineHeight: 1.6 }}>
            متأسفانه خطای غیرمنتظره‌ای رخ داد. لطفاً صفحه را refresh کنید یا با مدیر سایت تماس بگیرید.
          </p>
          <pre style={{
            fontSize: 11,
            color: "#2a4a2a",
            background: "#050d05",
            padding: 12,
            borderRadius: 4,
            overflow: "auto",
            textAlign: "left",
            direction: "ltr",
            border: "1px solid #1a3a1a",
          }}>
            {error.message || "Unknown error"}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 20px",
              background: "#00ff41",
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
      </body>
    </html>
  );
}
