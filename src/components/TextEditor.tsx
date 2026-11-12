"use client";

import { useEffect, useState } from "react";

/**
 * TextEditor — edit ALL text strings on the site from admin panel.
 * Each text has EN/FA/DE values.
 */

export default function TextEditor({ lang }: { lang: string }) {
  const [texts, setTexts] = useState<Record<string, { en: string; fa: string; de: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  // v1.1 (robustness): خطاها بی‌صدا نباشند
  const [errMsg, setErrMsg] = useState("");
  const loadTexts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/text`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) { setTexts(data.texts || {}); setErrMsg(""); }
      else setErrMsg(`load failed (${data.error || res.status})`);
    } catch {
      setErrMsg("network error while loading");
    }
    setLoading(false);
  };



   


  useEffect(() => { loadTexts(); }, []);

  const saveText = async (key: string, val: { en: string; fa: string; de: string }) => {
    try {
      const res = await fetch("/api/admin/text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "set",
          key,
          valueEn: val.en,
          valueFa: val.fa,
          valueDe: val.de,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setErrMsg("");
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      } else {
        setErrMsg(`save failed (${data.error || res.status})`);
      }
    } catch {
      setErrMsg("network error while saving");
    }
  };

  // V1.1: delete a text key (server + local state)
  const deleteText = async (key: string) => {
    const sure = window.confirm(
      fa
        ? `کلید «${key}» حذف شود؟ (سایت به مقدار پیش‌فرض برمی‌گرده)`
        : `Delete key "${key}"? (the site falls back to its default value)`
    );
    if (!sure) return;
    try {
      const res = await fetch("/api/admin/text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "delete", key }),
      });
      const data = await res.json();
      if (data.ok) {
        setTexts(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    } catch {}
  };

  // V1.1: add a new key (editable row — saved via the row's save button)
  const addNewKey = () => {
    const key = (window.prompt(
      fa
        ? "نام کلید جدید (مثلاً about.p3):"
        : "New key name (e.g. about.p3):"
    ) || "").trim();
    if (!key) return;
    if (!/^[a-z0-9.\-]+$/i.test(key)) {
      window.alert(
        fa
          ? "نام کلید نامعتبر است — فقط حروف، رقم، نقطه و خط تیره"
          : "Invalid key — only letters, digits, dots and dashes are allowed"
      );
      return;
    }
    if (texts[key]) {
      window.alert(fa ? `کلید «${key}» از قبل وجود دارد` : `Key "${key}" already exists`);
      return;
    }
    setTexts(prev => ({ ...prev, [key]: { en: "", fa: "", de: "" } }));
    setFilter(""); // make sure the new section is visible
  };

  const updateValue = (key: string, lang: string, value: string) => {
    setTexts(prev => ({
      ...prev,
      [key]: { ...prev[key], [lang]: value },
    }));
  };

  // Group texts by section
  const groups: Record<string, string[]> = {};
  Object.keys(texts).forEach(key => {
    const section = key.split(".")[0];
    if (!groups[section]) groups[section] = [];
    groups[section].push(key);
  });

  const filteredGroups = Object.keys(groups).filter(section => {
    if (!filter) return true;
    return section.includes(filter.toLowerCase()) ||
      groups[section].some(k => k.includes(filter.toLowerCase()) || texts[k].en.includes(filter));
  });

  const fa = lang === "fa";

  if (loading) {
    return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>;
  }

  return (
    <div>
      {errMsg && (
        <div style={{ border: "1px solid var(--red, #ff0040)", color: "var(--red, #ff0040)", padding: "8px 12px", marginBottom: 12, fontSize: 12, borderRadius: 4 }}>
          ⚠ {errMsg}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <input
          type="text"
          className="admin-search"
          placeholder={fa ? "جستجوی متن..." : "search text..."}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ marginBottom: 0, flex: 1 }}
        />
        {/* V1.1: add a brand-new editable key */}
        <button
          className="btn btn-primary btn-sm"
          style={{ fontSize: "0.72rem", padding: "6px 10px", whiteSpace: "nowrap" }}
          onClick={addNewKey}
        >
          ➕ {fa ? "کلید جدید" : "New key"}
        </button>
      </div>

      {filteredGroups.map(section => (
        <div key={section} style={{ marginBottom: 24 }}>
          <h4 style={{
            color: "var(--green-bright)", fontSize: "0.85rem",
            fontFamily: "var(--font-mono)", marginBottom: 10,
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {section}
          </h4>
          {groups[section].filter(key => {
            if (!filter) return true;
            return key.includes(filter.toLowerCase()) ||
              (texts[key]?.en || "").includes(filter) ||
              (texts[key]?.fa || "").includes(filter);
          }).map(key => (
            <div key={key} style={{
              border: "1px solid var(--border)", padding: 10, marginBottom: 8,
              background: "var(--bg-panel)",
            }}>
              <div style={{
                fontSize: "0.68rem", color: "var(--text-dim)",
                fontFamily: "var(--font-mono)", marginBottom: 6,
              }}>
                {key}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <div>
                  <label style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>EN</label>
                  <textarea
                    value={texts[key]?.en || ""}
                    onChange={(e) => updateValue(key, "en", e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      color: "var(--green-bright)", fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem", padding: "4px", resize: "vertical",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>FA</label>
                  <textarea
                    value={texts[key]?.fa || ""}
                    onChange={(e) => updateValue(key, "fa", e.target.value)}
                    rows={2}
                    dir="rtl"
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      color: "var(--green-bright)", fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem", padding: "4px", resize: "vertical",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.6rem", color: "var(--text-faint)" }}>DE</label>
                  <textarea
                    value={texts[key]?.de || ""}
                    onChange={(e) => updateValue(key, "de", e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", background: "var(--bg)", border: "1px solid var(--border)",
                      color: "var(--green-bright)", fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem", padding: "4px", resize: "vertical",
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: "0.68rem", padding: "3px 8px" }}
                  onClick={() => saveText(key, texts[key] || { en: "", fa: "", de: "" })}
                >
                  {fa ? "ذخیره" : "save"}
                </button>
                {savedKey === key && (
                  <span style={{ fontSize: "0.68rem", color: "var(--green-bright)" }}>
                    ✓ {fa ? "ذخیره شد" : "saved"}
                  </span>
                )}
                {/* V1.1: delete this key */}
                <button
                  className="btn btn-sm"
                  style={{
                    fontSize: "0.68rem", padding: "3px 8px", marginLeft: "auto",
                    background: "transparent", border: "1px solid var(--red, #ff0040)",
                    color: "var(--red, #ff0040)", cursor: "pointer",
                  }}
                  title={fa ? "حذف کلید" : "Delete key"}
                  onClick={() => deleteText(key)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {filteredGroups.length === 0 && (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>
          {fa ? "متن مورد نظر یافت نشد" : "No text found"}
        </p>
      )}
    </div>
  );
}
