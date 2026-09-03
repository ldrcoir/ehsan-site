// ============================================================================
// /user-dashboard — داشبورد کاربر AccessUser
// ============================================================================
// این صفحه فقط برای کاربران وارد شده قابل دسترسی هست.
// اگه کاربر session نداشته باشه، به /user-login منتقل می‌شه.
// اگه در بازه‌ی زمانی مجاز نباشه، پیام هشدار نشون داده می‌شه.
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type UserInfo = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  allowedHourStart: number | null;
  allowedHourEnd: number | null;
  allowedDays: string | null;
  expiresAt: string | null;
  active: boolean;
  lastLoginAt: string | null;
};

const DAY_NAMES = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [accessReason, setAccessReason] = useState("");

  useEffect(() => {
    fetch("/api/user/verify", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        if (!data.ok) {
          router.replace("/user-login");
          return;
        }
        setUser(data.user);
        setAccessAllowed(data.access?.allowed ?? false);
        setAccessReason(data.access?.reason ?? "");
        setLoading(false);
      })
      .catch(() => {
        router.replace("/user-login");
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/user/logout", { method: "POST" });
    router.replace("/user-login");
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#00ff41",
        fontFamily: "monospace",
      }}>...</div>
    );
  }

  if (!user) return null;

  // نمایش بازه‌ی دسترسی به‌صورت متنی
  let accessSchedule = "بدون محدودیت (۲۴/۷)";
  if (user.allowedHourStart !== null && user.allowedHourEnd !== null) {
    accessSchedule = `ساعات ${user.allowedHourStart}:00 تا ${user.allowedHourEnd}:00 (UTC)`;
  }
  if (user.allowedDays) {
    const days = user.allowedDays.split(",").map(d => DAY_NAMES[parseInt(d, 10)] || d).join("، ");
    accessSchedule += ` — روزها: ${days}`;
  }
  if (user.expiresAt) {
    accessSchedule += ` — انقضا: ${new Date(user.expiresAt).toLocaleDateString("fa-IR")}`;
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #000)",
      color: "var(--text, #c8ffc8)",
      fontFamily: "monospace",
      padding: 20,
    }}>
      <div style={{
        maxWidth: 800,
        margin: "0 auto",
        background: "var(--bg-panel, #050505)",
        border: "1px solid var(--border, #1a3a1a)",
        borderRadius: 8,
        padding: 30,
        boxShadow: "0 0 40px rgba(0, 255, 65, 0.1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 30,
          paddingBottom: 20,
          borderBottom: "1px solid var(--border, #1a3a1a)",
        }}>
          <div>
            <h1 style={{
              color: "var(--primary, #00ff41)",
              fontSize: 18,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}>📊 User Dashboard</h1>
            <p style={{
              color: "var(--text-dim, #4a7a4a)",
              fontSize: 11,
              margin: "4px 0 0",
            }}>خوش آمدید، {user.displayName || user.username}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: "8px 16px",
              background: "transparent",
              color: "var(--red, #ff0040)",
              border: "1px solid var(--red, #ff0040)",
              fontFamily: "monospace",
              fontSize: 11,
              cursor: "pointer",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >Logout →</button>
        </div>

        {/* Access Status */}
        {!accessAllowed && (
          <div style={{
            padding: 16,
            marginBottom: 20,
            background: "rgba(255, 176, 0, 0.1)",
            border: "1px solid var(--amber, #ffb000)",
            color: "var(--amber, #ffb000)",
            fontSize: 12,
            borderRadius: 4,
          }}>
            ⚠️ دسترسی شما در این زمان محدود شده است.
            <br />
            دلیل: <code>{accessReason}</code>
            <br />
            در بازه‌ی زمانی مجاز، دوباره تلاش کنید.
          </div>
        )}

        {/* User Info */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 30,
        }}>
          <InfoCard label="Username" value={user.username} />
          <InfoCard label="Role" value={user.role} />
          <InfoCard label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fa-IR") : "—"} />
          <InfoCard label="Account Status" value={user.active ? "✅ Active" : "❌ Inactive"} />
        </div>

        {/* Access Schedule */}
        <div style={{
          padding: 16,
          background: "var(--bg, #000)",
          border: "1px solid var(--border, #1a3a1a)",
          borderRadius: 4,
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 10,
            color: "var(--text-dim, #4a7a4a)",
            textTransform: "uppercase",
            letterSpacing: 1,
            marginBottom: 8,
          }}>Access Schedule</div>
          <div style={{ fontSize: 12, color: "var(--primary-bright, #39ff14)" }}>
            {accessSchedule}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
        }}>
          <a href="/" style={{
            padding: 14,
            background: "var(--bg, #000)",
            border: "1px solid var(--border, #1a3a1a)",
            color: "var(--primary, #00ff41)",
            fontFamily: "monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            textAlign: "center",
            textDecoration: "none",
            borderRadius: 4,
            cursor: accessAllowed ? "pointer" : "not-allowed",
            opacity: accessAllowed ? 1 : 0.4,
          }}>→ Browse Site</a>
          <button onClick={() => window.location.reload()} style={{
            padding: 14,
            background: "var(--bg, #000)",
            border: "1px solid var(--border, #1a3a1a)",
            color: "var(--primary, #00ff41)",
            fontFamily: "monospace",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            cursor: "pointer",
            borderRadius: 4,
          }}>↻ Refresh Status</button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: 12,
      background: "var(--bg, #000)",
      border: "1px solid var(--border, #1a3a1a)",
      borderRadius: 4,
    }}>
      <div style={{
        fontSize: 9,
        color: "var(--text-dim, #4a7a4a)",
        textTransform: "uppercase",
        letterSpacing: 1,
        marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 13,
        color: "var(--primary-bright, #39ff14)",
        fontFamily: "monospace",
      }}>{value}</div>
    </div>
  );
}
