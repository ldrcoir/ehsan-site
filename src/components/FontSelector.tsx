// ============================================================================
// FontSelector — انتخاب فونت سایت از پنل ادمین
// ============================================================================
// کاربر می‌تونه از بین ۵ فونت مختلف انتخاب کنه. انتخاب تو localStorage
// ذخیره می‌شه و با یه attribute روی <html> اعمال می‌شه.
// ============================================================================

"use client";

import { useEffect, useState } from "react";

const FONTS = [
  { id: "vazirmatn", label: "Vazirmatn", desc: "فارسی - پیش‌فرض" },
  { id: "inter", label: "Inter", desc: "مدرن انگلیسی" },
  { id: "lora", label: "Lora", desc: "سریف کلاسیک" },
  { id: "fira-code", label: "Fira Code", desc: "مونو اسپیس" },
  { id: "geist-mono", label: "Geist Mono", desc: "مونو اسپیس مدرن" },
];

export default function FontSelector() {
  const [currentFont, setCurrentFont] = useState("vazirmatn");

  useEffect(() => {
    const saved = localStorage.getItem("site_font") || "vazirmatn";
    setCurrentFont(saved);
    // V17.5: data-font رو روی mount هم اعمال کن (قبلاً فقط روی click اعمال می‌شد)
    document.documentElement.setAttribute("data-font", saved);
  }, []);

  function selectFont(fontId: string) {
    setCurrentFont(fontId);
    localStorage.setItem("site_font", fontId);
    document.documentElement.setAttribute("data-font", fontId);
  }

  return (
    <div style={{ padding: 20, background: "var(--bg-panel)", borderRadius: 8 }}>
      <h3 style={{
        margin: "0 0 16px",
        color: "var(--primary)",
        fontSize: 18,
        textTransform: "uppercase",
        letterSpacing: 1,
      }}>
        🔤 Font Selector
      </h3>
      <p style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 16 }}>
        فونت سایت رو انتخاب کن. انتخاب تو مرورگر ذخیره می‌شه.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FONTS.map(font => (
          <button
            key={font.id}
            onClick={() => selectFont(font.id)}
            className={`signal-waveform-btn ${currentFont === font.id ? "active" : ""}`}
            style={{
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              textAlign: "left",
            }}
          >
            <span style={{ fontWeight: "bold", fontSize: 14 }}>{font.label}</span>
            <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{font.desc}</span>
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16, padding: 12, background: "var(--bg)", borderRadius: 4, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 4 }}>پیش‌نمایش:</div>
        <div style={{ fontSize: 16 }}>
          سلام دنیا! Hello World! 12345
        </div>
      </div>
    </div>
  );
}
