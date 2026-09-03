"use client";

import { useEffect, useState } from "react";

/**
 * TextEditor — edit ALL text strings on the site from admin panel.
 * Each text has EN/FA/DE values.
 */

export default function TextEditor({ password, lang }: { password: string; lang: string }) {
  const [texts, setTexts] = useState<Record<string, { en: string; fa: string; de: string }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);  const loadTexts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/text?password=${password}`);
      const data = await res.json();
      if (data.ok) setTexts(data.texts || {});
    } catch {}
    setLoading(false);
  };



   


  useEffect(() => { loadTexts(); }, []);

  const saveText = async (key: string, val: { en: string; fa: string; de: string }) => {
    const res = await fetch("/api/admin/text", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "set", key, ...val }),
    });
    const data = await res.json();
    if (data.ok) {
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    }
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
      <input
        type="text"
        className="admin-search"
        placeholder={fa ? "جستجوی متن..." : "search text..."}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      />

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
