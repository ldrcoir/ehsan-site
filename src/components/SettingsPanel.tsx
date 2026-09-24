// ============================================================================
// SettingsPanel — تب تنظیمات کامل (تغییر رمز، نام، ایمیل، Bale، زبان)
// ============================================================================

"use client";

import { useEffect, useState } from "react";

type Settings = {
  forwardEmail: string;
  baleEnabled: string;
  baleBotToken: string;
  baleChatId: string;
};

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    forwardEmail: "",
    baleEnabled: "false",
    baleBotToken: "",
    baleChatId: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch("/api/admin/settings?password=", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setSettings({
          forwardEmail: data.forwardEmail || "",
          baleEnabled: data.baleEnabled || "false",
          baleBotToken: data.baleBotToken || "",
          baleChatId: data.baleChatId || "",
        });
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(newSettings: Partial<Settings>) {
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSettings),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("✅ ذخیره شد");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ خطا: " + (data.error || "نامشخص"));
      }
    } catch {
      setMessage("❌ خطای شبکه");
    }
  }

  async function changePassword() {
    if (newPassword.length < 6) {
      setMessage("❌ رمز حداقل ۶ کاراکتر");
      return;
    }
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: "", action: "change_password", newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("✅ رمز عوض شد");
        setNewPassword("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ " + (data.error || "خطا"));
      }
    } catch {
      setMessage("❌ خطای شبکه");
    }
  }

  async function changeHandle() {
    if (!newHandle.trim()) return;
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: "", action: "change_handle", newHandle }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("✅ نام کاربری عوض شد. صفحه رو refresh کن.");
        setNewHandle("");
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("❌ " + (data.error || "خطا"));
      }
    } catch {
      setMessage("❌ خطای شبکه");
    }
  }

  async function changeName() {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/admin/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password: "", action: "change_name", newName, lang: "fa" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage("✅ نام عوض شد. صفحه رو refresh کن.");
        setNewName("");
        setTimeout(() => setMessage(""), 5000);
      } else {
        setMessage("❌ " + (data.error || "خطا"));
      }
    } catch {
      setMessage("❌ خطای شبکه");
    }
  }

  if (loading) {
    return <div style={{ padding: 20, color: "var(--text-dim)" }}>در حال بارگذاری...</div>;
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--bg, #000)",
    border: "1px solid var(--border, #1a3a1a)",
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    color: "var(--text-dim, #4a7a4a)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "var(--bg-panel, #050505)",
    border: "1px solid var(--border, #1a3a1a)",
    color: "var(--primary-bright, #39ff14)",
    fontFamily: "monospace",
    fontSize: 13,
    borderRadius: 4,
    outline: "none",
    boxSizing: "border-box",
  };

  const btnStyle: React.CSSProperties = {
    padding: "8px 16px",
    background: "var(--primary, #00ff41)",
    color: "#000",
    border: "none",
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    cursor: "pointer",
    borderRadius: 4,
    marginTop: 8,
  };

  return (
    <div style={{ maxWidth: 600 }}>
      {message && (
        <div style={{
          padding: "10px 14px",
          marginBottom: 16,
          background: message.startsWith("✅") ? "rgba(0,255,65,0.1)" : "rgba(255,0,64,0.1)",
          border: `1px solid ${message.startsWith("✅") ? "var(--primary)" : "var(--red)"}`,
          borderRadius: 4,
          fontSize: 12,
          color: message.startsWith("✅") ? "var(--primary)" : "var(--red)",
        }}>
          {message}
        </div>
      )}

      {/* تغییر نام نمایشی */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--primary)", margin: "0 0 12px", fontSize: 14 }}>📝 تغییر نام</h4>
        <label style={labelStyle}>نام نمایشی (فارسی)</label>
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="نام جدید..."
          style={inputStyle}
        />
        <button onClick={changeName} style={btnStyle}>ذخیره نام</button>
      </div>

      {/* تغییر نام کاربری */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--primary)", margin: "0 0 12px", fontSize: 14 }}>👤 تغییر نام کاربری</h4>
        <label style={labelStyle}>نام کاربری (handle)</label>
        <input
          type="text"
          value={newHandle}
          onChange={e => setNewHandle(e.target.value)}
          placeholder="نام کاربری جدید..."
          style={inputStyle}
        />
        <button onClick={changeHandle} style={btnStyle}>ذخیره</button>
      </div>

      {/* تغییر رمز */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--primary)", margin: "0 0 12px", fontSize: 14 }}>🔐 تغییر رمز</h4>
        <label style={labelStyle}>رمز جدید (حداقل ۶ کاراکتر)</label>
        <div style={{ display: "flex", gap: 4 }}>
          <input
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="رمز جدید..."
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            style={{ padding: "0 12px", background: "var(--bg-panel)", border: "1px solid var(--border)", cursor: "pointer", borderRadius: 4, fontSize: 14 }}
          >👁</button>
        </div>
        <button onClick={changePassword} style={btnStyle}>تغییر رمز</button>
      </div>

      {/* ایمیل فوروارد */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--primary)", margin: "0 0 12px", fontSize: 14 }}>📧 ایمیل فوروارد</h4>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
          پیام‌های تماس به این ایمیل فوروارد می‌شن (از formsubmit.co — رایگان)
        </p>
        <label style={labelStyle}>ایمیل شما</label>
        <input
          type="email"
          value={settings.forwardEmail}
          onChange={e => setSettings({ ...settings, forwardEmail: e.target.value })}
          placeholder="your@email.com"
          style={inputStyle}
        />
        <button onClick={() => saveSettings({ forwardEmail: settings.forwardEmail })} style={btnStyle}>ذخیره ایمیل</button>
      </div>

      {/* Bale Bot */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--primary)", margin: "0 0 12px", fontSize: 14 }}>🤖 Bale Bot</h4>
        <p style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 10 }}>
          اعلان پیام‌های جدید رو به Bale می‌فرسته
        </p>
        <label style={labelStyle}>Bale Bot Token</label>
        <input
          type="text"
          value={settings.baleBotToken}
          onChange={e => setSettings({ ...settings, baleBotToken: e.target.value })}
          placeholder="123456789:ABCdef..."
          style={inputStyle}
        />
        <label style={{ ...labelStyle, marginTop: 10 }}>Bale Chat ID</label>
        <input
          type="text"
          value={settings.baleChatId}
          onChange={e => setSettings({ ...settings, baleChatId: e.target.value })}
          placeholder="123456789"
          style={inputStyle}
        />
        <button onClick={() => saveSettings({
          baleBotToken: settings.baleBotToken,
          baleChatId: settings.baleChatId,
          baleEnabled: settings.baleBotToken ? "true" : "false",
        })} style={btnStyle}>ذخیره Bale</button>
      </div>

      {/* راهنما */}
      <div style={cardStyle}>
        <h4 style={{ color: "var(--text-dim)", margin: "0 0 8px", fontSize: 12 }}>💡 راهنما</h4>
        <ul style={{ fontSize: 11, color: "var(--text-dim)", padding: "0 0 0 20px", lineHeight: 1.8 }}>
          <li>تغییر نام و نام کاربری بعد از refresh صفحه نمایش داده می‌شه</li>
          <li>برای ایمیل: اولین بار formsubmit.co یه ایمیل تأیید می‌فرسته</li>
          <li>برای Bale: token و chat ID رو از @botfather بگیر</li>
          <li>برای AI: فایل OLLAMA_GUIDE_FA.md رو بخون</li>
          <li>اگه رمز رو فراموش کردی: <code>sudo bash scripts/reset-admin-password.sh</code></li>
        </ul>
      </div>
    </div>
  );
}
