// ============================================================================
// /user-dashboard — داشبورد کاربر + پنل ادمین (V17.1)
// ============================================================================
// این صفحه:
// - اگه کاربر ادمین باشه: پنل ادمین کامل (همه قابلیت‌ها) نشون می‌ده
// - اگه کاربر عادی باشه: فقط محتوای مجاز رو نشون می‌ده
// - اگه session نباشه: middleware به /user-login منتقل می‌کنه
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
import SettingsPanel from "@/components/SettingsPanel";

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

type Lang = "fa" | "en" | "de";

const TAB_LABELS: Record<Lang, Record<Tab, string>> = {
  fa: {
    overview: "📊 داشبورد",
    messages: "📨 پیام‌ها",
    content: "📁 محتوا",
    text: "📝 متن‌ها",
    nav: "🧭 منو",
    themes: "🎨 تم‌ها",
    users: "👥 کاربران",
    clips: "🎬 کلیپ‌ها",
    font: "🔤 فونت",
    settings: "⚙️ تنظیمات",
  },
  en: {
    overview: "📊 Dashboard",
    messages: "📨 Messages",
    content: "📁 Content",
    text: "📝 Texts",
    nav: "🧭 Menu",
    themes: "🎨 Themes",
    users: "👥 Users",
    clips: "🎬 Clips",
    font: "🔤 Font",
    settings: "⚙️ Settings",
  },
  de: {
    overview: "📊 Übersicht",
    messages: "📨 Nachrichten",
    content: "📁 Inhalt",
    text: "📝 Texte",
    nav: "🧭 Menü",
    themes: "🎨 Themen",
    users: "👥 Benutzer",
    clips: "🎬 Clips",
    font: "🔤 Schrift",
    settings: "⚙️ Einstellungen",
  },
};

