"use client";

// ============================================================================
// ContentManager.tsx — v1.0
// ContentManager — تب مدیریت محتوای پنل ادمین (CRUD کتاب/مقاله/آموزش/مهارت/قواعد AI)
// با فیلدهای سه‌زبانه و به‌روزرسانی زنده.
// ============================================================================

import { useEffect, useRef, useState } from "react";

type ContentType = "book" | "article" | "tutorial" | "skill" | "aiInstruction" | "equipment";

interface Item { id?: string; [key: string]: any; }

export default function ContentManager({ lang, viewerRole }: { lang: string; viewerRole?: string }) {
  const [activeType, setActiveType] = useState<ContentType>("tutorial");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  // v1.1 (robustness): وضعیت خطا — قبلاً هر شکستی بی‌صدا بود و ادیتور بسته می‌شد
  const [errMsg, setErrMsg] = useState("");

  const typeLabels: Record<ContentType, { en: string; fa: string }> = {
    book: { en: "Books", fa: "کتاب‌ها" },
    article: { en: "Articles", fa: "مقالات" },
    tutorial: { en: "Tutorials", fa: "آموزش‌ها" },
    skill: { en: "Skills", fa: "مهارت‌ها" },
    aiInstruction: { en: "AI Rules", fa: "قواعد AI" },
    equipment: { en: "Equipment", fa: "تجهیزات" },
  };

  // FIX: درخواست‌های loadItems قابل لغو هستند — load قبلی (مثلاً از activeType قبلی)
  // هنگام load جدید یا unmount لغو و پاسخ stale نادیده گرفته می‌شود
  const loadAbortRef = useRef<AbortController | null>(null);

  const loadItems = async () => {
    loadAbortRef.current?.abort();
    const controller = new AbortController();
    loadAbortRef.current = controller;
    setLoading(true);
    try {
      const endpoint = activeType === "equipment" ? "equipment" : "content";
      const res = await fetch(`/api/admin/${endpoint}`, { credentials: "include", signal: controller.signal });
      const data = await res.json();
      if (controller.signal.aborted) return; // پاسخ کهنه از type قبلی — نادیده
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
        setErrMsg("");
      } else {
        // v1.1: خطا را از «خالی بودن واقعی» متمایز کن
        setErrMsg(data.error === "unauthorized" ? "unauthorized — please log in again" : `load failed (${data.error || res.status})`);
      }
    } catch {
      if (controller.signal.aborted) return; // AbortError — نادیده بگیر
      setErrMsg("network error while loading");
    }
    if (!controller.signal.aborted) setLoading(false);
  };

  // FIX: export JSON — دانلود آیتم‌های بارگذاری‌شده‌ی type فعال
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ehsan-${activeType}-export.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    loadItems();
    return () => { loadAbortRef.current?.abort(); }; // FIX: cleanup → abort
  }, [activeType]);

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
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        // v1.1: خطا نمایش بده و ادیتور را باز نگه دار — محتوا از دست نرود
        setErrMsg(data.error === "unauthorized" ? "unauthorized — please log in again" : `save failed (${data.error || res.status})`);
        return;
      }
      setErrMsg("");
      setEditing(null); loadItems();
    } catch {
      setErrMsg("network error while saving");
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete?")) return;
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include",
        body: JSON.stringify({ type: activeType, action: "delete", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) setErrMsg(`delete failed (${data.error || res.status})`);
      else setErrMsg("");
    } catch {
      setErrMsg("network error while deleting");
    }
    loadItems();
  };

  const toggleItem = async (id: string) => {
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "include",
        body: JSON.stringify({ type: activeType, action: "toggle", id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) setErrMsg(`toggle failed (${data.error || res.status})`);
      else setErrMsg("");
    } catch {
      setErrMsg("network error while toggling");
    }
    loadItems();
  };

  const bulkImport = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(bulkText);
    } catch {
      alert("Invalid JSON");
      return;
    }
    if (!Array.isArray(parsed)) { alert("Must be JSON array"); return; }
    const endpoint = activeType === "equipment" ? "equipment" : "content";
    try {
      const res = await fetch(`/api/admin/${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: activeType, action: "bulk_import", items: parsed }),
      });
      const data = await res.json();
      // v1.1.1 (audit P3/Q1): خطای bulk_import دیگر بی‌صدا نیست — قبلاً else
      // هیچ کاری نمی‌کرد و catch مشترک شبکه را "Invalid JSON" گزارش می‌داد
      if (data && data.ok) {
        const failedInfo = data.failed > 0 ? ` — FAILED: ${data.failed}${Array.isArray(data.errors) && data.errors.length ? "\n" + data.errors.join("\n") : ""}` : "";
        alert(`Imported ${data.created} of ${data.total}${failedInfo}`);
        setBulkText(""); setShowBulk(false); loadItems();
      } else {
        alert("Import failed: " + ((data && (data.error || data.detail)) || `HTTP ${res.status}`));
      }
    } catch {
      alert("Network error during import");
    }
  };

  const getEmptyItem = (): Item => {
    if (activeType === "equipment") return { name: "", model: "", category: "general", status: "online", description: "", specs: "", visible: true, order: 0 };
    // v1.1.1 (audit P1-G4): همه‌ی فیلدهای FA/DE که سایت عمومی رندر می‌کند اضافه شدند
    if (activeType === "book") return { titleEn: "", titleFa: "", titleDe: "", year: "2025", publisherEn: "", publisherFa: "", publisherDe: "", descEn: "", descFa: "", descDe: "", cover: "linear-gradient(135deg,#003b00,#00ff41)", link: "#", visible: true, order: 0 };
    if (activeType === "article") return { titleEn: "", titleFa: "", titleDe: "", venueEn: "", venueFa: "", venueDe: "", date: "2025-01", typeEn: "Article", typeFa: "", typeDe: "", summaryEn: "", summaryFa: "", summaryDe: "", link: "#", visible: true, order: 0 };
    if (activeType === "tutorial") return { titleEn: "", titleFa: "", titleDe: "", duration: "00:00", levelEn: "Beginner", levelFa: "", levelDe: "", descEn: "", descFa: "", descDe: "", embedUrl: "", platform: "aparat", playlist: "", visible: true, order: 0 };
    if (activeType === "skill") return { categoryEn: "", categoryFa: "", categoryDe: "", items: "", visible: true, order: 0 };
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
      { key: "titleDe", label: "Title (DE)", type: "text" },
      { key: "year", label: "Year", type: "text" },
      { key: "publisherEn", label: "Publisher (EN)", type: "text" },
      { key: "publisherFa", label: "Publisher (FA)", type: "text" },
      { key: "publisherDe", label: "Publisher (DE)", type: "text" },
      { key: "descEn", label: "Description (EN)", type: "textarea" },
      { key: "descFa", label: "Description (FA)", type: "textarea" },
      { key: "descDe", label: "Description (DE)", type: "textarea" },
      { key: "cover", label: "Cover (CSS gradient)", type: "text" },
      { key: "link", label: "Link", type: "text" },
      { key: "order", label: "Order", type: "number" },
    ],
    article: [
      { key: "titleEn", label: "Title (EN)", type: "text" },
      { key: "titleFa", label: "Title (FA)", type: "text" },
      { key: "titleDe", label: "Title (DE)", type: "text" },
      { key: "venueEn", label: "Venue (EN)", type: "text" },
      { key: "venueFa", label: "Venue (FA)", type: "text" },
      { key: "venueDe", label: "Venue (DE)", type: "text" },
      { key: "date", label: "Date (YYYY-MM)", type: "text" },
      { key: "typeEn", label: "Type (EN)", type: "text" },
      { key: "typeFa", label: "Type (FA)", type: "text" },
      { key: "typeDe", label: "Type (DE)", type: "text" },
      { key: "summaryEn", label: "Summary (EN)", type: "textarea" },
      { key: "summaryFa", label: "Summary (FA)", type: "textarea" },
      { key: "summaryDe", label: "Summary (DE)", type: "textarea" },
      { key: "link", label: "Link", type: "text" },
      { key: "order", label: "Order", type: "number" },
    ],
    tutorial: [
      { key: "titleEn", label: "Title (EN)", type: "text" },
      { key: "titleFa", label: "Title (FA)", type: "text" },
      { key: "titleDe", label: "Title (DE)", type: "text" },
      { key: "duration", label: "Duration (mm:ss)", type: "text" },
      { key: "levelEn", label: "Level (EN)", type: "text" },
      { key: "levelFa", label: "Level (FA)", type: "text" },
      { key: "levelDe", label: "Level (DE)", type: "text" },
      { key: "embedUrl", label: "Embed URL", type: "text" },
      { key: "platform", label: "Platform (aparat/youtube/…)", type: "text" },
      { key: "playlist", label: "Playlist", type: "text" },
      { key: "descEn", label: "Description (EN)", type: "textarea" },
      { key: "descFa", label: "Description (FA)", type: "textarea" },
      { key: "descDe", label: "Description (DE)", type: "textarea" },
      { key: "order", label: "Order", type: "number" },
    ],
    skill: [
      { key: "categoryEn", label: "Category (EN)", type: "text" },
      { key: "categoryFa", label: "Category (FA)", type: "text" },
      { key: "categoryDe", label: "Category (DE)", type: "text" },
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
        {(Object.keys(typeLabels) as ContentType[]).map(t => {
          // v1.0 rev3 (audit PANEL-b B4): تب قواعد AI برای کاربر limited پنهان می‌شود —
          // سرور نوشتن/خواندن ai.* را برای non-elevated بسته (403)؛ UI هم دیگر گمراه نمی‌کند
          if (t === "aiInstruction" && viewerRole && viewerRole !== "owner" && viewerRole !== "admin") {
            return null;
          }
          return (
            <button key={t} className={`admin-tab ${activeType === t ? "active" : ""}`}
              onClick={() => { setActiveType(t); setEditing(null); }}>
              {lang === "fa" ? typeLabels[t].fa : typeLabels[t].en}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(getEmptyItem())}>+ add</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowBulk(!showBulk)}>bulk import</button>
        {/* FIX: export JSON — دانلود آیتم‌های بارگذاری‌شده‌ی type فعال */}
        <button className="btn btn-ghost btn-sm" onClick={exportJson} disabled={items.length === 0}>export JSON</button>
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
                <input type={f.type === "number" ? "number" : "text"} value={editing[f.key] ?? ""}
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

      {errMsg && (
        <div style={{ border: "1px solid var(--red, #ff0040)", color: "var(--red, #ff0040)", padding: "8px 12px", marginBottom: 12, fontSize: 12, borderRadius: 4 }}>
          ⚠ {errMsg}
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>{errMsg ? "—" : "No items yet."}</p>
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
                {/* v1.1.1 (audit P3): specs/items ممکن است object/array باشند (GET آن‌ها را
                    parse کرده) — هنگام باز شدن ادیتور به string تبدیل می‌شوند؛ وگرنه
                    textarea مقدار [object Object] می‌گرفت و ذخیره داده را خراب می‌کرد */}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const copy: Item = { ...item };
                    if (activeType === "equipment" && copy.specs && typeof copy.specs !== "string") {
                      copy.specs = JSON.stringify(copy.specs, null, 2);
                    }
                    if (activeType === "skill" && Array.isArray(copy.items)) {
                      copy.items = (copy.items as string[]).join(", ");
                    }
                    setEditing(copy);
                  }}
                >
                  edit
                </button>
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
