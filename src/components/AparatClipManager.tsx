// ============================================================================
// AparatClipManager — مدیریت کلیپ‌های آپارات (بدون password — از session استفاده می‌کنه)
// ============================================================================

"use client";

import { useEffect, useState } from "react";

type Clip = {
  id: string;
  title: string;
  embedCode: string;
  description: string;
  category: string;
  visible: boolean;
  order: number;
  createdAt: string;
};

export default function AparatClipManager() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Clip | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    embedCode: "",
    description: "",
    category: "general",
    visible: true,
    order: 0,
  });

  useEffect(() => {
    fetchClips();
  }, []);

  async function fetchClips() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/clips", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setClips(data.clips || []);
      } else {
        setError(data.error || "خطا در بارگذاری");
      }
    } catch (e) {
      setError("خطای شبکه");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body = {
      action: editing ? "update" : "create",
      id: editing?.id,
      ...form,
    };

    try {
      const res = await fetch("/api/admin/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        setEditing(null);
        setForm({ title: "", embedCode: "", description: "", category: "general", visible: true, order: 0 });
        fetchClips();
      } else {
        setError(data.error || "خطا در ذخیره");
      }
    } catch (e) {
      setError("خطای شبکه");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف این کلیپ؟")) return;
    try {
      await fetch("/api/admin/clips", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });
      fetchClips();
    } catch (e) {
      alert("خطا در حذف");
    }
  }

  function startEdit(clip: Clip) {
    setEditing(clip);
    setForm({
      title: clip.title,
      embedCode: clip.embedCode,
      description: clip.description,
      category: clip.category,
      visible: clip.visible,
      order: clip.order,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditing(null);
    setForm({ title: "", embedCode: "", description: "", category: "general", visible: true, order: 0 });
    setShowForm(true);
  }

  if (loading) {
    return <div style={{ padding: 20, color: "var(--text-dim)" }}>در حال بارگذاری...</div>;
  }

  if (showForm) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--primary)" }}>
            {editing ? `✏️ ویرایش: ${editing.title}` : "➕ کلیپ جدید"}
          </h3>
          <button onClick={() => setShowForm(false)} className="signal-waveform-btn">✕ انصراف</button>
        </div>

        {error && (
          <div style={{ padding: 10, marginBottom: 16, background: "rgba(255,0,64,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 11, borderRadius: 4 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, maxWidth: 600 }}>
          <div>
            <label style={labelStyle}>عنوان کلیپ</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              style={inputStyle}
              placeholder="مثلاً: آموزش React"
            />
          </div>

          <div>
            <label style={labelStyle}>کد امبد آپارات</label>
            <textarea
              value={form.embedCode}
              onChange={(e) => setForm({ ...form, embedCode: e.target.value })}
              required
              rows={4}
              style={inputStyle}
              placeholder='<iframe src="https://www.aparat.com/video/..." />'
            />
            <small style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 4, display: "block" }}>
              از سایت آپارات: اشتراک‌گذاری → جای‌گذاری در وبلاگ → کد رو کپی کن
            </small>
          </div>

          <div>
            <label style={labelStyle}>توضیحات</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>دسته‌بندی</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={inputStyle}
                placeholder="general"
              />
            </div>
            <div>
              <label style={labelStyle}>ترتیب</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.visible}
                onChange={(e) => setForm({ ...form, visible: e.target.checked })}
              />
              نمایش داده بشه
            </label>
          </div>

          <button type="submit" className="signal-waveform-btn active" style={{ padding: "12px", fontSize: 13 }}>
            {editing ? "💾 ذخیره تغییرات" : "➕ افزودن کلیپ"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: "var(--primary)" }}>🎬 کلیپ‌های آپارات ({clips.length})</h3>
        <button onClick={startNew} className="signal-waveform-btn active">➕ کلیپ جدید</button>
      </div>

      {error && (
        <div style={{ padding: 10, marginBottom: 16, background: "rgba(255,0,64,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 11, borderRadius: 4 }}>
          {error}
        </div>
      )}

      {clips.length === 0 ? (
        <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 40 }}>
          هنوز کلیپی اضافه نشده. روی «کلیپ جدید» کلیک کن.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {clips.map((clip) => (
            <div key={clip.id} style={{
              padding: 16,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              opacity: clip.visible ? 1 : 0.5,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <div>
                  <strong style={{ color: "var(--primary-bright)" }}>{clip.title}</strong>
                  <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-dim)" }}>
                    [{clip.category}] {clip.visible ? "🟢" : "🔴"}
                  </span>
                </div>
                <div>
                  <button onClick={() => startEdit(clip)} className="signal-waveform-btn" style={{ padding: "4px 8px", marginRight: 4 }}>✏️</button>
                  <button onClick={() => handleDelete(clip.id)} className="signal-waveform-btn" style={{ padding: "4px 8px" }}>🗑️</button>
                </div>
              </div>
              {clip.description && (
                <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "4px 0" }}>{clip.description}</p>
              )}
              <code style={{ fontSize: 9, color: "var(--text-faint)", display: "block", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
                {clip.embedCode.slice(0, 80)}...
              </code>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "var(--primary-bright)",
  fontFamily: "monospace",
  fontSize: 12,
  borderRadius: 4,
  outline: "none",
  boxSizing: "border-box",
};
