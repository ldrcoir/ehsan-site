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
  permissions: string | null;
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

const PERMISSION_SECTIONS = [
  { id: "messages", label: "📨 پیام‌ها" },
  { id: "clips", label: "🎬 کلیپ‌ها" },
  { id: "content", label: "📁 محتوا" },
  { id: "text", label: "📝 متن‌ها" },
  { id: "nav", label: "🧭 منو" },
  { id: "themes", label: "🎨 تم‌ها" },
];

// v1.0 (RBAC cleanup): نقش‌های ارشد — هم‌سو با ROLES در src/lib/rbac.ts
// owner بالاتر از admin است و فقط از خود سرور ساخته می‌شود؛ در UI فقط نمایش داده می‌شود
const ELEVATED_ROLES = new Set(["owner", "admin"]);

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
  // v1.0 (RBAC cleanup): نقش کاربرِ واردشده — تعیین می‌کند کدام دکمه‌ها/گزینه‌ها رندر شوند
  // (اعمال واقعی قواعد همیشه سمت سرور در /api/admin/users انجام می‌شود؛ این فقط UI است)
  const [viewerRole, setViewerRole] = useState<string>("user");
  // نام کاربری وقتی لاگ‌ها برای یک کاربر خاص فیلتر شدن (برای عنوان پنل)
  const [logsUser, setLogsUser] = useState("");

  // فرم
  const [form, setForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "user",
    allowedHourStart: "" as string | number,
    allowedHourEnd: "" as string | number,
    allowedDays: [] as number[],
    permissions: [] as string[],
    expiresAt: "",
    active: true,
  });
  // v1.2: دیدن/ندیدن رمز هنگام تایپ (چشم) — قبلاً فقط type=password بود و ادمین
  // نمی‌توانست رمزی که تایپ یا تولید کرده را ببیند
  const [showPassword, setShowPassword] = useState(false);
  // v1.2: بعد از ذخیره‌ی موفق با رمز جدید، رمز یک بار به‌صورت متن باز نشان داده می‌شود
  // (بسته‌ی تأیید با دکمه‌ی کپی) تا ادمین آن را برای کاربر بفرستد و بعد ببندد
  const [passwordSaved, setPasswordSaved] = useState<null | { username: string; password: string }>(null);

  useEffect(() => {
    fetchUsers();
    // v1.0 (RBAC cleanup): نقش کاربر فعلی را می‌خوانیم تا UI هم‌سو با قواعد سرور باشد
    fetch("/api/user/verify", { cache: "no-store", credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d?.ok && d?.user?.role) setViewerRole(d.user.role); })
      .catch(() => {});
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store", credentials: "include" });
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
      const res = await fetch("/api/admin/users/logs?limit=200", { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs);
        setLogsUser("");
        setShowLogs(true);
      } else {
        setError(data.error || "load_failed");
      }
    } catch {
      // (a) قبلاً فقط try/finally بود — شکست شبکه بی‌صدا بود
      setError("network_error");
    } finally {
      setLogsLoading(false);
    }
  }

  // (b) لاگ‌های یک کاربر خاص — GET /api/admin/users/logs?userId=<id>
  // Response shape (تأییدشده در route): { ok: true, logs, total }
  async function fetchUserLogs(user: User) {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/admin/users/logs?userId=${encodeURIComponent(user.id)}&limit=200`, { cache: "no-store", credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs);
        setLogsUser(user.username);
        setShowLogs(true);
      } else {
        setError(data.error || "load_failed");
      }
    } catch {
      setError("network_error");
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
      permissions: user.permissions ? user.permissions.split(",").filter(Boolean) : [],
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
      permissions: [],
      expiresAt: "",
      active: true,
    });
    setShowForm(true);
  }

  // v1.2: تولید رمز قوی (۱۶ کاراکتر — حروف بزرگ/کوچک + عدد + نماد بدون ابهام)
  // با crypto.getRandomValues — بدون هیچ سمتِ سرور؛ رمز فقط در همین مرورگر ساخته می‌شود
  function generateStrongPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_+=";
    const bytes = new Uint32Array(16);
    crypto.getRandomValues(bytes);
    let out = "";
    for (let i = 0; i < 16; i++) out += chars[bytes[i] % chars.length];
    return out;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordChanged = form.password.length > 0;
    const body: any = {
      username: form.username,
      password: form.password || undefined,
      displayName: form.displayName,
      role: form.role,
      allowedHourStart: form.allowedHourStart === "" ? null : Number(form.allowedHourStart),
      allowedHourEnd: form.allowedHourEnd === "" ? null : Number(form.allowedHourEnd),
      allowedDays: form.allowedDays.length > 0 ? form.allowedDays.join(",") : null,
      permissions: form.permissions.length > 0 ? form.permissions.join(",") : null,
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
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        // v1.0: اگه رمز ست/عوض شد، فرم بسته شود و پنل نمایش یک‌بارِ رمز باز شود
        // (audit W56-60 #1: قبلاً setShowForm(false) فراموش شده بود و پنل رمز
        // هرگز دیده نمی‌شد چون early-return فرم جلوتر بود)
        if (passwordChanged) {
          setShowForm(false);
          setPasswordSaved({ username: form.username, password: form.password });
          setForm(prev => ({ ...prev, password: "" }));
          setShowPassword(false);
        } else {
          setShowForm(false);
        }
        fetchUsers();
      } else {
        const msgs: Record<string, string> = {
          username_too_short: "نام کاربری خیلی کوتاه است (حداقل ۳ کاراکتر).",
          password_too_short: "رمز خیلی کوتاه است (ادمین: حداقل ۱۲، کاربر: حداقل ۸ کاراکتر).",
          password_too_long: "رمز خیلی طولانی است (حداکثر ۱۲۸ کاراکتر).",
          username_exists: "این نام کاربری قبلاً گرفته شده.",
          invalid_hour_start: "ساعت شروع نامعتبر (۰-۲۳).",
          invalid_hour_end: "ساعت پایان نامعتبر (۰-۲۳).",
          invalid_hour: "ساعت نامعتبر (۰-۲۳).",
          invalid_date: "تاریخ انقضا نامعتبر است.",
          unauthorized: "شما دسترسی ادمین ندارید. از /user-login وارد شوید.",
          cannot_deactivate_self: "نمی‌توانید خودتان را غیرفعال کنید.",
          cannot_delete_self: "نمی‌توانید خودتان را حذف کنید.",
          cannot_demote_self: "نمی‌توانید نقش خودتان را تنزل دهید.",
          cannot_demote_last_admin: "آخرین ادمین فعال را نمی‌توان تنزل داد.",
          cannot_delete_last_admin: "آخرین ادمین فعال را نمی‌توان حذف کرد.",
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
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", credentials: "include" });
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
          <h3 style={{ margin: 0, color: "var(--primary)" }}>
            {logsUser ? `📋 Access Logs — ${logsUser} (${logs.length})` : `📋 Access Logs (${logs.length})`}
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            {logsUser && (
              <button onClick={() => fetchLogs()} disabled={logsLoading} className="signal-waveform-btn">Show all</button>
            )}
            <button onClick={() => { setShowLogs(false); setLogsUser(""); }} className="signal-waveform-btn">← Back</button>
          </div>
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
              required
              minLength={3}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Password (رمز){editingUser ? " — خالی بذار اگه نمی‌خوای عوض کنی" : ""}</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required={!editingUser}
                // v1.0 (audit W56-60 #7): قاعده‌ی سمت کلاینت هم‌مثل سرور — ادمین ۱۲، کاربر ۸
              minLength={ELEVATED_ROLES.has(form.role) ? 12 : 8}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="signal-waveform-btn"
                title={showPassword ? "پنهان کردن رمز" : "دیدن رمز"}
                style={{ padding: "8px 10px", fontSize: 13, whiteSpace: "nowrap" }}
              >
                {showPassword ? "🙈 پنهان" : "👁 دیدن"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const pw = generateStrongPassword();
                  setForm(prev => ({ ...prev, password: pw }));
                  setShowPassword(true);
                }}
                className="signal-waveform-btn"
                title="تولید رمز قوی تصادفی (۱۶ کاراکتر)"
                style={{ padding: "8px 10px", fontSize: 11, whiteSpace: "nowrap" }}
              >
                🎲 تولید رمز قوی
              </button>
            </div>
            <small style={{ color: "var(--text-faint)", fontSize: 10, display: "block", marginTop: 4 }}>
              {form.password.length > 0
                ? `طول رمز: ${form.password.length} کاراکتر${ELEVATED_ROLES.has(form.role) ? " (ادمین/مالک: حداقل ۱۲)" : " (حداقل ۸)"} — با دکمه‌ی 👁 می‌توانی رمز را ببینی`
                : "حداقل: ادمین ۱۲ و کاربر عادی ۸ کاراکتر — یا با 🎲 رمز قوی بساز"}
            </small>
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
            {/* v1.0 (RBAC cleanup): ساخت ادمین فقط برای owner — هم‌سو با قاعده‌ی
                only_owner_creates_admin سمت سرور؛ نقش owner هرگز از API ساخته نمی‌شود */}
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              style={inputStyle}
            >
              <option value="user">user (عادی)</option>
              {viewerRole === "owner" && (
                <option value="admin">admin (ادمین — دسترسی کامل)</option>
              )}
            </select>
            {viewerRole !== "owner" && (
              <small style={{ color: "var(--text-faint)", fontSize: 10, display: "block", marginTop: 4 }}>
                ساخت ادمین فقط برای مالک سایت (Owner) — هم‌سو با قواعد RBAC سرور
              </small>
            )}
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

          {/* انتخاب دسترسی‌های بخش‌بندی */}
          {form.role === "user" && (
            <div>
              <label style={labelStyle}>دسترسی به بخش‌ها</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                {PERMISSION_SECTIONS.map(perm => (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        permissions: prev.permissions.includes(perm.id)
                          ? prev.permissions.filter(p => p !== perm.id)
                          : [...prev.permissions, perm.id],
                      }));
                    }}
                    className={`signal-waveform-btn ${form.permissions.includes(perm.id) ? "active" : ""}`}
                    style={{ padding: "6px 10px", fontSize: 10 }}
                  >
                    {perm.label}
                  </button>
                ))}
              </div>
              <small style={{ color: "var(--text-faint)", fontSize: 10, display: "block", marginTop: 6 }}>
                هیچی انتخاب نکن = فقط داشبورد. ادمین به همه بخش‌ها دسترسی داره.
              </small>
            </div>
          )}

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

  // ==========================================================================
  // v1.2: نمایش یک‌باره‌ی رمز بعد از ذخیره — ادمین باید رمز جدید را ببیند تا
  // برای کاربر بفرستد. اینجا فرم بسته شده ولی تا فشردن «ذخیره کردم» باز می‌ماند.
  // ==========================================================================
  if (passwordSaved) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: "var(--primary-bright)" }}>✅ رمز با موفقیت ذخیره شد</h3>
        </div>
        <div style={{ padding: 16, background: "rgba(0,255,128,0.06)", border: "1px solid var(--primary)", borderRadius: 4, maxWidth: 600 }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
            رمز جدیدِ کاربر <b style={{ color: "var(--primary-bright)" }}>{passwordSaved.username}</b> — فقط همین یک بار نمایش داده می‌شود (سرور آن را هش‌شده نگه می‌دارد و دیگر نمی‌توان بازیابی‌اش کرد):
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code
              id="new-pw-value"
              style={{ flex: 1, padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, fontFamily: "monospace", fontSize: 14, color: "var(--primary-bright)", userSelect: "all", wordBreak: "break-all" }}
            >
              {passwordSaved.password}
            </code>
            <button
              className="signal-waveform-btn"
              onClick={() => {
                navigator.clipboard?.writeText(passwordSaved.password).catch(() => {});
              }}
              style={{ padding: "10px 12px", whiteSpace: "nowrap" }}
            >
              📋 کپی
            </button>
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              className="signal-waveform-btn active"
              style={{ flex: 1 }}
              onClick={() => setPasswordSaved(null)}
            >
              ذخیره کردم، ببند
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: "var(--primary)" }}>👥 Users ({users.length})</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => fetchLogs()} disabled={logsLoading} className="signal-waveform-btn">
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
              <th style={thStyle}>Logins</th>
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
                  {/* v1.0 (RBAC cleanup): برچسب فارسی + رنگ نقش owner */}
                  <span style={{ color: user.role === "owner" ? "var(--primary-bright)" : user.role === "admin" ? "var(--amber)" : "var(--text-dim)" }}>
                    {user.role === "owner" ? "owner (مالک) 👑" : user.role}
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
                <td style={tdStyle}>{typeof user.loginCount === "number" ? user.loginCount.toLocaleString("fa-IR") : "—"}</td>
                <td style={tdStyle}>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("fa-IR")
                    : "never"}
                </td>
                <td style={tdStyle}>
                  <button onClick={() => fetchUserLogs(user)} disabled={logsLoading} className="signal-waveform-btn" style={{ padding: "4px 8px", marginRight: 4 }}>📋</button>
                  {/* v1.0 (RBAC cleanup): دکمه‌های ویرایش/حذف برای حساب owner و حساب‌های
                      خارج از محدوده‌ی نقشِ بیننده رندر نمی‌شوند — سرور هم 403 می‌دهد */}
                  {viewerRole === "owner" && user.role !== "owner" && (
                    <button onClick={() => startEdit(user)} className="signal-waveform-btn" style={{ padding: "4px 8px", marginRight: 4 }}>✏️</button>
                  )}
                  {viewerRole === "owner" && user.role !== "owner" && (
                    <button onClick={() => handleDelete(user)} className="signal-waveform-btn" style={{ padding: "4px 8px" }}>🗑️</button>
                  )}
                  {viewerRole !== "owner" && user.role === "user" && (
                    <button onClick={() => startEdit(user)} className="signal-waveform-btn" style={{ padding: "4px 8px", marginRight: 4 }}>✏️</button>
                  )}
                  {viewerRole !== "owner" && user.role === "user" && (
                    <button onClick={() => handleDelete(user)} className="signal-waveform-btn" style={{ padding: "4px 8px" }}>🗑️</button>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={10} style={{ padding: 20, textAlign: "center", color: "var(--text-faint)" }}>هیچ کاربری وجود ندارد. اولین کاربر رو بساز.</td></tr>
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
