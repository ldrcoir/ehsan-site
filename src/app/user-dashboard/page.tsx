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
  permissions: string | null;
  allowedHourStart: number | null;
  allowedHourEnd: number | null;
  allowedDays: string | null;
  expiresAt: string | null;
  active: boolean;
  lastLoginAt: string | null;
};

const DAY_NAMES = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

type Tab = "overview" | "messages" | "content" | "text" | "nav" | "themes" | "users" | "font" | "clips" | "settings";

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
  // لیست دسترسی‌های کاربر
  const userPermissions = user.permissions
    ? user.permissions.split(",").filter(Boolean)
    : [];

  // تابع بررسی دسترسی به تب
  function hasTabAccess(tabId: Tab): boolean {
    if (isAdmin) return true;
    if (tabId === "overview") return true;
    if (tabId === "settings") return true;
    return userPermissions.includes(tabId);
  }

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
    { id: "messages", label: "📨 پیام‌ها", adminOnly: true },
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
            if (!hasTabAccess(tab.id)) return null;
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
            <div>
              <HelpBox text="این داشبورد اطلاعات حساب شماست. اگه ادمین هستی، تب‌های دیگه برای مدیریت سایت در دسترسه." />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
                <InfoCard label="Username" value={user.username} />
                <InfoCard label="Role" value={user.role === "admin" ? "👑 ادمین" : "👤 کاربر"} />
                <InfoCard label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fa-IR") : "—"} />
                <InfoCard label="Account Status" value={user.active ? "✅ فعال" : "❌ غیرفعال"} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <InfoCard label="Access Schedule" value={accessSchedule} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "messages" && isAdmin && (
            <MessagesPanel password={adminPwd} />
          )}

          {activeTab === "content" && isAdmin && (
            <div>
              <HelpBox text="اینجا می‌تونی کتاب‌ها، مقالات، آموزش‌ها، مهارت‌ها و تجهیزات رو اضافه/ویرایش/حذف کنی. روی هر مورد کلیک کن تا فرم ویرایش باز بشه. برای نمایش تیک visible رو بزن." />
              <ContentManager password={adminPwd} lang="fa" />
            </div>
          )}

          {activeTab === "text" && isAdmin && (
            <div>
              <HelpBox text="همه‌ی متن‌های سایت (عنوان‌ها، توضیحات، دکمه‌ها) رو از اینجا می‌تونی عوض کنی. تغییرات بلافاصله روی سایت اعمال می‌شه." />
              <TextEditor password={adminPwd} lang="fa" />
            </div>
          )}

          {activeTab === "nav" && isAdmin && (
            <div>
              <HelpBox text="منوی بالای سایت رو مدیریت کن. می‌تونی لینک‌های جدید اضافه کنی، ترتیبشون رو عوض کنی یا مخفیشون کنی." />
              <NavMenuManager password={adminPwd} lang="fa" />
            </div>
          )}

          {activeTab === "themes" && isAdmin && (
            <div>
              <HelpBox text="تم رنگی سایت رو بساز یا عوض کن. ۷ تم آماده موجوده، یا تم سفارشی بساز. رنگ‌ها رو انتخاب کن و ذخیره بزن." />
              <ThemeBuilder password={adminPwd} lang="fa" />
            </div>
          )}

          {activeTab === "users" && isAdmin && (
            <div>
              <HelpBox text="کاربران جدید بساز. می‌تونی ساعت/روز دسترسی تعیین کنی. مثلاً فقط ۹ تا ۱۷ دوشنبه تا جمعه. تعداد کاربر نامحدوده." />
              <AccessUserManager />
            </div>
          )}

          {activeTab === "clips" && isAdmin && (
            <div>
              <HelpBox text="ویدیوهای آپارات رو اضافه کن. از سایت آپارات: اشتراک‌گذاری → جای‌گذاری در وبلاگ → کد رو کپی کن → اینجا بذار. ویدیو توی صفحه‌ی اصلی نشون داده می‌شه." />
              <AparatClipManager />
            </div>
          )}

          {activeTab === "font" && isAdmin && (
            <div>
              <HelpBox text="فونت سایت رو انتخاب کن. انتخاب تو مرورگر ذخیره می‌شه. ۵ فونت موجود هست." />
              <FontSelector />
            </div>
          )}

          {activeTab === "settings" && (
            <div>
              <HelpBox text="تنظیمات پیشرفته: تغییر رمز، تنظیم ایمیل، اتصال به هوش مصنوعی (Ollama/OpenAI/Groq). برای آموزش هوش مصنوعی محلی، فایل OLLAMA_GUIDE_FA.md رو بخون." />
              <div style={{ padding: 20, color: "var(--text-dim)", textAlign: "center" }}>
                <a href="/#admin" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                  باز کردن پنل تنظیمات کامل
                </a>
              </div>
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

// ============================================================================
// HelpBox — کادر توضیحات راهنما برای هر تب
// ============================================================================
function HelpBox({ text }: { text: string }) {
  return (
    <div style={{
      padding: "10px 14px",
      marginBottom: 16,
      background: "rgba(0, 255, 65, 0.05)",
      border: "1px solid rgba(0, 255, 65, 0.2)",
      borderRadius: 4,
      fontSize: 11,
      color: "var(--text-dim, #4a7a4a)",
      lineHeight: 1.6,
    }}>
      💡 {text}
    </div>
  );
}

// ============================================================================
// MessagesPanel — نمایش پیام‌های تماس دریافتی
// ============================================================================
function MessagesPanel({ password }: { password: string }) {
  const [messages, setMessages] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!password) {
      // اگه password خالی هست، از session استفاده کن
      fetch("/api/messages", { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.ok) setMessages(data.messages || []);
          else setMessages([]);
        })
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    } else {
      fetch(`/api/messages?password=${encodeURIComponent(password)}`)
        .then(r => r.json())
        .then(data => {
          if (data.ok) setMessages(data.messages || []);
          else setMessages([]);
        })
        .catch(() => setMessages([]))
        .finally(() => setLoading(false));
    }
  }, [password]);

  async function sendReply(msgId: string) {
    if (!replyText.trim()) return;
    try {
      await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, messageId: msgId, reply: replyText }),
      });
      setReplyingTo(null);
      setReplyText("");
      alert("پاسخ ارسال شد ✅");
    } catch {
      alert("خطا در ارسال");
    }
  }

  async function deleteMessage(msgId: string) {
    if (!confirm("حذف این پیام؟")) return;
    try {
      await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, target: "message", id: msgId }),
      });
      setMessages(prev => prev ? prev.filter(m => m.id !== msgId) : prev);
    } catch {
      alert("خطا در حذف");
    }
  }

  if (loading) return <div style={{ padding: 20, color: "var(--text-dim)" }}>در حال بارگذاری پیام‌ها...</div>;

  return (
    <div>
      <HelpBox text="پیام‌هایی که بازدیدکنندگان از فرم تماس سایت فرستادن. می‌تونی پاسخ بدی یا حذف کنی." />
      {messages && messages.length === 0 ? (
        <p style={{ color: "var(--text-faint)", textAlign: "center", padding: 40 }}>
          پیامی دریافت نشده.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {messages?.map(msg => (
            <div key={msg.id} style={{
              padding: 16,
              background: "var(--bg, #000)",
              border: "1px solid var(--border, #1a3a1a)",
              borderRadius: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <strong style={{ color: "var(--primary-bright, #39ff14)" }}>{msg.name}</strong>
                  <span style={{ color: "var(--text-dim)", fontSize: 10, marginRight: 8 }}>{msg.email}</span>
                </div>
                <span style={{ color: "var(--text-faint)", fontSize: 9 }}>
                  {new Date(msg.createdAt).toLocaleString("fa-IR")}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "var(--text)", margin: "4px 0" }}>{msg.message}</p>
              {msg.replies && msg.replies.length > 0 && (
                <div style={{ marginTop: 8, padding: 8, background: "rgba(0,255,65,0.05)", borderRadius: 4 }}>
                  {msg.replies.map((r: any) => (
                    <p key={r.id} style={{ fontSize: 11, color: "var(--text-dim)", margin: "2px 0" }}>
                      ↳ {r.reply}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { setReplyingTo(msg.id); setReplyText(""); }}
                  className="signal-waveform-btn"
                  style={{ padding: "4px 8px", fontSize: 10 }}
                >↩️ پاسخ</button>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="signal-waveform-btn"
                  style={{ padding: "4px 8px", fontSize: 10 }}
                >🗑️ حذف</button>
              </div>
              {replyingTo === msg.id && (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: 8,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--primary-bright)",
                      fontSize: 12,
                      borderRadius: 4,
                      boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button onClick={() => sendReply(msg.id)} className="signal-waveform-btn active" style={{ padding: "4px 12px", fontSize: 10 }}>📤 ارسال</button>
                    <button onClick={() => setReplyingTo(null)} className="signal-waveform-btn" style={{ padding: "4px 12px", fontSize: 10 }}>✕ انصراف</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
