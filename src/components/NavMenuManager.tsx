"use client";

import { useEffect, useState } from "react";

/**
 * NavMenuManager — Add/edit/delete/reorder navigation menu items.
 */

export default function NavMenuManager({ lang }: { lang: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const fa = lang === "fa";  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/nav?password=`);
      const data = await res.json();
      if (data.ok) setItems(data.items || []);
    } catch {}
    setLoading(false);
  };



   


  useEffect(() => { loadItems(); }, []);

  const save = async (item: any) => {
    const isNew = !item.id;
    const action = isNew ? "create" : "update";
    const payload: any = { action };
    if (!isNew) payload.id = item.id;
    payload.data = { ...item };
    delete payload.data.id; delete payload.data.createdAt; delete payload.data.updatedAt;
    await fetch("/api/admin/nav", {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify(payload),
    });
    setEditing(null);
    loadItems();
  };

  const del = async (id: string) => {
    if (!confirm(fa ? "حذف؟" : "Delete?")) return;
    await fetch("/api/admin/nav", {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ action: "delete", id }),
    });
    loadItems();
  };

  const toggle = async (id: string) => {
    await fetch("/api/admin/nav", {
      method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ action: "toggle", id }),
    });
    loadItems();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex(i => i.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= items.length) return;
    // Swap orders
    const a = items[idx];
    const b = items[newIdx];
    await Promise.all([
      fetch("/api/admin/nav", { method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update", id: a.id, data: { order: b.order } }) }),
      fetch("/api/admin/nav", { method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "update", id: b.id, data: { order: a.order } }) }),
    ]);
    loadItems();
  };

  const empty = { labelEn: "", labelFa: "", labelDe: "", href: "#", target: "_self", visible: true, order: 99 };

  if (loading) return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ ...empty })}>+ {fa ? "منوی جدید" : "new item"}</button>
        <span style={{ color: "var(--text-dim)", fontSize: "0.78rem", alignSelf: "center" }}>{items.length} {fa ? "آیتم" : "items"}</span>
      </div>

      {editing && (
        <div className="admin-reply-box" style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--green-bright)", fontSize: "0.85rem" }}>
            {editing.id ? (fa ? "ویرایش" : "edit") : (fa ? "ایجاد" : "create")} {fa ? "منو" : "menu item"}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8 }}>
            <input placeholder="Label EN" value={editing.labelEn || ""} onChange={e => setEditing({ ...editing, labelEn: e.target.value })} style={inputStyle} />
            <input placeholder="Label FA" value={editing.labelFa || ""} onChange={e => setEditing({ ...editing, labelFa: e.target.value })} style={inputStyle} dir="rtl" />
            <input placeholder="Label DE" value={editing.labelDe || ""} onChange={e => setEditing({ ...editing, labelDe: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8, marginTop: 8 }}>
            <input placeholder="Link (e.g. #about or https://...)" value={editing.href || ""} onChange={e => setEditing({ ...editing, href: e.target.value })} style={inputStyle} />
            <select value={editing.target || "_self"} onChange={e => setEditing({ ...editing, target: e.target.value })} style={inputStyle}>
              <option value="_self">{fa ? "همون صفحه" : "same page"}</option>
              <option value="_blank">{fa ? "تب جدید" : "new tab"}</option>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => save(editing)}>{fa ? "ذخیره" : "save"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>{fa ? "انصراف" : "cancel"}</button>
          </div>
        </div>
      )}

      {items.map((item, i) => (
        <div key={item.id} className="admin-message" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <span style={{ color: item.visible ? "var(--green-bright)" : "var(--text-dim)", fontWeight: 600, fontSize: "0.85rem" }}>
              {item.visible ? "● " : "○ "}{item.labelEn || item.labelFa}
            </span>
            <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginLeft: 8 }}>
              {item.href} {item.target === "_blank" ? "(new tab)" : ""}
            </span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }} onClick={() => move(item.id, -1)} disabled={i === 0}>↑</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }} onClick={() => move(item.id, 1)} disabled={i === items.length - 1}>↓</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }} onClick={() => setEditing({ ...item })}>{fa ? "ویرایش" : "edit"}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px" }} onClick={() => toggle(item.id)}>{item.visible ? (fa ? "مخفی" : "hide") : (fa ? "نمایش" : "show")}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "3px 6px", color: "var(--red)" }} onClick={() => del(item.id)}>{fa ? "حذف" : "del"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg)", border: "1px solid var(--border)",
  color: "var(--green-bright)", fontFamily: "var(--font-mono)",
  fontSize: "0.78rem", padding: "6px",
};
