// ============================================================================
// /user-dashboard — داشبورد کاربر + پنل ادمین (V17.1)
// ============================================================================
// این صفحه:
// - اگه کاربر ادمین باشه: پنل ادمین کامل (همه قابلیت‌ها) نشون می‌ده
// - اگه کاربر عادی باشه: فقط محتوای مجاز رو نشون می‌ده
// - اگه session نباشه: middleware به /user-login منتقل می‌کنه
// ============================================================================

"use client";

import { Component, useEffect, useState } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useRouter } from "next/navigation";
import ContentManager from "@/components/ContentManager";
import TextEditor from "@/components/TextEditor";
import NavMenuManager from "@/components/NavMenuManager";
import ThemeBuilder from "@/components/ThemeBuilder";
import AccessUserManager from "@/components/AccessUserManager";
import FontSelector from "@/components/FontSelector";
import AparatClipManager from "@/components/AparatClipManager";
import SettingsPanel from "@/components/SettingsPanel";
import ChatSessionsPanel from "@/components/ChatSessionsPanel";
import StatsSecurityPanel from "@/components/StatsSecurityPanel";

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

type Tab = "overview" | "messages" | "chats" | "content" | "text" | "nav" | "themes" | "users" | "font" | "clips" | "stats" | "settings";

type Lang = "fa" | "en" | "de";

// ============================================================================
// TabErrorBoundary — اگر رندر محتوای یک تب خطا بدهد، کل داشبورد سفید نمی‌شود؛
// به‌جای آن یک کارت خطا با پیام خطا و دکمه «Reload» نشان داده می‌شود.
// ============================================================================
type TabErrorBoundaryProps = { children: ReactNode };
type TabErrorBoundaryState = { error: Error | null };

