"use client";

import { useEffect, useState } from "react";

/**
 * ThemeBuilder — Create, edit, delete custom color themes.
 * Shows a live preview box that updates as you change colors.
 */

interface ThemeColors {
  id?: string;
  name: string;
  bg: string;
  bgSoft: string;
  bgPanel: string;
  bgPanel2: string;
  primary: string;
  primaryDim: string;
  primaryBright: string;
  text: string;
  textDim: string;
  textFaint: string;
  border: string;
  borderBright: string;
  accent: string;
  red: string;
  cyan: string;
  scanlines: boolean;
  visible: boolean;
}

const EMPTY_THEME: ThemeColors = {
  name: "New Theme",
  bg: "#0a0a0a", bgSoft: "#0f0f0f", bgPanel: "#141414", bgPanel2: "#1a1a1a",
  primary: "#00ff41", primaryDim: "#008f11", primaryBright: "#39ff14",
  text: "#c8ffc8", textDim: "#4a7a4a", textFaint: "#2a4a2a",
  border: "#1a3a1a", borderBright: "#2a6a2a",
  accent: "#ffb000", red: "#ff0040", cyan: "#00fff0",
  scanlines: false, visible: true,
};

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; desc: string }[] = [
  { key: "bg", label: "Background", desc: "Main page background" },
  { key: "bgSoft", label: "BG Soft", desc: "Alt section background" },
  { key: "bgPanel", label: "BG Panel", desc: "Card/panel background" },
  { key: "bgPanel2", label: "BG Panel 2", desc: "Secondary panel (bars, inputs)" },
  { key: "primary", label: "Primary", desc: "Main accent color" },
  { key: "primaryDim", label: "Primary Dim", desc: "Dimmed accent" },
  { key: "primaryBright", label: "Primary Bright", desc: "Headings, bright text" },
  { key: "text", label: "Text", desc: "Body text" },
  { key: "textDim", label: "Text Dim", desc: "Secondary text" },
  { key: "textFaint", label: "Text Faint", desc: "Very dim text" },
  { key: "border", label: "Border", desc: "Default border" },
  { key: "borderBright", label: "Border Bright", desc: "Hover/focus border" },
  { key: "accent", label: "Accent (Amber)", desc: "Secondary highlight" },
  { key: "red", label: "Red", desc: "Error/delete" },
  { key: "cyan", label: "Cyan", desc: "User messages in chat" },
];

