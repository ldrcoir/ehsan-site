// ============================================================================
// AccessUserManager — کامپوننت مدیریت کاربران AccessUser در پنل ادمین
// ============================================================================
// این کامپوننت به ادمین اجازه می‌ده:
// - لیست همه کاربران رو ببینه
// - کاربر جدید بسازه (با ساعت/روز دسترسی)
// - کاربر رو ویرایش یا حذف کنه
// - لاگ‌های دسترسی رو ببینه
//
// نکات:
// - این کامپوننت از admin session cookie استفاده می‌کنه که موقع login ادمین ست می‌شه
// - اگه ادمین هنوز با سیستم قدیمی (adminUser/adminPwd) لاگین کرده، اول باید
//   یه کاربر admin با /user-login بسازه و از اون به بعد از این کامپوننت استفاده کنه
// ============================================================================

"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  allowedHourStart: number | null;
  allowedHourEnd: number | null;
  allowedDays: string | null;
  expiresAt: string | null;
  active: boolean;
  loginCount: number;
  lastLoginAt: string | null;
  deactivatedReason: string;
  createdAt: string;
};

const DAY_NAMES = [
  { value: 0, label: "یکشنبه" },
  { value: 1, label: "دوشنبه" },
  { value: 2, label: "سه‌شنبه" },
  { value: 3, label: "چهارشنبه" },
  { value: 4, label: "پنجشنبه" },
  { value: 5, label: "جمعه" },
  { value: 6, label: "شنبه" },
];