export default function UserDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [accessAllowed, setAccessAllowed] = useState(true);
  const [accessReason, setAccessReason] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [lang, setLang] = useState<Lang>("fa");

  useEffect(() => {
    // Load saved panel language
    const savedLang = (localStorage.getItem("panel_lang") as Lang) || "fa";
    setLang(savedLang);
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === "fa" ? "rtl" : "ltr";

    fetch("/api/user/verify", { cache: "no-store", credentials: "include" })
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

  function switchLang(newLang: Lang) {
    setLang(newLang);
    localStorage.setItem("panel_lang", newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === "fa" ? "rtl" : "ltr";
  }

  async function handleLogout() {
    await fetch("/api/user/logout", { method: "POST", credentials: "include" });
    router.replace("/user-login");
  }

  if (loading) {
    return <div className="dashboard-loading" aria-live="polite">Loading</div>;
  }

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const userPermissions = user.permissions
    ? user.permissions.split(",").filter(Boolean)
    : [];

  function hasTabAccess(tabId: Tab): boolean {
    if (isAdmin) return true;
    if (tabId === "overview") return true;
    if (tabId === "settings") return true;
    return userPermissions.includes(tabId);
  }

  let accessSchedule = lang === "fa" ? "بدون محدودیت (۲۴/۷)" :
    lang === "en" ? "No restriction (24/7)" : "Keine Einschränkung (24/7)";
  if (user.allowedHourStart !== null && user.allowedHourEnd !== null) {
    if (lang === "fa") {
      accessSchedule = `ساعات ${user.allowedHourStart}:00 تا ${user.allowedHourEnd}:00 (UTC)`;
    } else if (lang === "en") {
      accessSchedule = `Hours ${user.allowedHourStart}:00 to ${user.allowedHourEnd}:00 (UTC)`;
    } else {
      accessSchedule = `Stunden ${user.allowedHourStart}:00 bis ${user.allowedHourEnd}:00 (UTC)`;
    }
  }
  if (user.allowedDays) {
    const days = user.allowedDays.split(",").map(d => DAY_NAMES[parseInt(d, 10)] || d).join("، ");
    accessSchedule += ` — ${lang === "fa" ? "روزها" : lang === "en" ? "Days" : "Tage"}: ${days}`;
  }
  if (user.expiresAt) {
    accessSchedule += ` — ${lang === "fa" ? "انقضا" : lang === "en" ? "Expires" : "Läuft ab"}: ${new Date(user.expiresAt).toLocaleDateString("fa-IR")}`;
  }

  const tabs: Tab[] = ["overview", "messages", "content", "text", "nav", "themes", "users", "clips", "font", "settings"];

  const t = {
    fa: { welcome: "خوش آمدید", adminPanel: "🔐 پنل ادمین", userDashboard: "📊 داشبورد کاربر", openSite: "🌐 باز کردن سایت", logout: "خروج", accessWarning: "⚠️ دسترسی شما در این زمان محدود شده است.", reason: "دلیل", username: "نام کاربری", role: "نقش", lastLogin: "آخرین ورود", status: "وضعیت حساب", accessSchedule: "بازه دسترسی", active: "✅ فعال", inactive: "❌ غیرفعال", admin: "👑 ادمین", regularUser: "👤 کاربر", loadingMessages: "در حال بارگذاری پیام‌ها..." },
    en: { welcome: "Welcome", adminPanel: "🔐 Admin Panel", userDashboard: "📊 User Dashboard", openSite: "🌐 Open Site", logout: "Logout", accessWarning: "⚠️ Your access is restricted at this time.", reason: "Reason", username: "Username", role: "Role", lastLogin: "Last Login", status: "Account Status", accessSchedule: "Access Schedule", active: "✅ Active", inactive: "❌ Inactive", admin: "👑 Admin", regularUser: "👤 User", loadingMessages: "Loading messages..." },
    de: { welcome: "Willkommen", adminPanel: "🔐 Admin-Panel", userDashboard: "📊 Benutzer-Dashboard", openSite: "🌐 Seite öffnen", logout: "Abmelden", accessWarning: "⚠️ Ihr Zugriff ist derzeit eingeschränkt.", reason: "Grund", username: "Benutzername", role: "Rolle", lastLogin: "Letzte Anmeldung", status: "Kontostatus", accessSchedule: "Zugriffsplan", active: "✅ Aktiv", inactive: "❌ Inaktiv", admin: "👑 Admin", regularUser: "👤 Benutzer", loadingMessages: "Nachrichten laden..." },
  }[lang];

  return (
    <div className="dashboard-shell">
      <div className="dashboard-container">
        {/* Header */}
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">{isAdmin ? t.adminPanel : t.userDashboard}</h1>
            <p className="dashboard-subtitle">{t.welcome}، {user.displayName || user.username}</p>
          </div>
          <div className="dashboard-actions">
            <a href="/" target="_blank" rel="noopener noreferrer" className="dashboard-btn">
              {t.openSite}
            </a>
            <select
              value={lang}
              onChange={e => switchLang(e.target.value as Lang)}
              className="dashboard-select"
              aria-label="Language"
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
            <button
              onClick={handleLogout}
              className="dashboard-btn danger"
            >
              {t.logout} →
            </button>
          </div>
        </div>

        {/* Access Status */}
        {!accessAllowed && (
          <div className="dashboard-access-warning" role="alert">
            {t.accessWarning}
            <br />
            {t.reason}: <code>{accessReason}</code>
          </div>
        )}

        {/* Tabs */}
        <div className="dashboard-tabs" role="tablist">
          {tabs.map(tab => {
            if (!hasTabAccess(tab)) return null;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`dashboard-tab ${activeTab === tab ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {TAB_LABELS[lang][tab]}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="dashboard-content">
          {activeTab === "overview" && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 این داشبورد اطلاعات حساب شماست. اگه ادمین هستی، تب‌های دیگه برای مدیریت سایت در دسترسه."}
                {lang === "en" && "💡 This is your account dashboard. If you are an admin, other tabs are available for site management."}
                {lang === "de" && "💡 Dies ist Ihr Konto-Dashboard. Als Admin stehen Ihnen weitere Tabs zur Verfügung."}
              </div>
              <div className="dashboard-info-grid">
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">{t.username}</div>
                  <div className="dashboard-info-value">{user.username}</div>
                </div>
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">{t.role}</div>
                  <div className="dashboard-info-value">{user.role === "admin" ? t.admin : t.regularUser}</div>
                </div>
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">{t.lastLogin}</div>
                  <div className="dashboard-info-value">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("fa-IR") : "—"}</div>
                </div>
                <div className="dashboard-info-card">
                  <div className="dashboard-info-label">{t.status}</div>
                  <div className="dashboard-info-value">{user.active ? t.active : t.inactive}</div>
                </div>
                <div className="dashboard-info-card full">
                  <div className="dashboard-info-label">{t.accessSchedule}</div>
                  <div className="dashboard-info-value">{accessSchedule}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "messages" && isAdmin && (
            <MessagesPanel lang={lang} />
          )}

          {activeTab === "content" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 اینجا می‌تونی کتاب‌ها، مقالات، آموزش‌ها، مهارت‌ها و تجهیزات رو اضافه/ویرایش/حذف کنی. برای نمایش تیک visible رو بزن."}
                {lang === "en" && "💡 Here you can add/edit/delete books, articles, tutorials, skills, and equipment. Toggle visible to show."}
                {lang === "de" && "💡 Hier können Sie Bücher, Artikel, Tutorials, Fähigkeiten und Geräte hinzufügen/bearbeiten."}
              </div>
              <ContentManager lang={lang} />
            </div>
          )}

          {activeTab === "text" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 همه‌ی متن‌های سایت (عنوان‌ها، توضیحات، دکمه‌ها) رو از اینجا می‌تونی عوض کنی. تغییرات بلافاصله روی سایت اعمال می‌شه."}
                {lang === "en" && "💡 Edit all site texts (headings, descriptions, buttons). Changes apply immediately."}
                {lang === "de" && "💡 Bearbeiten Sie alle Texte der Website. Änderungen werden sofort angewendet."}
              </div>
              <TextEditor lang={lang} />
            </div>
          )}

          {activeTab === "nav" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 منوی بالای سایت رو مدیریت کن. می‌تونی لینک‌های جدید اضافه کنی، ترتیبشون رو عوض کنی یا مخفیشون کنی."}
                {lang === "en" && "💡 Manage the top navigation menu. Add new links, reorder, or hide them."}
                {lang === "de" && "💡 Verwalten Sie das obere Navigationsmenü."}
              </div>
              <NavMenuManager lang={lang} />
            </div>
          )}

          {activeTab === "themes" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 تم رنگی سایت رو بساز یا عوض کن. رنگ‌ها رو انتخاب کن و ذخیره بزن."}
                {lang === "en" && "💡 Create or change the site color theme. Pick colors and save."}
                {lang === "de" && "💡 Erstellen oder ändern Sie das Farbschema der Website."}
              </div>
              <ThemeBuilder lang={lang} />
            </div>
          )}

          {activeTab === "users" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 کاربران جدید بساز. می‌تونی ساعت/روز دسترسی تعیین کنی. مثلاً فقط ۹ تا ۱۷ دوشنبه تا جمعه."}
                {lang === "en" && "💡 Create new users. You can set access hours/days, e.g. only 9 to 17 Monday to Friday."}
                {lang === "de" && "💡 Erstellen Sie neue Benutzer mit Zugriffszeiten."}
              </div>
              <AccessUserManager />
            </div>
          )}

          {activeTab === "clips" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 ویدیوهای آپارات رو اضافه کن. از سایت آپارات: اشتراک‌گذاری → جای‌گذاری در وبلاگ → کد رو کپی کن."}
                {lang === "en" && "💡 Add Aparat videos. From Aparat site: Share → Embed in blog → Copy code."}
                {lang === "de" && "💡 Fügen Sie Aparat-Videos hinzu."}
              </div>
              <AparatClipManager />
            </div>
          )}

          {activeTab === "font" && isAdmin && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 فونت سایت رو انتخاب کن. انتخاب تو مرورگر ذخیره می‌شه."}
                {lang === "en" && "💡 Select the site font. Your choice is saved in your browser."}
                {lang === "de" && "💡 Wählen Sie die Schriftart der Website."}
              </div>
              <FontSelector />
            </div>
          )}

          {activeTab === "settings" && (
            <SettingsPanel />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MessagesPanel — نمایش پیام‌های تماس دریافتی
// ============================================================================
function MessagesPanel({ lang }: { lang: Lang }) {
  const [messages, setMessages] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/messages", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (data.ok) setMessages(data.messages || []);
        else {
          setMessages([]);
          setError(data.error || "load_failed");
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  async function sendReply(msgId: string) {
    if (!replyText.trim()) return;
    try {
      const res = await fetch("/api/admin/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId: msgId, reply: replyText }),
      });
      const data = await res.json();
      if (data.ok) {
        setReplyingTo(null);
        setReplyText("");
        // Refresh messages
        const refreshRes = await fetch("/api/messages", { credentials: "include" });
        const refreshData = await refreshRes.json();
        if (refreshData.ok) setMessages(refreshData.messages || []);
      } else {
        setError(data.error || "reply_failed");
      }
    } catch {
      setError("network");
    }
  }

  async function deleteMessage(msgId: string) {
    if (!confirm(lang === "fa" ? "حذف این پیام؟" : lang === "en" ? "Delete this message?" : "Diese Nachricht löschen?")) return;
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "message", id: msgId }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages(prev => prev ? prev.filter(m => m.id !== msgId) : prev);
      } else {
        setError(data.error || "delete_failed");
      }
    } catch {
      setError("network");
    }
  }

  if (loading) {
    return <div className="dashboard-empty-state">{lang === "fa" ? "در حال بارگذاری پیام‌ها..." : lang === "en" ? "Loading messages..." : "Nachrichten laden..."}</div>;
  }

  const replyLabel = lang === "fa" ? "↩️ پاسخ" : lang === "en" ? "↩️ Reply" : "↩️ Antworten";
  const deleteLabel = lang === "fa" ? "🗑️ حذف" : lang === "en" ? "🗑️ Delete" : "🗑️ Löschen";
  const sendLabel = lang === "fa" ? "📤 ارسال" : lang === "en" ? "📤 Send" : "📤 Senden";
  const cancelLabel = lang === "fa" ? "✕ انصراف" : lang === "en" ? "✕ Cancel" : "✕ Abbrechen";
  const placeholder = lang === "fa" ? "پاسخ خود را بنویسید..." : lang === "en" ? "Type your reply..." : "Antwort eingeben...";
  const emptyLabel = lang === "fa" ? "پیامی دریافت نشده." : lang === "en" ? "No messages." : "Keine Nachrichten.";

  return (
    <div>
      {error && (
        <div className="dashboard-access-warning" role="alert" style={{ background: "rgba(255,0,64,0.1)", borderColor: "var(--red)", color: "var(--red)" }}>
          Error: {error}
        </div>
      )}
      <div className="dashboard-help-box">
        {lang === "fa" && "💡 پیام‌هایی که بازدیدکنندگان از فرم تماس سایت فرستادن. می‌تونی پاسخ بدی یا حذف کنی."}
        {lang === "en" && "💡 Messages from the contact form. You can reply or delete."}
        {lang === "de" && "💡 Nachrichten vom Kontaktformular. Sie können antworten oder löschen."}
      </div>
      {messages && messages.length === 0 ? (
        <p className="dashboard-empty-state">{emptyLabel}</p>
      ) : (
        <div className="dashboard-messages-list">
          {messages?.map(msg => (
            <div key={msg.id} className="dashboard-message-card">
              <div className="dashboard-message-header">
                <div>
                  <strong className="dashboard-message-name">{msg.name}</strong>
                  <span className="dashboard-message-email">{msg.email}</span>
                </div>
                <span className="dashboard-message-date">
                  {new Date(msg.createdAt).toLocaleString("fa-IR")}
                </span>
              </div>
              <p className="dashboard-message-text">{msg.message}</p>
              {msg.replies && msg.replies.length > 0 && (
                <div className="dashboard-message-replies">
                  {msg.replies.map((r: any) => (
                    <p key={r.id} className="dashboard-message-reply-text">
                      ↳ {r.reply}
                    </p>
                  ))}
                </div>
              )}
              <div className="dashboard-message-actions">
                <button
                  onClick={() => { setReplyingTo(msg.id); setReplyText(""); }}
                  className="dashboard-btn"
                >{replyLabel}</button>
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="dashboard-btn danger"
                >{deleteLabel}</button>
              </div>
              {replyingTo === msg.id && (
                <div className="dashboard-reply-form">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={placeholder}
                    rows={3}
                    className="dashboard-reply-textarea"
                    autoFocus
                  />
                  <div className="dashboard-message-actions">
                    <button onClick={() => sendReply(msg.id)} className="dashboard-btn">{sendLabel}</button>
                    <button onClick={() => setReplyingTo(null)} className="dashboard-btn">{cancelLabel}</button>
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
