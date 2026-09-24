"use client";

import { useEffect, useState } from "react";

type ContentType = "book" | "article" | "tutorial" | "skill" | "aiInstruction" | "equipment";

interface Item { id?: string; [key: string]: any; }

export default function ContentManager({ lang }: { lang: string }) {
  const [activeType, setActiveType] = useState<ContentType>("tutorial");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const typeLabels: Record<ContentType, { en: string; fa: string }> = {
    book: { en: "Books", fa: "کتاب‌ها" },
    article: { en: "Articles", fa: "مقالات" },
    tutorial: { en: "Tutorials", fa: "آموزش‌ها" },
    skill: { en: "Skills", fa: "مهارت‌ها" },
    aiInstruction: { en: "AI Rules", fa: "قواعد AI" },
    equipment: { en: "Equipment", fa: "تجهیزات" },
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const endpoint = activeType === "equipment" ? "equipment" : "content";
      const res = await fetch(`/api/admin/${endpoint}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        // API برمی‌گردونه: { books, articles, tutorials, skills, aiInstructions }
        // برای equipment: { items: [...] }
        if (activeType === "equipment") {
          setItems(data.items || []);
        } else {
          const keyMap: Record<string, string> = {
            book: "books",
            article: "articles",
            tutorial: "tutorials",
            skill: "skills",
            aiInstruction: "aiInstructions",
          };
          const arrKey = keyMap[activeType] || "";
          setItems(data[arrKey] || []);
        }
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    }
    setLoading(false);
  };

   
   

  useEffect(() => { loadItems(); }, [activeType]);

  const saveItem = async (item: Item) => {
    const isNew = !item.id;
    const action = isNew ? "create" : "update";
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    const payload: any = { type: activeType, action };
    if (!isNew) payload.id = item.id;
    payload.data = { ...item };
    delete payload.data.id; delete payload.data.createdAt; delete payload.data.updatedAt;
    if (payload.data.specs && typeof payload.data.specs === "object") {
      payload.data.specs = JSON.stringify(payload.data.specs);
    }
    try {
      await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      setEditing(null); loadItems();
    } catch {}
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete?")) return;
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    await fetch(`/api/admin/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ type: activeType, action: "delete", id }),
    });
    loadItems();
  };

  const toggleItem = async (id: string) => {
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    await fetch(`/api/admin/${endpoint}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ type: activeType, action: "toggle", id }),
    });
    loadItems();
  };

  const bulkImport = async () => {
    try {
      const parsed = JSON.parse(bulkText);
      if (!Array.isArray(parsed)) { alert("Must be JSON array"); return; }
      const endpoint = activeType === "equipment" ? "equipment" : "content";
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: activeType, action: "bulk_import", items: parsed }),
      });
      const data = await res.json();
      if (data.ok) {
        alert(`Imported ${data.created} of ${data.total}`);
        setBulkText(""); setShowBulk(false); loadItems();
      }
    } catch { alert("Invalid JSON"); }
  };

  const getEmptyItem = (): Item => {
    if (activeType === "equipment") return { name: "", model: "", category: "general", status: "online", description: "", specs: "", visible: true, order: 0 };
    if (activeType === "book") return { titleEn: "", year: "2025", publisherEn: "", descEn: "", cover: "linear-gradient(135deg,#003b00,#00ff41)", link: "#", visible: true, order: 0 };
    if (activeType === "article") return { titleEn: "", venueEn: "", date: "2025-01", typeEn: "Article", summaryEn: "", link: "#", visible: true, order: 0 };
    if (activeType === "tutorial") return { titleEn: "", duration: "00:00", levelEn: "Beginner", descEn: "", embedUrl: "", platform: "aparat", visible: true, order: 0 };
    if (activeType === "skill") return { categoryEn: "", items: "", visible: true, order: 0 };
    return { name: "", content: "", enabled: true, order: 0 };
  };

  const fields: Record<ContentType, { key: string; label: string; type: string }[]> = {
    equipment: [
      { key: "name", label: "Name", type: "text" },
      { key: "model", label: "Model", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "status", label: "Status (online/standby/offline)", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "specs", label: "Specs (JSON)", type: "textarea" },
      { key: "order", label: "Order", type: "number" },
    ],
    book: [
      { key: "titleEn", label: "Title (EN)", type: "text" },
      { key: "titleFa", label: "Title (FA)", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "publisherEn", label: "Publisher (EN)", type: "text" },
      { key: "descEn", label: "Description (EN)", type: "textarea" },
      { key: "cover", label: "Cover (CSS gradient)", type: "text" },
      { key: "link", label: "Link", type: "text" },
      { key: "order", label: "Order", type: "number" },
    ],
    article: [
      { key: "titleEn", label: "Title (EN)", type: "text" },
      { key: "venueEn", label: "Venue (EN)", type: "text" },
      { key: "date", label: "Date (YYYY-MM)", type: "text" },
      { key: "typeEn", label: "Type (EN)", type: "text" },
      { key: "summaryEn", label: "Summary (EN)", type: "textarea" },
      { key: "link", label: "Link", type: "text" },
      { key: "order", label: "Order", type: "number" },
    ],
    tutorial: [
      { key: "titleEn", label: "Title (EN)", type: "text" },
      { key: "titleFa", label: "Title (FA)", type: "text" },
      { key: "duration", label: "Duration (mm:ss)", type: "text" },
      { key: "levelEn", label: "Level (EN)", type: "text" },
      { key: "embedUrl", label: "Embed URL", type: "text" },
      { key: "descEn", label: "Description (EN)", type: "textarea" },
      { key: "order", label: "Order", type: "number" },
    ],
    skill: [
      { key: "categoryEn", label: "Category (EN)", type: "text" },
      { key: "categoryFa", label: "Category (FA)", type: "text" },
      { key: "items", label: "Items (comma-separated)", type: "textarea" },
      { key: "order", label: "Order", type: "number" },
    ],
    aiInstruction: [
      { key: "name", label: "Name", type: "text" },
      { key: "content", label: "Instruction Content", type: "textarea" },
      { key: "order", label: "Order", type: "number" },
    ],
  };

  return (
    <div>
      <div className="admin-tabs">
        {(Object.keys(typeLabels) as ContentType[]).map(t => (
          <button key={t} className={`admin-tab ${activeType === t ? "active" : ""}`}
            onClick={() => { setActiveType(t); setEditing(null); }}>
            {lang === "fa" ? typeLabels[t].fa : typeLabels[t].en}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(getEmptyItem())}>+ add</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(!showBulk)}>bulk import</button>
        <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", alignSelf: "center" }}>{items.length} items</span>
      </div>

      {showBulk && (
        <div className="admin-reply-box" style={{ marginBottom: 16 }}>
          <label>JSON array of items:</label>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
            placeholder='[{"titleEn":"Item 1",...}]' rows={6}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.8rem" }} />
          <button className="btn btn-primary btn-sm" onClick={bulkImport} style={{ marginTop: 8 }}>import</button>
        </div>
      )}

      {editing && (
        <div className="admin-reply-box" style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--green-bright)", fontSize: "0.85rem" }}>
            {editing.id ? "edit" : "create"} {typeLabels[activeType].en}
          </label>
          {fields[activeType].map(f => (
            <div key={f.key} style={{ marginBottom: 8 }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>{f.label}</label>
              {f.type === "textarea" ? (
                <textarea value={editing[f.key] || ""} onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })} rows={2}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "6px" }} />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} value={editing[f.key] || ""}
                  onChange={(e) => setEditing({ ...editing, [f.key]: f.type === "number" ? parseInt(e.target.value) || 0 : e.target.value })}
                  style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "var(--green-bright)", fontFamily: "var(--font-mono)", fontSize: "0.8rem", padding: "6px" }} />
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => saveItem(editing)}>save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>No items yet.</p>
      ) : (
        <div className="admin-messages">
          {items.map(item => (
            <div key={item.id} className="admin-message">
              <div className="admin-message-head">
                <span>{item.titleEn || item.name || item.categoryEn || `#${(item.id || "").slice(-6)}`}</span>
                <span>{item.visible === false || item.enabled === false ? "🔴 " : "🟢 "}{item.year || item.date || item.duration || item.model || ""}</span>
              </div>
              <div className="admin-message-text" style={{ fontSize: "0.78rem" }}>
                {item.embedUrl && <div>URL: {item.embedUrl.slice(0, 60)}...</div>}
                {item.items && <div>Items: {item.items.slice(0, 80)}...</div>}
                {item.content && <div>{item.content.slice(0, 100)}...</div>}
                {item.descEn && <div>{item.descEn.slice(0, 100)}</div>}
                {item.description && <div>{item.description}</div>}
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ ...item })}>edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleItem(item.id || "")}>{item.visible === false || item.enabled === false ? "show" : "hide"}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => deleteItem(item.id || "")} style={{ color: "var(--red)" }}>delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