export default function AccessUserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // فرم
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "user",
    allowedHourStart: "" as string | number,
    allowedHourEnd: "" as string | number,
    allowedDays: [] as number[],
    expiresAt: "",
    active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || "load_failed");
      }
    } catch (e) {
      setError("network_error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch("/api/admin/users/logs?limit=200", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs);
        setShowLogs(true);
      }
    } finally {
      setLogsLoading(false);
    }
  }

  function startEdit(user: User) {
    setEditingUser(user);
    setForm({
      username: user.username,
      password: "",
      displayName: user.displayName,
      role: user.role,
      allowedHourStart: user.allowedHourStart ?? "",
      allowedHourEnd: user.allowedHourEnd ?? "",
      allowedDays: user.allowedDays ? user.allowedDays.split(",").map(d => parseInt(d, 10)) : [],
      expiresAt: user.expiresAt ? new Date(user.expiresAt).toISOString().slice(0, 10) : "",
      active: user.active,
    });
    setShowForm(true);
  }

  function startNew() {
    setEditingUser(null);
    setForm({
      username: "",
      password: "",
      displayName: "",
      role: "user",
      allowedHourStart: "",
      allowedHourEnd: "",
      allowedDays: [],
      expiresAt: "",
      active: true,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: any = {
      username: form.username,
      password: form.password || undefined,
      displayName: form.displayName,
      role: form.role,
      allowedHourStart: form.allowedHourStart === "" ? null : Number(form.allowedHourStart),
      allowedHourEnd: form.allowedHourEnd === "" ? null : Number(form.allowedHourEnd),
      allowedDays: form.allowedDays.length > 0 ? form.allowedDays.join(",") : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: form.active,
    };

    try {
      const url = editingUser
        ? `/api/admin/users/${editingUser.id}`
        : "/api/admin/users";
      const method = editingUser ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        setShowForm(false);
        fetchUsers();
      } else {
        const msgs: Record<string, string> = {
          username_too_short: "نام کاربری خیلی کوتاه است (حداقل ۳ کاراکتر).",
          password_too_short: "رمز خیلی کوتاه است (حداقل ۶ کاراکتر).",
          username_exists: "این نام کاربری قبلاً گرفته شده.",
          invalid_hour_start: "ساعت شروع نامعتبر (۰-۲۳).",
          invalid_hour_end: "ساعت پایان نامعتبر (۰-۲۳).",
          unauthorized: "شما دسترسی ادمین ندارید. از /user-login وارد شوید.",
          cannot_deactivate_self: "نمی‌توانید خودتان را غیرفعال کنید.",
          cannot_delete_self: "نمی‌توانید خودتان را حذف کنید.",
          user_not_found: "کاربر یافت نشد.",
        };
        setError(msgs[data.error] || data.error || "خطا");
      }
    } catch {
      setError("network_error");
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`حذف کاربر "${user.username}"؟ این کار غیرقابل بازگشت است.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        fetchUsers();
      } else {
        const msgs: Record<string, string> = {
          cannot_delete_self: "نمی‌توانید خودتان را حذف کنید.",
          user_not_found: "کاربر یافت نشد.",
          unauthorized: "دسترسی غیرمجاز.",
        };
        alert(msgs[data.error] || data.error);
      }
    } catch {
      alert("خطای شبکه");
    }
  }

  function toggleDay(day: number) {
    setForm(prev => ({
      ...prev,
      allowedDays: prev.allowedDays.includes(day)
        ? prev.allowedDays.filter(d => d !== day)
        : [...prev.allowedDays, day],
    }));
  }

  if (loading) {
    return <div style={{ padding: 20, color: "var(--text-dim)" }}>در حال بارگذاری کاربران...</div>;
  }

  if (showLogs) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--primary)" }}>📋 Access Logs ({logs.length})</h3>
          <button onClick={() => setShowLogs(false)} className="signal-waveform-btn">← Back</button>
        </div>
        <div style={{ maxHeight: 500, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "var(--bg-panel2)", position: "sticky", top: 0 }}>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Time</th>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>User</th>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Action</th>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>IP</th>
                <th style={{ padding: 8, textAlign: "left", borderBottom: "1px solid var(--border)" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: 8, color: "var(--text-dim)" }}>{new Date(log.createdAt).toLocaleString("fa-IR")}</td>
                  <td style={{ padding: 8, color: "var(--primary-bright)" }}>{log.user?.username || "—"}</td>
                  <td style={{ padding: 8, color: getActionColor(log.action) }}>{log.action}</td>
                  <td style={{ padding: 8, color: "var(--text-dim)", fontFamily: "monospace" }}>{log.ip || "—"}</td>
                  <td style={{ padding: 8, color: "var(--text-dim)", fontSize: 10 }}>{log.details || "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "var(--text-faint)" }}>هیچ لاگی وجود ندارد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--primary)" }}>
            {editingUser ? `✏️ ویرایش: ${editingUser.username}` : "➕ کاربر جدید"}
          </h3>
          <button onClick={() => setShowForm(false)} className="signal-waveform-btn">✕ Cancel</button>
        </div>

        {error && (
          <div style={{ padding: 10, marginBottom: 16, background: "rgba(255,0,64,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 11, borderRadius: 4 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, maxWidth: 600 }}>
          <div>
            <label style={labelStyle}>Username (نام کاربری)</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              disabled={!!editingUser}
              required
              minLength={3}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password (رمز){editingUser ? " — خالی بذار اگه نمی‌خوای عوض کنی" : ""}</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required={!editingUser}
              minLength={6}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Display Name (نام نمایشی)</label>
            <input
              type="text"
              value={form.displayName}
              onChange={e => setForm({ ...form, displayName: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Role (نقش)</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={inputStyle}
            >
              <option value="user">user (عادی)</option>
              <option value="admin">admin (ادمین — دسترسی کامل)</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>ساعت شروع دسترسی (۰-۲۳)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.allowedHourStart}
                onChange={e => setForm({ ...form, allowedHourStart: e.target.value })}
                placeholder="مثلاً 9"
                style={inputStyle}
              />
              <small style={{ color: "var(--text-faint)", fontSize: 10 }}>خالی = بدون محدودیت</small>
            </div>
            <div>
              <label style={labelStyle}>ساعت پایان دسترسی (۰-۲۳)</label>
              <input
                type="number"
                min={0}
                max={23}
                value={form.allowedHourEnd}
                onChange={e => setForm({ ...form, allowedHourEnd: e.target.value })}
                placeholder="مثلاً 17"
                style={inputStyle}
              />
              <small style={{ color: "var(--text-faint)", fontSize: 10 }}>خالی = بدون محدودیت</small>
            </div>
          </div>

          <div>
            <label style={labelStyle}>روزهای مجاز</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {DAY_NAMES.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`signal-waveform-btn ${form.allowedDays.includes(day.value) ? "active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: 11 }}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <small style={{ color: "var(--text-faint)", fontSize: 10, display: "block", marginTop: 6 }}>
              هیچی انتخاب نکن = همه روزها
            </small>
          </div>

          <div>
            <label style={labelStyle}>تاریخ انقضا</label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
              style={inputStyle}
            />
            <small style={{ color: "var(--text-faint)", fontSize: 10, display: "block", marginTop: 4 }}>
              خالی = بدون انقضا
            </small>
          </div>

          <div>
            <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
              />
              Active (حساب فعال است)
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="submit" className="signal-waveform-btn active" style={{ flex: 1 }}>
              {editingUser ? "💾 ذخیره تغییرات" : "➕ ساخت کاربر"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="signal-waveform-btn">
              انصراف
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: "var(--primary)" }}>👥 Users ({users.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchLogs} disabled={logsLoading} className="signal-waveform-btn">
            {logsLoading ? "..." : "📋 Logs"}
          </button>
          <button onClick={startNew} className="signal-waveform-btn active">➕ New User</button>
        </div>
      </div>

      {error && (
        <div style={{ padding: 10, marginBottom: 16, background: "rgba(255,0,64,0.1)", border: "1px solid var(--red)", color: "var(--red)", fontSize: 11, borderRadius: 4 }}>
          {error}
          {error === "unauthorized" && (
            <div style={{ marginTop: 8 }}>
              <a href="/user-login" style={{ color: "var(--primary-bright)" }}>→ ورود ادمین</a>
            </div>
          )}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "var(--bg-panel2)", textAlign: "right" }}>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Hours</th>
              <th style={thStyle}>Days</th>
              <th style={thStyle}>Expires</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Last Login</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={tdStyle}>{user.username}</td>
                <td style={tdStyle}>{user.displayName || "—"}</td>
                <td style={tdStyle}>
                  <span style={{ color: user.role === "admin" ? "var(--amber)" : "var(--text-dim)" }}>
                    {user.role}
                  </span>
                </td>
                <td style={tdStyle}>
                  {user.allowedHourStart !== null && user.allowedHourEnd !== null
                    ? `${user.allowedHourStart}-${user.allowedHourEnd}`
                    : "24/7"}
                </td>
                <td style={tdStyle}>{user.allowedDays || "all"}</td>
                <td style={tdStyle}>
                  {user.expiresAt
                    ? new Date(user.expiresAt).toLocaleDateString("fa-IR")
                    : "—"}
                </td>
                <td style={tdStyle}>
                  {user.active ? "✅" : "❌"}
                </td>
                <td style={tdStyle}>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("fa-IR")
                    : "never"}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => startEdit(user)} className="signal-waveform-btn" style={{ padding: "4px 8px", marginRight: 4 }}>✏️</button>
                  <button onClick={() => handleDelete(user)} className="signal-waveform-btn" style={{ padding: "4px 8px" }}>🗑️</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 20, textAlign: "center", color: "var(--text-faint)" }}>هیچ کاربری وجود ندارد. اولین کاربر رو بساز.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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

const thStyle: React.CSSProperties = {
  padding: 8,
  borderBottom: "1px solid var(--border)",
  fontSize: 10,
  color: "var(--text-dim)",
  textTransform: "uppercase",
  letterSpacing: 1,
};

const tdStyle: React.CSSProperties = {
  padding: 8,
  fontSize: 11,
  color: "var(--text)",
};

function getActionColor(action: string): string {
  if (action === "login_success") return "var(--primary-bright)";
  if (action === "login_failed") return "var(--red)";
  if (action.startsWith("access_denied")) return "var(--amber)";
  if (action === "logout") return "var(--text-dim)";
  return "var(--text)";
}
