// ============================================================================
// SettingsPanel — تب تنظیمات کامل پنل ادمین
// ============================================================================
// شامل:
// - تغییر رمز ادمین
// - تغییر نام و نام کاربری (با ۳ زبان)
// - تنظیمات ایمیل فوروارد (formsubmit.co)
// - تنظیمات Bale Bot (token, chatId)
// - تنظیمات Telegram Bot (token, chatId)
// - تنظیمات AI Provider (OpenAI/Anthropic/Ollama/Groq)
// - انتخاب زبان پنل (fa/en/de)
// - انتخاب فونت سایت
// ============================================================================

"use client";

import { useEffect, useState } from "react";

type Lang = "fa" | "en" | "de";

type Settings = {
  forwardEmail: string;
  baleEnabled: string;
  baleBotToken: string;
  baleChatId: string;
  telegramEnabled: string;
  telegramBotToken: string;
  telegramChatId: string;
  apiEnabled: string;
  adminDisplayName: string;
  adminTagline: string;
  adminStatus: string;
};

type Provider = {
  id: string;
  name: string;
  label: string;
  model: string;
  apiKey: string | null;
  baseUrl: string | null;
  enabled: boolean;
  priority: number;
};

const FONTS = [
  { id: "vazirmatn", label: "Vazirmatn (پیش‌فرض فارسی)" },
  { id: "inter", label: "Inter (مدرن انگلیسی)" },
  { id: "lora", label: "Lora (سریف کلاسیک)" },
  { id: "fira-code", label: "Fira Code (مونو)" },
  { id: "geist-mono", label: "Geist Mono (مونو مدرن)" },
];

const LANGS: { id: Lang; label: string }[] = [
  { id: "fa", label: "فارسی" },
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
];

