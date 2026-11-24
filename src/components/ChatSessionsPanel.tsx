// ============================================================================
// ChatSessionsPanel — تب چت‌های سایت (پنل ادمین، V18.3)
// ============================================================================
// نمایش session های چت AI سایت:
// - سایدبار لیست session ها (visitorId کوتاه، updatedAt، تعداد پیام)
// - نمای پیام‌های session انتخاب‌شده (حباب‌های رنگی بر اساس role)
// - پاسخ ادمین به session (POST /api/admin/chat-reply)
// - رفرش خودکار هر ۳۰ ثانیه
// - سه‌زبانه fa/en/de — هم‌سبک با بقیه داشبورد
// ============================================================================

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Lang = "fa" | "en" | "de";

type ChatMessage = {
  id: string;
  role: string; // "user" | "assistant"
  content: string;
  createdAt: string;
};

type ChatSession = {
  id: string;
  visitorId: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

// --- Trilingual labels ---
const T = {
  fa: {
    help: "💡 چت‌هایی که بازدیدکنندگان با دستیار AI سایت داشتن. یک session رو انتخاب کن تا پیام‌هاش رو ببینی و مستقیم جواب بدی.",
    sessions: "جلسات",
    messages: "پیام‌ها",
    visitor: "بازدیدکننده",
    you: "دستیار/ادمین",
    replyPlaceholder: "پاسخ خود را بنویسید (به‌عنوان پیام دستیار در چت ثبت می‌شود)...",
    send: "📤 ارسال",
    sending: "⏳ در حال ارسال...",
    refresh: "🔄 رفرش",
    loading: "در حال بارگذاری چت‌ها...",
    emptySessions: "هنوز چتی شروع نشده.",
    emptySession: "یک جلسه را از لیست انتخاب کنید.",
    noMessages: "این جلسه پیامی ندارد.",
    messagesCount: "پیام",
    lastUpdate: "آخرین فعالیت",
    error: "❌ خطا",
    networkError: "خطای شبکه",
    sendFailed: "ارسال پاسخ ناموفق بود",
    sessionDeleted: "این جلسه دیگر وجود ندارد.",
    deleteSession: "🗑 حذف جلسه",
    deleteMessage: "حذف پیام",
    banIp: "🚫 مسدودسازی IP این جلسه",
    banConfirm: "IP {ip} مسدود (block) شود؟",
    banSuccess: "✅ IP مسدود شد:",
    banNoIp: "این جلسه IP ثبت‌شده ندارد.",
    banFailed: "مسدودسازی ناموفق بود",
    deleteAll: "🗑 حذف همه چت‌ها",
    confirmDeleteSession: "این جلسه چت و همه پیام‌هایش حذف شود؟",
    confirmDeleteAll: "همه جلسات چت و پیام‌ها حذف شوند؟ قابل بازگشت نیست!",
    deleteFailed: "حذف ناموفق بود",
    deleted: "✅ حذف شد",
  },
  en: {
    help: "💡 AI chat sessions from site visitors. Select a session to read its messages and reply directly.",
    sessions: "Sessions",
    messages: "Messages",
    visitor: "Visitor",
    you: "Assistant/Admin",
    replyPlaceholder: "Type your reply (injected as an assistant message)...",
    send: "📤 Send",
    sending: "⏳ Sending...",
    refresh: "🔄 Refresh",
    loading: "Loading chats...",
    emptySessions: "No chat sessions yet.",
    emptySession: "Select a session from the list.",
    noMessages: "This session has no messages.",
    messagesCount: "msgs",
    lastUpdate: "Last activity",
    error: "❌ Error",
    networkError: "Network error",
    sendFailed: "Reply could not be sent",
    sessionDeleted: "This session no longer exists.",
    deleteSession: "🗑 Delete session",
    deleteMessage: "Delete message",
    banIp: "🚫 Ban session IP",
    banConfirm: "Block (ban) IP {ip}?",
    banSuccess: "✅ IP blocked:",
    banNoIp: "This session has no recorded IP.",
    banFailed: "Ban failed",
    deleteAll: "🗑 Delete all chats",
    confirmDeleteSession: "Delete this chat session and all its messages?",
    confirmDeleteAll: "Delete ALL chat sessions and messages? This cannot be undone!",
    deleteFailed: "Delete failed",
    deleted: "✅ Deleted",
  },
  de: {
    help: "💡 KI-Chat-Sitzungen der Besucher. Wählen Sie eine Sitzung, um die Nachrichten zu lesen und direkt zu antworten.",
    sessions: "Sitzungen",
    messages: "Nachrichten",
    visitor: "Besucher",
    you: "Assistent/Admin",
    replyPlaceholder: "Antwort eingeben (wird als Assistent-Nachricht eingefügt)...",
    send: "📤 Senden",
    sending: "⏳ Senden...",
    refresh: "🔄 Aktualisieren",
    loading: "Chats laden...",
    emptySessions: "Noch keine Chat-Sitzungen.",
    emptySession: "Wählen Sie eine Sitzung aus der Liste.",
    noMessages: "Diese Sitzung hat keine Nachrichten.",
    messagesCount: "Nachr.",
    lastUpdate: "Letzte Aktivität",
    error: "❌ Fehler",
    networkError: "Netzwerkfehler",
    sendFailed: "Antwort konnte nicht gesendet werden",
    sessionDeleted: "Diese Sitzung existiert nicht mehr.",
    deleteSession: "🗑 Sitzung löschen",
    deleteMessage: "Nachricht löschen",
    banIp: "🚫 IP der Sitzung sperren",
    banConfirm: "IP {ip} sperren (blocken)?",
    banSuccess: "✅ IP gesperrt:",
    banNoIp: "Diese Sitzung hat keine gespeicherte IP.",
    banFailed: "Sperren fehlgeschlagen",
    deleteAll: "🗑 Alle Chats löschen",
    confirmDeleteSession: "Diese Sitzung und alle Nachrichten löschen?",
    confirmDeleteAll: "ALLE Sitzungen und Nachrichten löschen? Nicht rückgängig machbar!",
    deleteFailed: "Löschen fehlgeschlagen",
    deleted: "✅ Gelöscht",
  },
} as const;

function localeOf(lang: Lang): string {
  return lang === "fa" ? "fa-IR" : lang === "de" ? "de-DE" : "en-US";
}

export default function ChatSessionsPanel({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [sessions, setSessions] = useState<ChatSession[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;
  const loadedRef = useRef(false);

  // --- Load sessions (GET /api/chat — admin branch) ---
  const loadSessions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const isFirstLoad = !loadedRef.current;
    try {
      const res = await fetch("/api/chat", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        const list: ChatSession[] = Array.isArray(data.sessions) ? data.sessions : [];
        setSessions(list);
        setError("");
        // اگه session انتخاب‌شده حذف شده بود، انتخاب رو پاک کن
        const current = selectedRef.current;
        if (current && !list.some(s => s.id === current)) {
          setSelectedId(null);
        }
      } else {
        setError((data && data.error) || "load_failed");
        // فقط در اولین load لیست رو خالی کن (نه در refresh های بعدی)
        if (isFirstLoad) setSessions([]);
      }
    } catch {
      setError(t.networkError);
      if (isFirstLoad) setSessions([]);
    } finally {
      loadedRef.current = true;
      if (!silent) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    loadSessions();
    const interval = setInterval(() => {
      loadSessions(true);
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadSessions]);

  // --- Send admin reply (POST /api/admin/chat-reply {sessionId, reply}) ---
  async function sendReply() {
    const sessionId = selectedId;
    if (!sessionId || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/chat-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sessionId, reply: replyText }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setReplyText("");
        await loadSessions(true);
      } else {
        setError((data && data.error) || t.sendFailed);
      }
    } catch {
      setError(t.networkError);
    } finally {
      setSending(false);
    }
  }

  // --- v1.1.1 (audit P1-G1): حذف جلسه چت — API از قبل وجود داشت (clear chat_session)
  // ولی هیچ دکمه‌ای در UI به آن وصل نبود
  async function deleteSession(sessionId: string) {
    if (!confirm(t.confirmDeleteSession)) return;
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "chat_session", id: sessionId }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        if (selectedRef.current === sessionId) setSelectedId(null);
        setError("");
        // v1.0 rev3 (audit PANEL-b A3): بازخورد موفقیت — برچسب t.deleted از قبل
        // تعریف شده بود ولی هیچ‌جا استفاده نمی‌شد
        setNotice(t.deleted);
        await loadSessions(true);
      } else {
        setError((data && data.error) || t.deleteFailed);
      }
    } catch {
      setError(t.networkError);
    }
  }

  // --- v1.1.1 (audit P1-G7): حذف همه چت‌ها — clear chat_all
  async function deleteAllChats() {
    if (!confirm(t.confirmDeleteAll)) return;
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "chat_all" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setSelectedId(null);
        setError("");
        await loadSessions(true);
      } else {
        setError((data && data.error) || t.deleteFailed);
      }
    } catch {
      setError(t.networkError);
    }
  }

  // --- FIX-2: مسدودسازی IP جلسه — POST /api/admin/security-dashboard {action:"block", ip}
  // (شکل درخواست از خود route خوانده شد؛ نکته: action block در security-dashboard
  //  هست نه /api/admin/security)
  async function banSessionIp(session: ChatSession) {
    const ip = (session.ip || "").trim();
    if (!ip) {
      setNotice("");
      setError(t.banNoIp);
      return;
    }
    if (!window.confirm(t.banConfirm.replace("{ip}", ip))) return;
    try {
      const res = await fetch("/api/admin/security-dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "block", ip, reason: "Blocked from chat sessions panel" }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setError("");
        setNotice(`${t.banSuccess} ${ip}`);
        await loadSessions(true);
      } else {
        setNotice("");
        setError(`${t.banFailed}: ${(data && data.error) || "unknown"}`);
      }
    } catch {
      setNotice("");
      setError(t.networkError);
    }
  }

  // --- FIX-2: حذف تکی پیام — POST /api/admin/clear {target:"chat_message", id}
  async function deleteMessage(messageId: string) {
    try {
      const res = await fetch("/api/admin/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ target: "chat_message", id: messageId }),
      });
      const data = await res.json().catch(() => null);
      if (data && data.ok) {
        setError("");
        // v1.0 rev3 (audit PANEL-b A3): بازخورد موفقیت
        setNotice(t.deleted);
        await loadSessions(true);
      } else {
        setError(`${t.deleteFailed}: ${(data && data.error) || "unknown"}`);
      }
    } catch {
      setError(t.networkError);
    }
  }

  const selected = sessions?.find(s => s.id === selectedId) || null;

  return (
    <div>
      {error && (
        <div
          className="dashboard-access-warning"
          role="alert"
          style={{ background: "rgba(255,0,64,0.1)", borderColor: "var(--red, #ff0040)", color: "var(--red, #ff0040)" }}
        >
          {t.error}: {error}
        </div>
      )}

      {notice && (
        <div
          className="dashboard-access-warning"
          role="status"
          style={{ background: "rgba(0,255,65,0.08)", borderColor: "var(--green, #00ff41)", color: "var(--green-bright, #39ff14)" }}
        >
          {notice}
        </div>
      )}

      <div className="dashboard-help-box">{t.help}</div>

      {loading ? (
        <div className="dashboard-empty-state">{t.loading}</div>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "14px",
            alignItems: "stretch",
            flexWrap: "wrap",
          }}
        >
          {/* --- Sessions sidebar --- */}
          <div
            style={{
              flex: "1 1 260px",
              maxWidth: "340px",
              minWidth: "240px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)" }}>
                {t.sessions} {sessions !== null && `(${sessions.length})`}
              </strong>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => loadSessions()} className="dashboard-btn" style={{ fontSize: "11px", padding: "4px 10px" }}>
                  {t.refresh}
                </button>
                {sessions !== null && sessions.length > 0 && (
                  <button
                    onClick={deleteAllChats}
                    className="dashboard-btn"
                    style={{ fontSize: "11px", padding: "4px 10px", borderColor: "var(--red, #ff0040)", color: "var(--red, #ff0040)" }}
                  >
                    {t.deleteAll}
                  </button>
                )}
              </div>
            </div>

            {sessions !== null && sessions.length === 0 && (
              <p className="dashboard-empty-state">{t.emptySessions}</p>
            )}

            <div
              className="dashboard-messages-list"
              style={{ gap: "8px", maxHeight: "560px", overflowY: "auto", paddingRight: "4px", paddingLeft: "4px" }}
            >
              {sessions?.map(s => {
                const isActive = s.id === selectedId;
                return (
                  // FIX-2: div با role="button" — button تو در تو (دکمه حذف داخل button)
                  // نامعتبر بود و hydration mismatch می‌داد
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => { setSelectedId(s.id); setReplyText(""); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(s.id);
                        setReplyText("");
                      }
                    }}
                    className="dashboard-message-card"
                    style={{
                      cursor: "pointer",
                      textAlign: "start",
                      width: "100%",
                      borderColor: isActive ? "var(--green, #00ff41)" : undefined,
                      background: isActive ? "rgba(0,255,65,0.06)" : undefined,
                      padding: "10px 12px",
                      font: "inherit",
                      color: "inherit",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "6px", alignItems: "baseline", flexWrap: "wrap" }}>
                      <strong style={{ fontSize: "12px", color: "var(--green-bright, #39ff14)", wordBreak: "break-all" }}>
                        {s.visitorId.length > 12 ? s.visitorId.slice(0, 12) + "…" : s.visitorId}
                      </strong>
                      <span style={{ fontSize: "10px", color: "var(--text-dim, #4a7a4a)", whiteSpace: "nowrap" }}>
                        {s.messages.length} {t.messagesCount}
                      </span>
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-dim, #4a7a4a)", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                      <span>
                        {t.lastUpdate}: {new Date(s.updatedAt).toLocaleString(localeOf(lang))}
                      </span>
                      <span style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); banSessionIp(s); }}
                          title={t.banIp}
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            cursor: "pointer",
                            background: "transparent",
                            border: "1px solid var(--red, #ff0040)",
                            borderRadius: "6px",
                            color: "var(--red, #ff0040)",
                          }}
                        >
                          🚫
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); deleteSession(s.id); }}
                          title={t.deleteSession}
                          style={{
                            fontSize: "10px",
                            padding: "2px 8px",
                            cursor: "pointer",
                            background: "transparent",
                            border: "1px solid var(--red, #ff0040)",
                            borderRadius: "6px",
                            color: "var(--red, #ff0040)",
                          }}
                        >
                          🗑
                        </button>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* --- Selected session messages + reply --- */}
          <div
            className="dashboard-message-card"
            style={{
              flex: "2 1 380px",
              minWidth: "280px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <strong style={{ fontSize: "12px", color: "var(--text-dim, #4a7a4a)" }}>{t.messages}</strong>

            {!selected ? (
              <p className="dashboard-empty-state" style={{ margin: "0" }}>{t.emptySession}</p>
            ) : selected.messages.length === 0 ? (
              <p className="dashboard-empty-state" style={{ margin: "0" }}>{t.noMessages}</p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "380px",
                  overflowY: "auto",
                  padding: "4px",
                }}
              >
                {selected.messages.map(m => {
                  const isUser = m.role === "user";
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isUser ? "flex-start" : "flex-end",
                        maxWidth: "85%",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        border: "1px solid",
                        fontSize: "12px",
                        lineHeight: 1.7,
                        wordBreak: "break-word",
                        whiteSpace: "pre-wrap",
                        // بازدیدکننده (user): سبز — دستیار/ادمین: آبی
                        borderColor: isUser ? "var(--green, #00ff41)" : "var(--cyan, #4a9eff)",
                        background: isUser ? "rgba(0,255,65,0.05)" : "rgba(74,158,255,0.07)",
                        color: "var(--text, #c8facc)",
                      }}
                    >
                      <div style={{ fontSize: "9px", color: "var(--text-dim, #4a7a4a)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
                        <span>
                          {isUser ? `👤 ${t.visitor}` : `🤖 ${t.you}`} — {new Date(m.createdAt).toLocaleString(localeOf(lang))}
                        </span>
                        {/* FIX-2: حذف تکی پیام (ادمین) — POST /api/admin/clear {target:"chat_message", id} */}
                        <button
                          onClick={() => deleteMessage(m.id)}
                          title={t.deleteMessage}
                          aria-label={t.deleteMessage}
                          style={{
                            fontSize: "11px",
                            lineHeight: 1,
                            padding: "1px 6px",
                            cursor: "pointer",
                            background: "transparent",
                            border: "1px solid var(--red, #ff0040)",
                            borderRadius: "6px",
                            color: "var(--red, #ff0040)",
                            flexShrink: 0,
                          }}
                        >
                          ×
                        </button>
                      </div>
                      {m.content}
                    </div>
                  );
                })}
              </div>
            )}

            {selected && (
              <div className="dashboard-reply-form" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={t.replyPlaceholder}
                  rows={3}
                  className="dashboard-reply-textarea"
                  dir="auto"
                />
                <div className="dashboard-message-actions">
                  <button
                    onClick={sendReply}
                    className="dashboard-btn"
                    disabled={sending || !replyText.trim()}
                    style={{ opacity: sending || !replyText.trim() ? 0.6 : 1 }}
                  >
                    {sending ? t.sending : t.send}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
