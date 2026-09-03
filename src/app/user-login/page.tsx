// ============================================================================
// /user-login — صفحه ورود کاربران AccessUser
// ============================================================================
// کاربر اینجا username + password رو وارد می‌کنه. اگه موفق باشه، به /user-dashboard
// منتقل می‌شه. اگه ناموفق باشه، پیام خطا نشون داده می‌شه.
// ============================================================================

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function UserLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push("/user-dashboard");
      } else {
        const err = data.error || "server_error";
        const msgs: Record<string, string> = {
          invalid_credentials: "نام کاربری یا رمز اشتباه است.",
          account_inactive: "حساب شما غیرفعال است.",
          account_expired: "حساب شما منقضی شده است.",
          missing_fields: "همه فیلدها را پر کنید.",
          server_error: "خطای سرور. دوباره تلاش کنید.",
        };
        setError(msgs[err] || "خطای ناشناخته.");
      }
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="user-auth-page" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg, #000)",
      color: "var(--text, #c8ffc8)",
      fontFamily: "monospace",
      padding: 20,
    }}>
      <form onSubmit={handleSubmit} style={{
        background: "var(--bg-panel, #050505)",
        border: "1px solid var(--border, #1a3a1a)",
        padding: 30,
        borderRadius: 8,
        width: "100%",
        maxWidth: 380,
        boxShadow: "0 0 40px rgba(0, 255, 65, 0.1)",
      }}>
        <h1 style={{
          color: "var(--primary, #00ff41)",
          fontSize: 18,
          margin: "0 0 8px",
          textTransform: "uppercase",
          letterSpacing: 2,
        }}>🔐 Access Login</h1>
        <p style={{
          color: "var(--text-dim, #4a7a4a)",
          fontSize: 11,
          margin: "0 0 24px",
        }}>ورود به سیستم محافظت‌شده</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: "block",
            fontSize: 10,
            color: "var(--text-dim, #4a7a4a)",
            textTransform: "uppercase",
            marginBottom: 6,
            letterSpacing: 1,
          }}>Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--bg, #000)",
              border: "1px solid var(--border, #1a3a1a)",
              color: "var(--primary-bright, #39ff14)",
              fontFamily: "monospace",
              fontSize: 13,
              borderRadius: 4,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: "block",
            fontSize: 10,
            color: "var(--text-dim, #4a7a4a)",
            textTransform: "uppercase",
            marginBottom: 6,
            letterSpacing: 1,
          }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--bg, #000)",
              border: "1px solid var(--border, #1a3a1a)",
              color: "var(--primary-bright, #39ff14)",
              fontFamily: "monospace",
              fontSize: 13,
              borderRadius: 4,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: "10px 12px",
            marginBottom: 16,
            background: "rgba(255, 0, 64, 0.1)",
            border: "1px solid var(--red, #ff0040)",
            color: "var(--red, #ff0040)",
            fontSize: 11,
            borderRadius: 4,
          }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px",
            background: loading ? "var(--primary-dim, #008f11)" : "var(--primary, #00ff41)",
            color: "#000",
            border: "none",
            fontFamily: "monospace",
            fontSize: 12,
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: 2,
            cursor: loading ? "not-allowed" : "pointer",
            borderRadius: 4,
            transition: "background 0.2s",
          }}
        >
          {loading ? "...processing" : "→ Login"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <a href="/" style={{
            color: "var(--text-dim, #4a7a4a)",
            fontSize: 10,
            textDecoration: "none",
            textTransform: "uppercase",
            letterSpacing: 1,
          }}>← back to site</a>
        </div>
      </form>
    </div>
  );
}