const T = {
  fa: {
    title: "⚙️ تنظیمات پنل",
    loading: "در حال بارگذاری...",
    saved: "✅ ذخیره شد",
    error: "❌ خطا",
    networkError: "❌ خطای شبکه",
    // sections
    nameSection: "📝 نام و نام کاربری",
    nameFa: "نام (فارسی)",
    nameEn: "نام (انگلیسی)",
    nameDe: "نام (آلمانی)",
    handle: "نام کاربری (handle)",
    tagline: "شعار (tagline)",
    status: "وضعیت",
    save: "ذخیره",
    passwordSection: "🔐 تغییر رمز",
    newPassword: "رمز جدید (حداقل ۶ کاراکتر)",
    changePassword: "تغییر رمز",
    emailSection: "📧 ایمیل فوروارد",
    emailHint: "پیام‌های تماس به این ایمیل فوروارد می‌شن (رایگان با formsubmit.co)",
    yourEmail: "ایمیل شما",
    saveEmail: "ذخیره ایمیل",
    baleSection: "🤖 Bale Bot",
    baleHint: "اعلان پیام‌های جدید رو به Bale می‌فرسته",
    baleToken: "Bale Bot Token",
    baleChatId: "Bale Chat ID",
    saveBale: "ذخیره Bale",
    telegramSection: "✈️ Telegram Bot",
    telegramHint: "اعلان پیام‌های جدید رو به Telegram می‌فرسته",
    telegramToken: "Telegram Bot Token",
    telegramChatId: "Telegram Chat ID",
    saveTelegram: "ذخیره Telegram",
    aiSection: "🧠 AI Provider",
    aiHint: "پروایدرهای هوش مصنوعی برای چت ربات",
    providerName: "نام",
    providerLabel: "برچسب",
    providerModel: "مدل",
    providerApiKey: "API Key",
    providerBaseUrl: "Base URL (برای Ollama)",
    providerEnabled: "فعال",
    providerPriority: "اولویت",
    saveProvider: "ذخیره",
    addProvider: "+ پروایدر جدید",
    deleteProvider: "حذف",
    apiEnabled: "چت AI فعال",
    saveAi: "ذخیره تنظیمات AI",
    appearanceSection: "🎨 ظاهر",
    fontLabel: "فونت سایت",
    panelLangLabel: "زبان پنل",
    helpSection: "💡 راهنما",
    help1: "تغییر نام و نام کاربری بعد از refresh صفحه نمایش داده می‌شه",
    help2: "برای ایمیل: اولین بار formsubmit.co یه ایمیل تأیید می‌فرسته",
    help3: "برای Bale: token و chat ID رو از @botfather بگیر",
    help4: "برای Telegram: با @BotFather بات بساز و chat ID بگیر",
    help5: "برای Ollama محلی: baseUrl رو http://localhost:11434 بذار",
    help6: "اگه رمز رو فراموش کردی: sudo bash scripts/reset-admin-password.sh",
    show: "نمایش",
    hide: "مخفی",
  },
  en: {
    title: "⚙️ Panel Settings",
    loading: "Loading...",
    saved: "✅ Saved",
    error: "❌ Error",
    networkError: "❌ Network error",
    nameSection: "📝 Name & Handle",
    nameFa: "Name (Persian)",
    nameEn: "Name (English)",
    nameDe: "Name (German)",
    handle: "Username (handle)",
    tagline: "Tagline",
    status: "Status",
    save: "Save",
    passwordSection: "🔐 Change Password",
    newPassword: "New password (min 6 chars)",
    changePassword: "Change Password",
    emailSection: "📧 Forward Email",
    emailHint: "Contact messages are forwarded to this email (free with formsubmit.co)",
    yourEmail: "Your email",
    saveEmail: "Save Email",
    baleSection: "🤖 Bale Bot",
    baleHint: "Sends notifications to Bale",
    baleToken: "Bale Bot Token",
    baleChatId: "Bale Chat ID",
    saveBale: "Save Bale",
    telegramSection: "✈️ Telegram Bot",
    telegramHint: "Sends notifications to Telegram",
    telegramToken: "Telegram Bot Token",
    telegramChatId: "Telegram Chat ID",
    saveTelegram: "Save Telegram",
    aiSection: "🧠 AI Provider",
    aiHint: "AI providers for chat bot",
    providerName: "Name",
    providerLabel: "Label",
    providerModel: "Model",
    providerApiKey: "API Key",
    providerBaseUrl: "Base URL (for Ollama)",
    providerEnabled: "Enabled",
    providerPriority: "Priority",
    saveProvider: "Save",
    addProvider: "+ New Provider",
    deleteProvider: "Delete",
    apiEnabled: "AI Chat Enabled",
    saveAi: "Save AI Settings",
    appearanceSection: "🎨 Appearance",
    fontLabel: "Site Font",
    panelLangLabel: "Panel Language",
    helpSection: "💡 Help",
    help1: "Name and handle changes appear after page refresh",
    help2: "For email: formsubmit.co sends a confirmation email on first use",
    help3: "For Bale: get token and chat ID from @botfather",
    help4: "For Telegram: create bot with @BotFather and get chat ID",
    help5: "For local Ollama: set baseUrl to http://localhost:11434",
    help6: "If you forget password: sudo bash scripts/reset-admin-password.sh",
    show: "Show",
    hide: "Hide",
  },
  de: {
    title: "⚙️ Einstellungen",
    loading: "Laden...",
    saved: "✅ Gespeichert",
    error: "❌ Fehler",
    networkError: "❌ Netzwerkfehler",
    nameSection: "📝 Name & Handle",
    nameFa: "Name (Persisch)",
    nameEn: "Name (Englisch)",
    nameDe: "Name (Deutsch)",
    handle: "Benutzername (handle)",
    tagline: "Tagline",
    status: "Status",
    save: "Speichern",
    passwordSection: "🔐 Passwort ändern",
    newPassword: "Neues Passwort (min 6 Zeichen)",
    changePassword: "Passwort ändern",
    emailSection: "📧 Weiterleitungs-E-Mail",
    emailHint: "Kontaktnachrichten werden an diese E-Mail weitergeleitet (kostenlos mit formsubmit.co)",
    yourEmail: "Ihre E-Mail",
    saveEmail: "E-Mail speichern",
    baleSection: "🤖 Bale Bot",
    baleHint: "Sendet Benachrichtigungen an Bale",
    baleToken: "Bale Bot Token",
    baleChatId: "Bale Chat ID",
    saveBale: "Bale speichern",
    telegramSection: "✈️ Telegram Bot",
    telegramHint: "Sendet Benachrichtigungen an Telegram",
    telegramToken: "Telegram Bot Token",
    telegramChatId: "Telegram Chat ID",
    saveTelegram: "Telegram speichern",
    aiSection: "🧠 AI Provider",
    aiHint: "KI-Anbieter für Chatbot",
    providerName: "Name",
    providerLabel: "Label",
    providerModel: "Modell",
    providerApiKey: "API-Key",
    providerBaseUrl: "Base URL (für Ollama)",
    providerEnabled: "Aktiviert",
    providerPriority: "Priorität",
    saveProvider: "Speichern",
    addProvider: "+ Neuer Anbieter",
    deleteProvider: "Löschen",
    apiEnabled: "KI-Chat aktiviert",
    saveAi: "AI-Einstellungen speichern",
    appearanceSection: "🎨 Erscheinungsbild",
    fontLabel: "Seiten-Schriftart",
    panelLangLabel: "Panel-Sprache",
    helpSection: "💡 Hilfe",
    help1: "Namensänderungen erscheinen nach Aktualisierung",
    help2: "Für E-Mail: formsubmit.co sendet Bestätigungsmail beim ersten Gebrauch",
    help3: "Für Bale: Token und Chat-ID von @botfather holen",
    help4: "Für Telegram: Bot mit @BotFather erstellen und Chat-ID holen",
    help5: "Für lokales Ollama: baseUrl auf http://localhost:11434 setzen",
    help6: "Passwort vergessen: sudo bash scripts/reset-admin-password.sh",
    show: "Zeigen",
    hide: "Verbergen",
  },
};

