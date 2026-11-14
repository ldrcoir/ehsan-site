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

// FIX-2: fallback درون‌حافظه‌ای وقتی localStorage در دسترس نیست (private mode)
let fontMemoryFallback = "";

export default function FontSelector() {
  const [currentFont, setCurrentFont] = useState("vazirmatn");

  useEffect(() => {
    // FIX-2: read در try/catch — private mode کرش نمی‌کند
    let saved = "";
    try {
      saved = localStorage.getItem("site_font") || "";
    } catch {
      saved = fontMemoryFallback;
    }
    if (!saved) saved = "vazirmatn";
    setCurrentFont(saved);
    // V17.5: data-font رو روی mount هم اعمال کن (قبلاً فقط روی click اعمال می‌شد)
    document.documentElement.setAttribute("data-font", saved);
  }, []);

  // v1.0 (audit W16-20 #10): فونت پیش‌فرضِ سایت — قبل از این تب فقط localStorage
  // مرورگر را عوض می‌کرد؛ فونت واقعی سایت (defaultFont SiteSetting) فقط از تب
  // settings قابل تغییر بود. حالا با یک دکمه از همین‌جا هم ست می‌شود.
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // v1.0 (audit W21-25 #1 — HIGH): فرمت بدنه غلط بود — /api/admin/settings فقط
  // { settings: { key: value } } را می‌پذیرد؛ قبلاً { defaultFont } خام می‌فرستادیم و
  // سرور با 400 missing_settings رد می‌کرد → دکمه همیشه «❌ خطا» و هیچ‌چیز ذخیره نمی‌شد.
  async function setAsSiteDefault() {
    setSaveState("saving");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ settings: { defaultFont: currentFont } }),
      });
      const data = await res.json().catch(() => null);
      setSaveState(data?.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  function selectFont(fontId: string) {
    setCurrentFont(fontId);
    // FIX-2: write در try/catch با fallback درون‌حافظه‌ای
    try {
      localStorage.setItem("site_font", fontId);
    } catch {
      // storage unavailable — در حافظه‌ی همین tab نگه داشته می‌شود
    }
    fontMemoryFallback = fontId;
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
      <div style={{ marginBottom: 16 }}>
        <button onClick={setAsSiteDefault} className="signal-waveform-btn" disabled={saveState === "saving"}>
          {saveState === "saving" ? "..." : saveState === "saved" ? "✅ ثبت شد" : saveState === "error" ? "❌ خطا" : "🌐 ثبت به‌عنوان فونت پیش‌فرض سایت"}
        </button>
        <small style={{ display: "block", marginTop: 6, color: "var(--text-faint)", fontSize: 10 }}>
          برای همه‌ی بازدیدکننده‌ها (نیاز به دسترسی ادمین دارد)
        </small>
      </div>
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
