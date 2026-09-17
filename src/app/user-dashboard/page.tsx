// ============================================================================
// /user-dashboard — داشبورد کاربر + پنل ادمین
// ============================================================================
// این صفحه:
// - اگه کاربر ادمین باشه: پنل ادمین کامل (همه قابلیت‌ها) نشون می‌ده
// - اگه کاربر عادی باشه: فقط محتوای مجاز رو نشون می‌ده
// - اگه session نباشه: به /user-login منتقل می‌شه
// ============================================================================

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ContentManager from "@/components/ContentManager";
import TextEditor from "@/components/TextEditor";
import NavMenuManager from "@/components/NavMenuManager";
import ThemeBuilder from "@/components/ThemeBuilder";
import AccessUserManager from "@/components/AccessUserManager";
import FontSelector from "@/components/FontSelector";
import AparatClipManager from "@/components/AparatClipManager";

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

type Tab = "overview" | "content" | "text" | "nav" | "themes" | "users" | "font" | "clips" | "settings";

export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [accessReason, setAccessReason] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [adminPwd, setAdminPwd] = useState("");

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

  // جلوگیری از خروج با بستن تب
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "اگر این تب رو ببندید، از پنل ادمین خارج می‌شید. آیا مطمئن هستید؟";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

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

  const isAdmin = user.role === "admin";

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

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "overview", label: "📊 داشبورد" },
    { id: "content", label: "📁 محتوا", adminOnly: true },
    { id: "text", label: "📝 متن‌ها", adminOnly: true },
    { id: "nav", label: "🧭 منو", adminOnly: true },
    { id: "themes", label: "🎨 تم‌ها", adminOnly: true },
    { id: "users", label: "👥 کاربران", adminOnly: true },
    { id: "clips", label: "🎬 کلیپ‌ها", adminOnly: true },
    { id: "font", label: "🔤 فونت", adminOnly: true },
    { id: "settings", label: "⚙️ تنظیمات", adminOnly: true },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #000)",
      color: "var(--text, #c8ffc8)",
      fontFamily: "monospace",
      padding: 20,
    }}>
      <div style={{
        maxWidth: 1200,
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
            }}>
              {isAdmin ? "🔐 Admin Panel" : "📊 User Dashboard"}
            </h1>
            <p style={{
              color: "var(--text-dim, #4a7a4a)",
              fontSize: 11,
              margin: "4px 0 0",
            }}>
              خوش آمدید، {user.displayName || user.username}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/" target="_blank" style={{
              padding: "8px 16px",
              background: "transparent",
              color: "var(--primary, #00ff41)",
              border: "1px solid var(--primary, #00ff41)",
              fontFamily: "monospace",
              fontSize: 11,
              cursor: "pointer",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
              textDecoration: "none",
            }}>🌐 باز کردن سایت</a>
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
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
        }}>
          {tabs.map(tab => {
            if (tab.adminOnly && !isAdmin) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`signal-waveform-btn ${activeTab === tab.id ? "active" : ""}`}
                style={{
                  padding: "8px 12px",
                  fontSize: 11,
                  borderRadius: 4,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ minHeight: 400 }}>
          {activeTab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InfoCard label="Username" value={user.username} />
              <InfoCard label="Role" value={user.role === "admin" ? "👑 ادمین" : "👤 کاربر"} />
              <InfoCard label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fa-IR") : "—"} />
              <InfoCard label="Account Status" value={user.active ? "✅ فعال" : "❌ غیرفعال"} />
              <div style={{ gridColumn: "1 / -1" }}>
                <InfoCard label="Access Schedule" value={accessSchedule} />
              </div>
            </div>
          )}

          {activeTab === "content" && isAdmin && (
            <ContentManager password={adminPwd} lang="fa" />
          )}

          {activeTab === "text" && isAdmin && (
            <TextEditor password={adminPwd} lang="fa" />
          )}

          {activeTab === "nav" && isAdmin && (
            <NavMenuManager password={adminPwd} lang="fa" />
          )}

          {activeTab === "themes" && isAdmin && (
            <ThemeBuilder password={adminPwd} lang="fa" />
          )}

          {activeTab === "users" && isAdmin && (
            <AccessUserManager />
          )}

          {activeTab === "clips" && isAdmin && (
            <AparatClipManager />
          )}

          {activeTab === "font" && isAdmin && (
            <FontSelector />
          )}

          {activeTab === "settings" && (
            <div style={{ padding: 20, color: "var(--text-dim)", textAlign: "center" }}>
              <p>برای تنظیمات پیشرفته (تغییر رمز، ایمیل، AI providers)، از پنل قدیمی استفاده کنید:</p>
              <a href="/#admin" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                باز کردن پنل قدیمی
              </a>
            </div>
          )}
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
