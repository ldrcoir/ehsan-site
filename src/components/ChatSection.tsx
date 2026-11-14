"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { UI, type Lang } from "@/lib/content";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

// FIX-2: fallback درون‌حافظه‌ای برای مرورگرهای private mode — localStorage روی mount
// ممکن است throw کند؛ visitorId آن‌وقت به‌صورت in-memory (per tab) نگه داشته می‌شود.
let visitorIdMemoryFallback = "";

/**
 * ChatSection — AI concierge styled as a radio comm channel.
 * Bot has callsign. Visitors chat with the AI; admin sees logs.
 */
export default function ChatSection({ lang, welcomeText, title, subtitle, callsign }: { lang: Lang; welcomeText?: string; title?: string; subtitle?: string; callsign?: string }) {
  const tt = UI[lang];
  const [sessionId, setSessionId] = useState("");
  const [visitorId, setVisitorId] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Generate a stable visitor ID (per browser)
  // V1.1: crypto.randomUUID (cryptographically strong) with a safe fallback
  // FIX-2: همه‌ی localStorage reads/writes در try/catch — private mode کرش نمی‌کند
  useEffect(() => {
    const KEY = "portfolio_visitor_id";
    let v = "";
    try {
      v = localStorage.getItem(KEY) || "";
    } catch {
      v = visitorIdMemoryFallback;
    }
    if (!v) {
      v =
        "v_" +
        (crypto.randomUUID?.() ||
          Math.random().toString(36).slice(2) + Date.now());
      try {
        localStorage.setItem(KEY, v);
      } catch {
        // storage unavailable (private mode / quota) — in-memory fallback
      }
    }
    visitorIdMemoryFallback = v;
    setVisitorId(v);
  }, []);

  // Greeting message when lang changes
  useEffect(() => {
    const greetings: Record<Lang, string> = {
      en: `>> Patched through. I'm the site's AI concierge. What brings you here today?`,
      de: `>> Verbindung hergestellt. Ich bin der KI-Concierge der Seite. Was führt dich her?`,
      fa: `>> اتصال برقرار شد. من دستیار هوش مصنوعی سایت هستم. چه چیزی امروز اینجا آوردت؟`,
    };
    if (messages.length === 0) {
      // V1.1: welcome text از DB (کلید chat.welcome) — از page.tsx پاس می‌شه
      setMessages([
        { role: "assistant", content: welcomeText || greetings[lang], ts: Date.now() },
      ]);
    }
     
  }, [lang, welcomeText]);

  // Autoscroll — FIX-2: فقط وقتی کاربر نزدیک پایین است (با اسکرول دستی مزاحم نیست)
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Poll for new messages from admin (via Bale or admin panel)
  // v1.1.1 (audit Q1): dedupe بر اساس id پیام — قبلاً بر اساس timestamp با ساعتِ
  // کلاینت بود؛ skew بین ساعت سرور و کلاینت باعث پیام‌های تکراری می‌شد.
  // همچنین dependency به lastPollTs حذف شد (interval دیگر بعد از هر پاسخ
  // teardown/build نمی‌شود).
  const lastPollTsRef = useRef(Date.now());
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!sessionId) return;
    lastPollTsRef.current = Date.now();
    // v1.0 (audit W36-40 #6): در-flight guard + AbortController — پاسخِ کند که
    // از tick قبلی مانده با tick بعدی overlap می‌کرد و unmount هم setMessages
    // بعد از detach را صدا می‌زد
    let inFlight = false;
    let controller: AbortController | null = null;
    const pollInterval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      controller = new AbortController();
      try {
        const res = await fetch(`/api/chat/messages?sessionId=${sessionId}&since=${lastPollTsRef.current}&visitorId=${encodeURIComponent(visitorId)}`, { signal: controller.signal });
        const data = await res.json();
        if (data.ok && data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            // فقط پیام‌هایی که قبلاً دیده نشده‌اند (assistant های جدید)
            const fresh = data.messages.filter((m: any) => {
              if (!m.id || seenMsgIdsRef.current.has(m.id)) return false;
              seenMsgIdsRef.current.add(m.id);
              return true;
            });
            if (fresh.length === 0) return prev;
            const newMsgs = fresh.map((m: any) => ({
              role: "assistant" as const,
              content: m.content,
              ts: new Date(m.createdAt).getTime(),
            }));
            return [...prev, ...newMsgs];
          });
          lastPollTsRef.current = data.serverTime || lastPollTsRef.current;
        }
      } catch {
        // abort یا شبکه — بی‌صدا؛ tick بعدی دوباره تلاش می‌کند
      } finally {
        inFlight = false;
        controller = null;
      }
    }, 3000);
    return () => {
      clearInterval(pollInterval);
      controller?.abort();
    };
  }, [sessionId, visitorId]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (sending || !input.trim()) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text, ts: Date.now() }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
          lang,
          visitorId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSessionId(data.sessionId);
        let appended = false;
        setMessages((prev) => {
          // FIX-2: poll (GET /api/chat/messages) با POST مسابقه دارد — اگر همین reply
          // (با id یکسان یا محتوای یکسان) از قبل در state هست، append نکن تا حباب تکراری نیاید.
          const alreadySeen =
            Boolean(data.messageId) && seenMsgIdsRef.current.has(data.messageId);
          const duplicateContent =
            prev.some((m) => m.role === "assistant" && m.content === data.reply);
          if (alreadySeen || duplicateContent) return prev;
          appended = true;
          return [
            ...prev,
            { role: "assistant" as const, content: data.reply, ts: Date.now() },
          ];
        });
        // v1.1.1 (audit Q1): این پاسخ AI را از dedupe poll مستثنا کن — id آن را
        // در Set ببین‌ها ثبت می‌کنیم تا poll بعدی همان را تکرار نکند
        if (data.messageId) seenMsgIdsRef.current.add(data.messageId);
        if (appended) lastPollTsRef.current = Date.now();
      } else {
        const err = data.error || "server_error";
        const msg =
          err === "rate_limit"
            ? lang === "fa" ? "... Channel busy. لحظه‌ای صبر کن." : lang === "de" ? "... Kanal belegt. Kurz warten." : "... Channel busy. Hold a sec."
            : lang === "fa" ? "... خطا. دوباره تلاش کن." : lang === "de" ? "... Fehler. Versuch's nochmal." : "... Error. Try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: msg, ts: Date.now() },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "... Connection lost.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const chatLabel: Record<Lang, { title: string; sub: string; callsign: string; status: string; ph: string; send: string }> = {
    en: { title: "Chat with Me", sub: "// ask anything — I or my AI will respond", callsign: "QRV-7", status: "ONLINE", ph: "type your message...", send: "tx [enter]" },
    de: { title: "Chat mit mir", sub: "// frag alles — ich oder meine KI antwortet", callsign: "QRV-7", status: "ONLINE", ph: "Nachricht eingeben...", send: "tx [enter]" },
    fa: { title: "گفت‌وگو با من", sub: "// هرچی بپرس — من یا هوش مصنوعی جواب می‌دیم", callsign: "QRV-7", status: "آنلاین", ph: "پیام خود را بنویسید...", send: "tx [enter]" },
  };
  // v1.1 (admin-editable everything): عنوان/زیرعنوان/کال‌ساین از SiteText — fallback به دیکشنری
  const L = {
    ...chatLabel[lang],
    title: title || chatLabel[lang].title,
    sub: subtitle || chatLabel[lang].sub,
    callsign: callsign || chatLabel[lang].callsign,
  };

  return (
    <section className="section" id="chat">
      <div className="container">
        <header className="section-head">
          {/* v1.1.1 (audit P2): شماره ۰۶ — قبلاً chat و clips هر دو «07» بودند */}
          <p className="section-eyebrow">06 — {lang === "fa" ? "گفت‌وگو" : lang === "de" ? "chat" : "chat"}</p>
          <h2 className="section-title">{L.title}</h2>
          <p className="section-subtitle">{L.sub}</p>
        </header>

        <div className="chat-window reveal visible">
          <div className="chat-bar">
            <span className="chat-callsign">
              <span className="chat-status-dot"></span>
              {L.callsign} · {L.status}
            </span>
            <span className="chat-bar-title">encrypted · simplex</span>
            <span className="chat-bar-meta">{messages.length} msg</span>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg-${m.role}`}>
                <span className="chat-msg-author">
                  {m.role === "user" ? (lang === "fa" ? "شما" : lang === "de" ? "du" : "you") : L.callsign}
                </span>
                <span className="chat-msg-text">{m.content}</span>
              </div>
            ))}
            {sending && (
              <div className="chat-msg chat-msg-assistant">
                <span className="chat-msg-author">{L.callsign}</span>
                <span className="chat-msg-text chat-typing">
                  <span></span><span></span><span></span>
                </span>
              </div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={send}>
            <span className="chat-prompt">tx&gt;</span>
            <input
              ref={inputRef}
              className="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={L.ph}
              disabled={sending}
              maxLength={500}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !input.trim()}>
              {L.send}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
