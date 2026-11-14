"use client";

import { useEffect, useState } from "react";

/**
 * NavMenuManager — Add/edit/delete/reorder navigation menu items.
 * v1.1.1 (audit P3): همه‌ی mutation ها حالا data.ok را چک می‌کنند و خطا نشان
 * می‌دهند — قبلاً هیچ feedback نبود و شکست‌ها بی‌صدا بودند (لیست خالی).
 */

export default function NavMenuManager({ lang }: { lang: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [errMsg, setErrMsg] = useState("");
  const fa = lang === "fa";

  const navPost = async (payload: any): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/admin/nav", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) return { ok: true };
      return { ok: false, error: (data && data.error) || `HTTP ${res.status}` };
    } catch {
      return { ok: false, error: "network error" };
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/nav`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setItems(data.items || []);
        setErrMsg("");
      } else {
        setErrMsg((data && data.error === "unauthorized") ? (fa ? "دسترسی ندارید — دوباره وارد شوید" : "unauthorized — please log in again") : `load failed (${(data && data.error) || res.status})`);
      }
    } catch {
      setErrMsg(fa ? "خطای شبکه" : "network error");
    }
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
    const result = await navPost(payload);
    if (!result.ok) {
      setErrMsg((fa ? "ذخیره ناموفق: " : "Save failed: ") + result.error);
      return;
    }
    setErrMsg("");
    setEditing(null);
    loadItems();
  };

  const del = async (id: string) => {
    if (!confirm(fa ? "حذف؟" : "Delete?")) return;
    const result = await navPost({ action: "delete", id });
    if (!result.ok) {
      setErrMsg((fa ? "حذف ناموفق: " : "Delete failed: ") + result.error);
      return;
    }
    setErrMsg("");
    loadItems();
  };

  const toggle = async (id: string) => {
    const result = await navPost({ action: "toggle", id });
    if (!result.ok) {
      setErrMsg((fa ? "عملیات ناموفق: " : "Toggle failed: ") + result.error);
      return;
    }
    setErrMsg("");
    loadItems();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex(i => i.id === id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= items.length) return;
    // FIX: ترتیب کامل جدید از لیست محلی محاسبه می‌شود — قبلاً دو update مستقل با
    // orderهای همدیگر فرستاده می‌شد و وقتی دو آیتم order برابر داشتند (مثلاً هر دو ۹۹)
    // جابجایی عملاً no-op می‌شد و UI با سرور هماهنگ نمی‌ماند.
    const reordered = [...items];
    const [moved] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, moved);

    // اگر در لیست order تکراری وجود دارد (ambiguity)، برای حذف ابهام «همه» آیتم‌ها
    // با order = index خودشان در لیست جدید persist می‌شوند؛ وگرنه فقط دو آیتمِ
    // جابجاشده با مقدار index جدیدشان کافی است.
    const orders = items.map(i => Number(i.order));
    const hasDuplicateOrders = new Set(orders).size !== orders.length;
    const updates = hasDuplicateOrders
      ? reordered.map((it, i) => ({ id: it.id, order: i }))
      : [
          { id: moved.id, order: newIdx },
          { id: items[newIdx].id, order: idx },
        ];

    const results = await Promise.all(
      updates.map(u => navPost({ action: "update", id: u.id, data: { order: u.order } }))
    );
    const failed = results.find(r => !r.ok);
    if (failed) {
      setErrMsg((fa ? "جابجایی ناموفق: " : "Reorder failed: ") + (failed.error || ""));
    } else {
      setErrMsg("");
    }
    // FIX: حتی در صورت شکستِ partial هم reload — تا UI با وضعیت واقعی سرور sync بماند
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

      {errMsg && (
        <div style={{ border: "1px solid var(--red, #ff0040)", color: "var(--red, #ff0040)", padding: "8px 12px", marginBottom: 12, fontSize: 12, borderRadius: 4 }}>
          ⚠ {errMsg}
        </div>
      )}

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