export default function SettingsPanel() {
  const [panelLang, setPanelLang] = useState<Lang>("fa");
  const [settings, setSettings] = useState<Settings>({
    forwardEmail: "",
    baleEnabled: "false",
    baleBotToken: "",
    baleChatId: "",
    telegramEnabled: "false",
    telegramBotToken: "",
    telegramChatId: "",
    apiEnabled: "true",
    adminDisplayName: "",
    adminTagline: "",
    adminStatus: "",
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [nameFa, setNameFa] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [taglineFa, setTaglineFa] = useState("");
  const [taglineEn, setTaglineEn] = useState("");
  const [taglineDe, setTaglineDe] = useState("");
  const [currentFont, setCurrentFont] = useState("vazirmatn");
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  const t = T[panelLang];

  useEffect(() => {
    // Load panel language from localStorage
    const savedLang = (localStorage.getItem("panel_lang") as Lang) || "fa";
    setPanelLang(savedLang);
    document.documentElement.lang = savedLang;
    document.documentElement.dir = savedLang === "fa" ? "rtl" : "ltr";

    // Load font
    const savedFont = localStorage.getItem("site_font") || "vazirmatn";
    setCurrentFont(savedFont);

    loadSettings();
    loadProviders();
  }, []);

  function switchPanelLang(lang: Lang) {
    setPanelLang(lang);
    localStorage.setItem("panel_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
  }

  function switchFont(fontId: string) {
    setCurrentFont(fontId);
    localStorage.setItem("site_font", fontId);
    document.documentElement.setAttribute("data-font", fontId);
  }

  async function loadSettings() {
    try {
      // Load main settings + content settings (for name and tagline)
      const [settingsRes, emailRes, contentRes] = await Promise.all([
        fetch("/api/admin/settings", { credentials: "include" }),
        fetch("/api/admin/email", { credentials: "include" }),
        fetch("/api/content", { credentials: "include" }),
      ]);
      const settingsData = await settingsRes.json();
      const emailData = await emailRes.json();
      const contentData = await contentRes.json();

      if (settingsData.ok) {
        const s = settingsData.settings || {};
        setSettings(prev => ({
          ...prev,
          baleEnabled: s.baleEnabled || "false",
          baleBotToken: s.baleBotToken || "",
          baleChatId: s.baleChatId || "",
          adminDisplayName: s.adminDisplayName || "",
          adminTagline: s.adminTagline || "",
          adminStatus: s.adminStatus || "",
          apiEnabled: s.apiEnabled || "true",
          telegramBotToken: s.telegramBotToken || "",
          telegramChatId: s.telegramChatId || "",
          telegramEnabled: s.telegramEnabled || "false",
        }));
      }
      if (emailData.ok) {
        setSettings(prev => ({ ...prev, forwardEmail: emailData.email || "" }));
      }
      // Load name and tagline from content settings (returned by /api/content)
      if (contentData.ok && contentData.settings) {
        const cs = contentData.settings;
        setNameFa(cs.name_fa || "");
        setNameEn(cs.name_en || "");
        setNameDe(cs.name_de || "");
        setTaglineFa(cs.tagline_fa || "");
        setTaglineEn(cs.tagline_en || "");
        setTaglineDe(cs.tagline_de || "");
        setNewHandle(cs.handle || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadProviders() {
    try {
      const res = await fetch("/api/admin/providers", { credentials: "include" });
      const data = await res.json();
      if (data.ok) setProviders(data.providers || []);
    } catch {}
  }

  function showMessage(text: string, isError = false) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }

  async function postJSON(url: string, body: any): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return { ok: !!data.ok, error: data.error };
    } catch {
      return { ok: false, error: "network" };
    }
  }

  // --- change password ---
  async function changePassword() {
    if (!currentPassword) {
      showMessage(t.error + ": " + (panelLang === "fa" ? "رمز فعلی الزامی" : "Current password required"), true);
      return;
    }
    if (newPassword.length < 6) {
      showMessage(t.error + ": " + (panelLang === "fa" ? "رمز جدید حداقل ۶ کاراکتر" : "New password min 6 chars"), true);
      return;
    }
    if (currentPassword === newPassword) {
      showMessage(t.error + ": " + (panelLang === "fa" ? "رمز جدید باید متفاوت باشد" : "New password must differ"), true);
      return;
    }
    const result = await postJSON("/api/admin/security", {
      action: "change_password",
      currentPassword,
      newPassword,
    });
    if (result.ok) {
      showMessage(t.saved);
      setCurrentPassword("");
      setNewPassword("");
    } else {
      const errMap: Record<string, { fa: string; en: string; de: string }> = {
        wrong_current_password: { fa: "رمز فعلی اشتباه", en: "Wrong current password", de: "Falsches aktuelles Passwort" },
        current_password_required: { fa: "رمز فعلی الزامی", en: "Current password required", de: "Aktuelles Passwort erforderlich" },
        password_too_short: { fa: "رمز جدید کوتاه است", en: "Password too short", de: "Passwort zu kurz" },
      };
      const errMsg = errMap[result.error || ""]?.[panelLang] || result.error || "";
      showMessage(t.error + ": " + errMsg, true);
    }
  }

  // --- change handle ---
  async function changeHandle() {
    if (!newHandle.trim()) return;
    const result = await postJSON("/api/admin/security", {
      action: "change_handle",
      newHandle: newHandle.trim(),
    });
    if (result.ok) {
      showMessage(panelLang === "fa" ? "✅ نام کاربری عوض شد. صفحه را refresh کنید." : "✅ Handle changed. Refresh page.");
      setNewHandle("");
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- change name (multi-lang) ---
  async function changeName(lang: Lang, value: string) {
    if (!value.trim()) return;
    const result = await postJSON("/api/admin/security", {
      action: "change_name",
      newName: value.trim(),
      lang,
    });
    if (result.ok) {
      showMessage(panelLang === "fa" ? "✅ نام ذخیره شد." : "✅ Name saved.");
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- change tagline (multi-lang) ---
  async function changeTagline(lang: Lang, value: string) {
    const result = await postJSON("/api/admin/security", {
      action: "change_tagline",
      newTagline: value,
      lang,
    });
    if (result.ok) {
      showMessage(panelLang === "fa" ? "✅ شعار ذخیره شد." : "✅ Tagline saved.");
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- save email ---
  async function saveEmail() {
    const email = settings.forwardEmail.trim();
    if (!email || !email.includes("@")) {
      showMessage(t.error + ": invalid email", true);
      return;
    }
    const result = await postJSON("/api/admin/email", { action: "set_email", email });
    if (result.ok) {
      showMessage(t.saved);
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- save Bale ---
  async function saveBale() {
    const result = await postJSON("/api/admin/settings", {
      settings: {
        baleBotToken: settings.baleBotToken,
        baleChatId: settings.baleChatId,
        baleEnabled: settings.baleBotToken ? "true" : "false",
      },
    });
    if (result.ok) {
      showMessage(t.saved);
      loadProviders();
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- save Telegram ---
  async function saveTelegram() {
    const result = await postJSON("/api/admin/settings", {
      settings: {
        telegramBotToken: settings.telegramBotToken,
        telegramChatId: settings.telegramChatId,
        telegramEnabled: settings.telegramBotToken ? "true" : "false",
      },
    });
    if (result.ok) {
      showMessage(t.saved);
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- save AI ---
  async function saveAi() {
    const result = await postJSON("/api/admin/settings", {
      settings: {
        apiEnabled: settings.apiEnabled,
        adminTagline: settings.adminTagline,
        adminStatus: settings.adminStatus,
      },
    });
    if (result.ok) {
      showMessage(t.saved);
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- save provider ---
  async function saveProvider(p: Provider) {
    const isNew = !p.id;
    const result = await postJSON("/api/admin/providers", {
      action: isNew ? "create" : "update",
      id: p.id || undefined,
      data: {
        name: p.name,
        label: p.label,
        model: p.model,
        apiKey: p.apiKey && !p.apiKey.startsWith("••••") ? p.apiKey : undefined,
        baseUrl: p.baseUrl,
        enabled: p.enabled,
        priority: p.priority,
      },
    });
    if (result.ok) {
      showMessage(t.saved);
      setEditingProvider(null);
      loadProviders();
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- delete provider ---
  async function deleteProvider(id: string) {
    if (!confirm(panelLang === "fa" ? "حذف؟" : "Delete?")) return;
    const result = await postJSON("/api/admin/providers", { action: "delete", id });
    if (result.ok) {
      showMessage(t.saved);
      loadProviders();
    } else {
      showMessage(t.error + ": " + (result.error || ""), true);
    }
  }

  // --- toggle provider ---
  async function toggleProvider(id: string) {
    const result = await postJSON("/api/admin/providers", { action: "toggle", id });
    if (result.ok) loadProviders();
  }

  if (loading) {
    return <div className="settings-loading">{t.loading}</div>;
  }

  return (
    <div className="settings-root" dir={panelLang === "fa" ? "rtl" : "ltr"}>
      {message && (
        <div className={`settings-toast ${message.startsWith("✅") ? "success" : "error"}`}>
          {message}
        </div>
      )}

      {/* Appearance section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.appearanceSection}</h4>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">{t.panelLangLabel}</label>
            <select
              value={panelLang}
              onChange={e => switchPanelLang(e.target.value as Lang)}
              className="settings-select"
            >
              {LANGS.map(l => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="settings-field">
            <label className="settings-label">{t.fontLabel}</label>
            <select
              value={currentFont}
              onChange={e => switchFont(e.target.value)}
              className="settings-select"
            >
              {FONTS.map(f => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Name section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.nameSection}</h4>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">{t.nameFa}</label>
            <input
              type="text"
              value={nameFa}
              onChange={e => setNameFa(e.target.value)}
              className="settings-input"
              dir="rtl"
            />
            <button onClick={() => changeName("fa", nameFa)} className="settings-btn-small">{t.save}</button>
          </div>
          <div className="settings-field">
            <label className="settings-label">{t.nameEn}</label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              className="settings-input"
              dir="ltr"
            />
            <button onClick={() => changeName("en", nameEn)} className="settings-btn-small">{t.save}</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">{t.nameDe}</label>
            <input
              type="text"
              value={nameDe}
              onChange={e => setNameDe(e.target.value)}
              className="settings-input"
              dir="ltr"
            />
            <button onClick={() => changeName("de", nameDe)} className="settings-btn-small">{t.save}</button>
          </div>
          <div className="settings-field">
            <label className="settings-label">{t.handle}</label>
            <input
              type="text"
              value={newHandle}
              onChange={e => setNewHandle(e.target.value)}
              placeholder="@handle"
              className="settings-input"
              dir="ltr"
            />
            <button onClick={changeHandle} className="settings-btn-small">{t.save}</button>
          </div>
        </div>
      </div>

      {/* Tagline section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{panelLang === "fa" ? "💭 شعار (Tagline)" : panelLang === "de" ? "💭 Tagline" : "💭 Tagline"}</h4>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">{t.nameFa}</label>
            <input
              type="text"
              value={taglineFa}
              onChange={e => setTaglineFa(e.target.value)}
              placeholder={panelLang === "fa" ? "شعار فارسی" : "Persian tagline"}
              className="settings-input"
              dir="rtl"
            />
            <button onClick={() => changeTagline("fa", taglineFa)} className="settings-btn-small">{t.save}</button>
          </div>
          <div className="settings-field">
            <label className="settings-label">{t.nameEn}</label>
            <input
              type="text"
              value={taglineEn}
              onChange={e => setTaglineEn(e.target.value)}
              placeholder="English tagline"
              className="settings-input"
              dir="ltr"
            />
            <button onClick={() => changeTagline("en", taglineEn)} className="settings-btn-small">{t.save}</button>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-field">
            <label className="settings-label">{t.nameDe}</label>
            <input
              type="text"
              value={taglineDe}
              onChange={e => setTaglineDe(e.target.value)}
              placeholder="Deutsche Tagline"
              className="settings-input"
              dir="ltr"
            />
            <button onClick={() => changeTagline("de", taglineDe)} className="settings-btn-small">{t.save}</button>
          </div>
        </div>
      </div>

      {/* Password section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.passwordSection}</h4>
        <label className="settings-label">{panelLang === "fa" ? "رمز فعلی" : panelLang === "de" ? "Aktuelles Passwort" : "Current password"}</label>
        <div className="settings-input-row">
          <input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="settings-input"
            dir="ltr"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="settings-btn-icon"
            aria-label={showPassword ? t.hide : t.show}
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>
        <label className="settings-label">{t.newPassword}</label>
        <input
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="••••••••"
          className="settings-input"
          dir="ltr"
          autoComplete="new-password"
        />
        <button onClick={changePassword} className="settings-btn">{t.changePassword}</button>
      </div>

      {/* Email section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.emailSection}</h4>
        <p className="settings-hint">{t.emailHint}</p>
        <label className="settings-label">{t.yourEmail}</label>
        <input
          type="email"
          value={settings.forwardEmail}
          onChange={e => setSettings({ ...settings, forwardEmail: e.target.value })}
          placeholder="your@email.com"
          className="settings-input"
          dir="ltr"
        />
        <button onClick={saveEmail} className="settings-btn">{t.saveEmail}</button>
      </div>

      {/* Bale section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.baleSection}</h4>
        <p className="settings-hint">{t.baleHint}</p>
        <label className="settings-label">{t.baleToken}</label>
        <input
          type="password"
          value={settings.baleBotToken}
          onChange={e => setSettings({ ...settings, baleBotToken: e.target.value })}
          placeholder="123456789:ABCdef..."
          className="settings-input"
          dir="ltr"
        />
        <label className="settings-label">{t.baleChatId}</label>
        <input
          type="text"
          value={settings.baleChatId}
          onChange={e => setSettings({ ...settings, baleChatId: e.target.value })}
          placeholder="123456789"
          className="settings-input"
          dir="ltr"
        />
        <button onClick={saveBale} className="settings-btn">{t.saveBale}</button>
      </div>

      {/* Telegram section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.telegramSection}</h4>
        <p className="settings-hint">{t.telegramHint}</p>
        <label className="settings-label">{t.telegramToken}</label>
        <input
          type="password"
          value={settings.telegramBotToken}
          onChange={e => setSettings({ ...settings, telegramBotToken: e.target.value })}
          placeholder="123456789:ABCdef..."
          className="settings-input"
          dir="ltr"
        />
        <label className="settings-label">{t.telegramChatId}</label>
        <input
          type="text"
          value={settings.telegramChatId}
          onChange={e => setSettings({ ...settings, telegramChatId: e.target.value })}
          placeholder="123456789"
          className="settings-input"
          dir="ltr"
        />
        <button onClick={saveTelegram} className="settings-btn">{t.saveTelegram}</button>
      </div>

      {/* AI Providers section */}
      <div className="settings-card">
        <h4 className="settings-card-title">{t.aiSection}</h4>
        <p className="settings-hint">{t.aiHint}</p>
        <div className="settings-checkbox-row">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={settings.apiEnabled === "true"}
              onChange={e => setSettings({ ...settings, apiEnabled: e.target.checked ? "true" : "false" })}
            />
            <span>{t.apiEnabled}</span>
          </label>
          <button onClick={saveAi} className="settings-btn">{t.saveAi}</button>
        </div>

        <div className="settings-providers-list">
          {providers.map(p => (
            <div key={p.id} className="settings-provider-item">
              <div className="settings-provider-info">
                <strong>{p.label}</strong>
                <span className="settings-provider-model">{p.model}</span>
                <span className={`settings-provider-status ${p.enabled ? "on" : "off"}`}>
                  {p.enabled ? "●" : "○"}
                </span>
              </div>
              <div className="settings-provider-actions">
                <button onClick={() => toggleProvider(p.id)} className="settings-btn-small">
                  {p.enabled ? "Disable" : "Enable"}
                </button>
                <button onClick={() => setEditingProvider({ ...p })} className="settings-btn-small">
                  Edit
                </button>
                <button onClick={() => deleteProvider(p.id)} className="settings-btn-small danger">
                  {t.deleteProvider}
                </button>
              </div>
            </div>
          ))}
          {providers.length === 0 && (
            <p className="settings-empty">No providers configured.</p>
          )}
        </div>

        <button
          onClick={() => setEditingProvider({
            id: "",
            name: "custom",
            label: "New Provider",
            model: "",
            apiKey: "",
            baseUrl: "",
            enabled: false,
            priority: 99,
          })}
          className="settings-btn"
        >
          {t.addProvider}
        </button>

        {editingProvider && (
          <div className="settings-provider-editor">
            <h5>{editingProvider.id ? "Edit" : "New"} Provider</h5>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">{t.providerName}</label>
                <input
                  type="text"
                  value={editingProvider.name}
                  onChange={e => setEditingProvider({ ...editingProvider, name: e.target.value })}
                  className="settings-input"
                  dir="ltr"
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t.providerLabel}</label>
                <input
                  type="text"
                  value={editingProvider.label}
                  onChange={e => setEditingProvider({ ...editingProvider, label: e.target.value })}
                  className="settings-input"
                />
              </div>
            </div>
            <div className="settings-row">
              <div className="settings-field">
                <label className="settings-label">{t.providerModel}</label>
                <input
                  type="text"
                  value={editingProvider.model}
                  onChange={e => setEditingProvider({ ...editingProvider, model: e.target.value })}
                  placeholder="gpt-4, llama3, ..."
                  className="settings-input"
                  dir="ltr"
                />
              </div>
              <div className="settings-field">
                <label className="settings-label">{t.providerPriority}</label>
                <input
                  type="number"
                  value={editingProvider.priority}
                  onChange={e => setEditingProvider({ ...editingProvider, priority: Number(e.target.value) })}
                  className="settings-input"
                  dir="ltr"
                />
              </div>
            </div>
            <label className="settings-label">{t.providerApiKey}</label>
            <input
              type="password"
              value={editingProvider.apiKey || ""}
              onChange={e => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
              placeholder={editingProvider.apiKey?.startsWith("••••") ? "(unchanged)" : "sk-..."}
              className="settings-input"
              dir="ltr"
            />
            <label className="settings-label">{t.providerBaseUrl}</label>
            <input
              type="url"
              value={editingProvider.baseUrl || ""}
              onChange={e => setEditingProvider({ ...editingProvider, baseUrl: e.target.value })}
              placeholder="https://api.openai.com/v1 or http://localhost:11434"
              className="settings-input"
              dir="ltr"
            />
            <div className="settings-checkbox-row">
              <label className="settings-checkbox-label">
                <input
                  type="checkbox"
                  checked={editingProvider.enabled}
                  onChange={e => setEditingProvider({ ...editingProvider, enabled: e.target.checked })}
                />
                <span>{t.providerEnabled}</span>
              </label>
            </div>
            <div className="settings-actions">
              <button onClick={() => saveProvider(editingProvider)} className="settings-btn">
                {t.saveProvider}
              </button>
              <button onClick={() => setEditingProvider(null)} className="settings-btn-small">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Help section */}
      <div className="settings-card settings-help-card">
        <h4 className="settings-card-title">{t.helpSection}</h4>
        <ul className="settings-help-list">
          <li>{t.help1}</li>
          <li>{t.help2}</li>
          <li>{t.help3}</li>
          <li>{t.help4}</li>
          <li>{t.help5}</li>
          <li>{t.help6}</li>
        </ul>
      </div>
    </div>
  );
}
