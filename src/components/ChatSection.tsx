"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { UI, PERSONAL, type Lang } from "@/lib/content";

type Msg = { role: "user" | "assistant"; content: string; ts: number };

/**
 * ChatSection — AI concierge styled as a radio comm channel.
 * Bot has callsign. Visitors chat with the AI; admin sees logs.
 */
export default function ChatSection({ lang }: { lang: Lang }) {
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
  useEffect(() => {
    const KEY = "portfolio_visitor_id";
    let v = localStorage.getItem(KEY);
    if (!v) {
      v = "v_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      localStorage.setItem(KEY, v);
    }
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
      setMessages([{ role: "assistant", content: greetings[lang], ts: Date.now() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Autoscroll
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  // State for polling
  const [lastPollTs, setLastPollTs] = useState(Date.now());

  // Poll for new messages from admin (via Bale or admin panel)
  useEffect(() => {
    if (!sessionId) return;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/messages?sessionId=${sessionId}&since=${lastPollTs}`);
        const data = await res.json();
        if (data.ok && data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const newMsgs = data.messages.map((m: any) => ({
              role: "assistant" as const,
              content: m.content,
              ts: new Date(m.createdAt).getTime(),
            }));
            return [...prev, ...newMsgs];
          });
          setLastPollTs(data.serverTime || Date.now());
        }
      } catch {}
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [sessionId, lastPollTs]);

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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply, ts: Date.now() },
        ]);
        // Update poll timestamp to avoid re-fetching this reply
        setLastPollTs(Date.now());
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
    en: { title: "Patch Through", sub: "// AI concierge — ask anything, share thoughts", callsign: "QRV-7", status: "ONLINE", ph: "type your message...", send: "tx [enter]" },
    de: { title: "Durchstellen", sub: "// KI-Concierge — frag alles, teile Gedanken", callsign: "QRV-7", status: "ONLINE", ph: "Nachricht eingeben...", send: "tx [enter]" },
    fa: { title: "اتصال برقرار", sub: "// دستیار هوش مصنوعی — هرچی بپرس، نظرت رو بگو", callsign: "QRV-7", status: "آنلاین", ph: "پیام خود را بنویسید...", send: "tx [enter]" },
  };
  const L = chatLabel[lang];

  return (
    <section className="section" id="chat">
      <div className="container">
        <header className="section-head">
          <p className="section-eyebrow">07 — {lang === "fa" ? "گفت‌وگو" : lang === "de" ? "chat" : "chat"}</p>
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