class TabErrorBoundary extends Component<TabErrorBoundaryProps, TabErrorBoundaryState> {
  state: TabErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): TabErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[user-dashboard] tab render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="dashboard-access-warning"
          role="alert"
          style={{ background: "rgba(255,0,64,0.1)", borderColor: "var(--red)", color: "var(--red)" }}
        >
          <p style={{ margin: "0 0 8px 0" }}>
            ⚠️ {this.state.error.message || "Unexpected error while rendering this tab."}
          </p>
          <button
            className="dashboard-btn"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const TAB_LABELS: Record<Lang, Record<Tab, string>> = {
  fa: {
    overview: "📊 داشبورد",
    messages: "📨 پیام‌ها",
    chats: "💬 چت‌ها",
    content: "📁 محتوا",
    text: "📝 متن‌ها",
    nav: "🧭 منو",
    themes: "🎨 تم‌ها",
    users: "👥 کاربران",
    clips: "🎬 کلیپ‌ها",
    font: "🔤 فونت",
    stats: "📈 آمار",
    settings: "⚙️ تنظیمات",
  },
  en: {
    overview: "📊 Dashboard",
    messages: "📨 Messages",
    chats: "💬 Chats",
    content: "📁 Content",
    text: "📝 Texts",
    nav: "🧭 Menu",
    themes: "🎨 Themes",
    users: "👥 Users",
    clips: "🎬 Clips",
    font: "🔤 Font",
    stats: "📈 Stats",
    settings: "⚙️ Settings",
  },
  de: {
    overview: "📊 Übersicht",
    messages: "📨 Nachrichten",
    chats: "💬 Chats",
    content: "📁 Inhalt",
    text: "📝 Texte",
    nav: "🧭 Menü",
    themes: "🎨 Themen",
    users: "👥 Benutzer",
    clips: "🎬 Clips",
    font: "🔤 Schrift",
    stats: "📈 Statistik",
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
    // v1.0 (audit W36-40 #7): storage بلاک‌شده باعث crash کامل dashboard می‌شد
    let savedLang: Lang = "fa";
    try {
      savedLang = (localStorage.getItem("panel_lang") as Lang) || "fa";
    } catch {
      savedLang = "fa";
    }
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
    try { localStorage.setItem("panel_lang", newLang); } catch {}
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

  // v1.0 (RBAC cleanup): owner هم پنل کامل را می‌بیند — هم‌سو با isElevated در rbac.ts
  const isAdmin = user.role === "admin" || user.role === "owner";

  function hasTabAccess(tabId: Tab): boolean {
    if (isAdmin) return true;
    // v1.0 (audit W16-20 #1): سیستم permissions واقعی شد — هم‌سو با checkAdminAuth
    // در src/lib/admin-auth.ts که حالا TAB_PERMISSIONS را سمت سرور چک می‌کند.
    // تب‌های واگذارشدنی: messages / clips / content / text / nav / themes —
    // اگر کاربر limited این permission را داشته باشد، تب برایش رندر می‌شود و
    // API سمت سرور هم همان permission را می‌پذیرد. تب‌های حساس (users، stats،
    // settings، chats، font) همچنان ادمین‌only هستند. overview همیشه باز است.
    const granted = (user?.permissions || "")
      .split(",")
      .map(p => p.trim())
      .filter(Boolean);
    const GRANTABLE: string[] = ["messages", "clips", "content", "text", "nav", "themes"];
    if (tabId === "overview") return true;
    return GRANTABLE.includes(tabId) && granted.includes(tabId);
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

  const tabs: Tab[] = ["overview", "messages", "chats", "content", "text", "nav", "themes", "users", "clips", "font", "stats", "settings"];

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
          {/* FIX: خطای رندر هر تب کل داشبورد را نمی‌کُشد — با تغییر تب، boundary هم reset می‌شود */}
          <TabErrorBoundary key={activeTab}>
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
                  {/* v1.0 (RBAC cleanup): برچسب نقش owner اضافه شد */}
                  <div className="dashboard-info-value">
                    {user.role === "owner" ? (lang === "fa" ? "مالک سایت (Owner)" : lang === "de" ? "Besitzer (Owner)" : "Site Owner") : user.role === "admin" ? t.admin : t.regularUser}
                  </div>
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

          {activeTab === "messages" && hasTabAccess("messages") && (
            <MessagesPanel lang={lang} />
          )}

          {activeTab === "chats" && hasTabAccess("chats") && (
            <ChatSessionsPanel lang={lang} />
          )}

          {activeTab === "content" && hasTabAccess("content") && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 اینجا می‌تونی کتاب‌ها، مقالات، آموزش‌ها، مهارت‌ها و تجهیزات رو اضافه/ویرایش/حذف کنی. برای نمایش تیک visible رو بزن."}
                {lang === "en" && "💡 Here you can add/edit/delete books, articles, tutorials, skills, and equipment. Toggle visible to show."}
                {lang === "de" && "💡 Hier können Sie Bücher, Artikel, Tutorials, Fähigkeiten und Geräte hinzufügen/bearbeiten."}
              </div>
              <ContentManager lang={lang} />
            </div>
          )}

          {activeTab === "text" && hasTabAccess("text") && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 همه‌ی متن‌های سایت (عنوان‌ها، توضیحات، دکمه‌ها) رو از اینجا می‌تونی عوض کنی. تغییرات بلافاصله روی سایت اعمال می‌شه."}
                {lang === "en" && "💡 Edit all site texts (headings, descriptions, buttons). Changes apply immediately."}
                {lang === "de" && "💡 Bearbeiten Sie alle Texte der Website. Änderungen werden sofort angewendet."}
              </div>
              <TextEditor lang={lang} />
            </div>
          )}

          {activeTab === "nav" && hasTabAccess("nav") && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 منوی بالای سایت رو مدیریت کن. می‌تونی لینک‌های جدید اضافه کنی، ترتیبشون رو عوض کنی یا مخفیشون کنی."}
                {lang === "en" && "💡 Manage the top navigation menu. Add new links, reorder, or hide them."}
                {lang === "de" && "💡 Verwalten Sie das obere Navigationsmenü."}
              </div>
              <NavMenuManager lang={lang} />
            </div>
          )}

          {activeTab === "themes" && hasTabAccess("themes") && (
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

          {activeTab === "clips" && hasTabAccess("clips") && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 ویدیوهای آپارات رو اضافه کن. از سایت آپارات: اشتراک‌گذاری → جای‌گذاری در وبلاگ → کد رو کپی کن."}
                {lang === "en" && "💡 Add Aparat videos. From Aparat site: Share → Embed in blog → Copy code."}
                {lang === "de" && "💡 Fügen Sie Aparat-Videos hinzu."}
              </div>
              <AparatClipManager />
            </div>
          )}

          {activeTab === "font" && hasTabAccess("font") && (
            <div>
              <div className="dashboard-help-box">
                {lang === "fa" && "💡 فونت سایت رو انتخاب کن. انتخاب تو مرورگر ذخیره می‌شه."}
                {lang === "en" && "💡 Select the site font. Your choice is saved in your browser."}
                {lang === "de" && "💡 Wählen Sie die Schriftart der Website."}
              </div>
              <FontSelector />
            </div>
          )}

          {activeTab === "stats" && hasTabAccess("stats") && (
            <StatsSecurityPanel lang={lang} />
          )}

          {activeTab === "settings" && isAdmin && (
            <SettingsPanel />
          )}
          </TabErrorBoundary>
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
  // FIX: جستجو + فیلتر وضعیت (سمت کلاینت روی پیام‌های بارگذاری‌شده)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "new" | "read" | "replied" | "archived">("all");
  // v1.0 (audit W16-20 #2): یادداشت/تگ — داده‌های CRM که از قبل از API می‌آمدند
  // ولی نه نمایش داده می‌شدند نه قابل ویرایش بودند
  const [notingId, setNotingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [tagText, setTagText] = useState("");

  // v1.0: بارگذاری پیام‌ها استخراج شد به تابع — addNote/setTags هم بعد از ذخیره
  // لیست را رفرش می‌کنند
  function loadMessages(signal?: AbortSignal) {
    fetch("/api/messages", { credentials: "include", signal })
      .then(r => r.json())
      .then(data => {
        if (signal?.aborted) return;
        if (data.ok) setMessages(data.messages || []);
        else {
          setMessages([]);
          // v1.1 (robustness): خطا را نشان بده — «بدون پیام» با «شکست در بارگذاری» فرق دارد
          setError(data.error || "load_failed");
        }
      })
      .catch(() => {
        if (signal?.aborted) return; // AbortError — نادیده بگیر
        setMessages([]);
        setError("network_error");
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }

  useEffect(() => {
    // FIX: AbortController — اگر کامپوننت unmount شد، درخواست در حال پرواز لغو شود
    const controller = new AbortController();
    loadMessages(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // FIX: بعد از پاسخ موفق، وضعیت پیام را بلافاصله در state محلی «replied» کن
        // (سرور هم در /api/admin/reply همین را ذخیره می‌کند؛ refresh تأییدش می‌کند)
        setMessages(prev => prev ? prev.map(m => m.id === msgId ? { ...m, status: "replied" } : m) : prev);
        setReplyingTo(null);
        setReplyText("");
        // Refresh messages
        const refreshRes = await fetch("/api/messages", { credentials: "include" });
        const refreshData = await refreshRes.json();
        if (refreshData.ok) {
          setMessages((refreshData.messages || []).map((m: any) =>
            m.id === msgId ? { ...m, status: "replied" } : m
          ));
        }
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

  // v1.1.1 (audit P1-G2): lifecycle وضعیت پیام — علامت‌گذاری «خوانده‌شده»
  // (schema از قبل status داشت ولی هیچ API/UI آن را تغییر نمی‌داد)
  // FIX: حالا generic است — read/unread(=new)/archived هم با همین اکشن set_status
  async function setStatus(msgId: string, status: "new" | "read" | "replied" | "archived") {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_status", id: msgId, status }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages(prev => prev ? prev.map(m => m.id === msgId ? { ...m, status } : m) : prev);
      } else {
        setError(data.error || "status_failed");
      }
    } catch {
      setError("network");
    }
  }

  // v1.0 (audit W16-20 #2): ثبت یادداشت ادمین روی پیام
  async function addNote(msgId: string) {
    const note = noteText.trim();
    if (!note) return;
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "add_note", id: msgId, note }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotingId(null);
        setNoteText("");
        loadMessages();
      } else {
        setError(data.error || "note_failed");
      }
    } catch {
      setError("network_error");
    }
  }

  // v1.0 (audit W16-20 #2): ست کردن تگ‌های پیام (با کاما جدا می‌شوند)
  async function setTags(msgId: string, tags: string[]) {
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_tags", id: msgId, tags }),
      });
      const data = await res.json();
      if (data.ok) {
        setTaggingId(null);
        setTagText("");
        loadMessages();
      } else {
        setError(data.error || "tags_failed");
      }
    } catch {
      setError("network_error");
    }
  }

  // v1.1.1 (audit P1-G7): پاک‌سازی همه پیام‌ها — اکشن message_all در API بود ولی
  // هیچ دکمه‌ای به آن وصل نبود
  async function deleteAllMessages() {
    const sure = confirm(
      lang === "fa" ? "همه پیام‌ها و پاسخ‌ها حذف شوند؟ قابل بازگشت نیست!"
      : lang === "en" ? "Delete ALL messages and replies? This cannot be undone!"
      : "ALLE Nachrichten löschen? Nicht rückgängig machbar!"
    );
    if (!sure) return;
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "message_all" }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages([]);
      } else {
        setError(data.error || "clear_failed");
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
  // FIX: وقتی فیلتر/جستجو نتیجه‌ای ندارد (باید از «بدون پیام» تفکیک شود)
  const noMatchLabel = lang === "fa" ? "هیچ پیامی با این فیلتر مطابقت ندارد." : lang === "en" ? "No messages match this filter." : "Keine Nachrichten entsprechen diesem Filter.";
  // v1.1.1: برچسب‌های وضعیت
  const readLabel = lang === "fa" ? "✓ خوانده" : lang === "en" ? "✓ Mark read" : "✓ Gelesen";
  // FIX: برچسب‌های وضعیت جدید (unread → status «new»)
  const unreadLabel = lang === "fa" ? "↩ خوانده‌نشده" : lang === "en" ? "Mark unread" : "Ungelesen";
  const archiveLabel = lang === "fa" ? "📦 بایگانی" : lang === "en" ? "📦 Archive" : "📦 Archivieren";
  const searchPlaceholder = lang === "fa" ? "جستجو در پیام‌ها (نام/ایمیل/متن)..." : lang === "en" ? "Search messages (name/email/body)..." : "Nachrichten durchsuchen (Name/E-Mail/Text)...";
  const allStatusLabel = lang === "fa" ? "همه وضعیت‌ها" : lang === "en" ? "All statuses" : "Alle Status";
  const deleteAllLabel = lang === "fa" ? "🗑️ حذف همه پیام‌ها" : lang === "en" ? "🗑️ Delete all" : "🗑️ Alle löschen";
  const statusLabels: Record<string, string> = lang === "fa"
    ? { new: "🆕 جدید", read: "👁 خوانده", replied: "↩ پاسخ داده شد", archived: "📦 بایگانی" }
    : lang === "en"
    ? { new: "🆕 new", read: "👁 read", replied: "↩ replied", archived: "📦 archived" }
    : { new: "🆕 neu", read: "👁 gelesen", replied: "↩ beantwortet", archived: "📦 archiviert" };

  // FIX: فیلتر سمت کلاینت — وضعیت + جستجو در name/email/message
  // (ContactMessage فیلد subject ندارد — گزارش شده)
  const q = search.trim().toLowerCase();
  const visibleMessages = (messages || []).filter(m => {
    if (statusFilter !== "all" && (m.status || "new") !== statusFilter) return false;
    if (!q) return true;
    return [m.name, m.email, m.message]
      .some(v => typeof v === "string" && v.toLowerCase().includes(q));
  });

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
      {/* FIX: نوار جستجو + فیلتر وضعیت (سمت کلاینت روی پیام‌های بارگذاری‌شده) */}
      {messages && messages.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="admin-search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180 }}
          />
          <select
            className="dashboard-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
            aria-label="Status filter"
          >
            <option value="all">{allStatusLabel}</option>
            <option value="new">{statusLabels["new"]}</option>
            <option value="read">{statusLabels["read"]}</option>
            <option value="replied">{statusLabels["replied"]}</option>
            <option value="archived">{statusLabels["archived"]}</option>
          </select>
        </div>
      )}
      {/* v1.1.1: bulk delete — فقط وقتی حداقل یک پیام هست */}
      {messages && messages.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button onClick={deleteAllMessages} className="dashboard-btn danger" style={{ fontSize: "11px", padding: "4px 10px" }}>
            {deleteAllLabel} ({messages.length})
          </button>
        </div>
      )}
      {messages && messages.length === 0 ? (
        <p className="dashboard-empty-state">{emptyLabel}</p>
      ) : visibleMessages.length === 0 ? (
        <p className="dashboard-empty-state">{noMatchLabel}</p>
      ) : (
        <div className="dashboard-messages-list">
          {visibleMessages.map(msg => (
            <div key={msg.id} className="dashboard-message-card">
              <div className="dashboard-message-header">
                <div>
                  <strong className="dashboard-message-name">{msg.name}</strong>
                  <span className="dashboard-message-email">{msg.email}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* v1.1.1: نشان وضعیت پیام */}
                  <span style={{ fontSize: "10px", color: "var(--text-dim, #4a7a4a)" }}>
                    {statusLabels[msg.status as string] || statusLabels["new"]}
                  </span>
                  <span className="dashboard-message-date">
                    {new Date(msg.createdAt).toLocaleString("fa-IR")}
                  </span>
                </div>
              </div>
              <p className="dashboard-message-text">{msg.message}</p>
              {/* v1.0 (audit W16-20 #2): نمایش تگ‌ها */}
              {msg.tags && msg.tags.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {msg.tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      style={{
                        fontSize: "10px", padding: "2px 8px", borderRadius: 10,
                        background: "var(--bg-panel2)", border: "1px solid var(--border)",
                        color: "var(--primary-bright)", display: "inline-flex", alignItems: "center", gap: 4,
                      }}
                    >
                      #{tag.name}
                      <button
                        onClick={() => setTags(msg.id, msg.tags.filter((t: any) => t.id !== tag.id).map((t: any) => t.name))}
                        style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 10, padding: 0 }}
                        title="Remove tag"
                        aria-label="Remove tag"
                      >✕</button>
                    </span>
                  ))}
                </div>
              )}
              {/* v1.0 (audit W16-20 #2): نمایش یادداشت‌های ادمین */}
              {msg.notes && msg.notes.length > 0 && (
                <div className="dashboard-message-replies" style={{ opacity: 0.85 }}>
                  {msg.notes.map((n: any) => (
                    <p key={n.id} className="dashboard-message-reply-text" style={{ fontStyle: "italic" }}>
                      📝 {n.note}
                    </p>
                  ))}
                </div>
              )}
              {/* فرم افزودن یادداشت */}
              {notingId === msg.id && (
                <div className="dashboard-reply-form">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="یادداشت (فقط ادمین می‌بیند)..."
                    rows={2}
                    className="dashboard-reply-textarea"
                    autoFocus
                  />
                  <div className="dashboard-message-actions">
                    <button onClick={() => addNote(msg.id)} className="dashboard-btn">💾 ثبت یادداشت</button>
                    <button onClick={() => { setNotingId(null); setNoteText(""); }} className="dashboard-btn">انصراف</button>
                  </div>
                </div>
              )}
              {/* فرم تگ‌گذاری */}
              {taggingId === msg.id && (
                <div className="dashboard-reply-form">
                  <input
                    type="text"
                    value={tagText}
                    onChange={e => setTagText(e.target.value)}
                    placeholder="تگ‌ها با کاما: important, followup"
                    className="admin-search"
                    style={{ width: "100%" }}
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const tags = tagText.split(",").map(t => t.trim()).filter(Boolean);
                        if (tags.length > 0) setTags(msg.id, tags);
                      }
                    }}
                  />
                  <div className="dashboard-message-actions">
                    <button
                      onClick={() => {
                        const tags = tagText.split(",").map(t => t.trim()).filter(Boolean);
                        if (tags.length > 0) setTags(msg.id, tags);
                      }}
                      className="dashboard-btn"
                    >💾 ذخیره تگ‌ها</button>
                    <button onClick={() => { setTaggingId(null); setTagText(""); }} className="dashboard-btn">انصراف</button>
                  </div>
                </div>
              )}
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
                {/* v1.0 (audit W16-20 #2): دکمه‌های یادداشت/تگ */}
                <button
                  onClick={() => { setNotingId(notingId === msg.id ? null : msg.id); setNoteText(""); }}
                  className="dashboard-btn"
                >📝 یادداشت</button>
                <button
                  onClick={() => { setTaggingId(taggingId === msg.id ? null : msg.id); setTagText((msg.tags || []).map((t: any) => t.name).join(", ")); }}
                  className="dashboard-btn"
                >🏷️ تگ</button>
                {/* v1.1.1: علامت‌گذاری خوانده‌شده — فقط برای پیام‌های جدید */}
                {/* FIX: دکمه‌های وضعیت read/unread/archive — همگی با اکشن set_status */}
                {msg.status !== "read" && (
                  <button
                    onClick={() => setStatus(msg.id, "read")}
                    className="dashboard-btn"
                  >{readLabel}</button>
                )}
                {msg.status !== "new" && (
                  <button
                    onClick={() => setStatus(msg.id, "new")}
                    className="dashboard-btn"
                  >{unreadLabel}</button>
                )}
                {msg.status !== "archived" && (
                  <button
                    onClick={() => setStatus(msg.id, "archived")}
                    className="dashboard-btn"
                  >{archiveLabel}</button>
                )}
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