export default function ThemeBuilder({ lang }: { lang: string }) {
  const [themes, setThemes] = useState<ThemeColors[]>([]);
  const [editing, setEditing] = useState<ThemeColors | null>(null);
  const [loading, setLoading] = useState(true);  const loadThemes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/themes?password=`);
      const data = await res.json();
      if (data.ok) setThemes(data.themes || []);
    } catch {}
    setLoading(false);
  };



   


  useEffect(() => { loadThemes(); }, []);

  const saveTheme = async (t: ThemeColors) => {
    const isNew = !t.id;
    const action = isNew ? "create" : "update";
    const payload: any = { action };
    if (!isNew) payload.id = t.id;
    payload.data = { ...t };
    delete payload.data.id;
    try {
      const res = await fetch("/api/admin/themes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setEditing(null);
        loadThemes();
      }
    } catch {}
  };

  const deleteTheme = async (id: string) => {
    if (!confirm("Delete this theme?")) return;
    await fetch("/api/admin/themes", {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ action: "delete", id }),
    });
    loadThemes();
  };

  const toggleTheme = async (id: string) => {
    await fetch("/api/admin/themes", {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ action: "toggle", id }),
    });
    loadThemes();
  };

  const fa = lang === "fa";

  return (
    <div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...EMPTY_THEME })}>
          + {fa ? "تم جدید" : "new theme"}
        </button>
        <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", alignSelf: "center" }}>
          {themes.length} {fa ? "تم سفارشی" : "custom themes"}
        </span>
      </div>

      {/* Editor */}
      {editing && (
        <div style={{
          border: "1px solid var(--border-bright)", padding: 16, marginBottom: 16,
          background: "var(--bg-panel)", display: "grid",
          gridTemplateColumns: "1fr 1fr", gap: 16,
        }}>
          {/* Left: color inputs */}
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                {fa ? "نام تم" : "Theme Name"}
              </label>
              <input
                type="text" value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                  color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "6px" }}
              />
            </div>
            {COLOR_FIELDS.map(f => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <input
                  type="color"
                  value={editing[f.key] as string}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  style={{ width: 30, height: 24, border: "1px solid var(--border)", cursor: "pointer", padding: 0, background: "none" }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", width: 80 }}>{f.label}</span>
                <input
                  type="text" value={editing[f.key] as string}
                  onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                  style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                    color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", padding: "4px" }}
                />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)", cursor: "pointer" }}>
                <input type="checkbox" checked={editing.scanlines}
                  onChange={(e) => setEditing({ ...editing, scanlines: e.target.checked })}
                  style={{ marginRight: 4 }}
                />
                {fa ? "خطوط اسکن CRT" : "CRT Scanlines"}
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={() => saveTheme(editing)}>
                {fa ? "ذخیره" : "save"}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>
                {fa ? "انصراف" : "cancel"}
              </button>
            </div>
          </div>

          {/* Right: live preview */}
          <div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginBottom: 8 }}>
              {fa ? "نمونه‌ی زنده" : "Live Preview"}
            </div>
            <div style={{
              background: editing.bg, border: `1px solid ${editing.borderBright}`,
              padding: 16, borderRadius: 2, minHeight: 200,
            }}>
              {editing.scanlines && (
                <div style={{
                  position: "absolute", inset: 0, pointerEvents: "none",
                  background: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(0,0,0,0.2) 3px, transparent 4px)",
                }} />
              )}
              <h4 style={{ color: editing.primaryBright, fontSize: "1rem", marginBottom: 8, textShadow: `0 0 8px ${editing.primary}55` }}>
                {editing.name || "Theme Name"}
              </h4>
              <p style={{ color: editing.text, fontSize: "0.8rem", marginBottom: 8 }}>
                {fa ? "این یه نمونه‌ی متنه تا رنگ‌ها رو ببینی." : "This is sample text to see the colors."}
              </p>
              <div style={{
                background: editing.bgPanel, border: `1px solid ${editing.border}`,
                padding: 8, marginBottom: 8,
              }}>
                <span style={{ color: editing.primary, fontSize: "0.75rem" }}>// panel</span>
                <p style={{ color: editing.textDim, fontSize: "0.7rem" }}>
                  {fa ? "متن کم‌رنگ توی پنل" : "dim text in panel"}
                </p>
              </div>
              <button style={{
                background: editing.primary, color: editing.bg, border: "none",
                padding: "4px 12px", fontFamily: "monospace", fontSize: "0.75rem",
                cursor: "pointer", boxShadow: `0 0 8px ${editing.primary}55`,
              }}>
                {fa ? "دکمه" : "button"}
              </button>
              <span style={{
                marginLeft: 8, color: editing.red, fontSize: "0.72rem",
              }}>
                {fa ? "خطا" : "error"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Theme list */}
      {loading ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>
      ) : themes.length === 0 ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
          {fa ? "هنوز تم سفارشی ساخته نشده. روی \"تم جدید\" بزن." : "No custom themes yet. Click \"new theme\"."}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {themes.map(t => (
            <div key={t.id} style={{
              border: "1px solid var(--border)", padding: 10,
              background: t.bg, position: "relative",
            }}>
              {/* Mini preview */}
              <div style={{
                background: t.bgPanel, border: `1px solid ${t.border}`,
                padding: 8, marginBottom: 8, minHeight: 60,
              }}>
                <div style={{ color: t.primaryBright, fontSize: "0.8rem", fontWeight: 600, textShadow: `0 0 6px ${t.primary}55` }}>
                  {t.name}
                </div>
                <div style={{ color: t.text, fontSize: "0.68rem" }}>
                  {fa ? "متن نمونه" : "sample text"}
                </div>
                <div style={{
                  background: t.primary, color: t.bg, display: "inline-block",
                  padding: "2px 6px", fontSize: "0.6rem", marginTop: 4,
                }}>
                  btn
                </div>
              </div>
              {/* Color dots */}
              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                {[t.primary, t.accent, t.red, t.cyan, t.borderBright].map((c, i) => (
                  <div key={i} style={{ width: 12, height: 12, background: c, border: `1px solid ${t.border}` }} />
                ))}
              </div>
              {/* Actions */}
              <div style={{ display: "flex", gap: 4 }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }}
                  onClick={() => setEditing({ ...t })}>
                  {fa ? "ویرایش" : "edit"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }}
                  onClick={() => toggleTheme(t.id!)}>
                  {t.visible ? (fa ? "مخفی" : "hide") : (fa ? "نمایش" : "show")}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px", color: "var(--red)" }}
                  onClick={() => deleteTheme(t.id!)}>
                  {fa ? "حذف" : "del"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
