"use client";

import { useEffect, useState } from "react";

export default function SecurityDashboard({ password, lang }: { password: string; lang: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fa = lang === "fa";  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/security-dashboard?password=${password}`);
      const d = await res.json();
      if (d.ok) setData(d.data);
    } catch {}
    setLoading(false);
  };



   


  useEffect(() => { load(); }, []);

  const unblock = async (ip: string) => {
    await fetch("/api/admin/security-dashboard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "unblock", ip }),
    });
    load();
  };

  const clearLogs = async () => {
    if (!confirm(fa ? "پاک‌کردن همه لاگ‌ها؟" : "Clear all logs?")) return;
    await fetch("/api/admin/security-dashboard", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "clear_logs" }),
    });
    load();
  };

  if (loading) return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>loading...</p>;
  if (!data) return <p style={{ color: "var(--text-dim)", textAlign: "center", padding: 20 }}>No data.</p>;

  const stats = data.stats;
  const cards = [
    { label: fa ? "پیام مشکوک" : "Suspicious", value: stats.suspiciousCount, color: "var(--red)" },
    { label: fa ? "ورود ناموفق" : "Failed Logins", value: stats.failedLoginCount, color: "var(--amber)" },
    { label: fa ? "IP مسدود" : "Blocked IPs", value: stats.blockedCount, color: "var(--red)" },
    { label: fa ? "رویداد امروز" : "Today Events", value: stats.todayEvents, color: "var(--cyan)" },
  ];

  const logTypeColors: Record<string, string> = {
    suspicious_message: "var(--amber)",
    failed_login: "var(--red)",
    blocked_ip: "var(--red)",
    blocked_attempt: "var(--red)",
    captcha_failed: "var(--amber)",
    manual_block: "var(--cyan)",
    manual_unblock: "var(--green)",
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", padding: 12, background: "var(--bg-panel)", textAlign: "center" }}>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: c.color, fontFamily: "var(--font-mono)" }}>{c.value}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Blocked IPs */}
      <h4 style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 10, fontFamily: "var(--font-mono)" }}>
        {fa ? "IP های مسدود" : "Blocked IPs"}
      </h4>
      <div style={{ marginBottom: 20 }}>
        {data.blockedIps.length === 0 ? (
          <p style={{ color: "var(--green)", fontSize: "0.78rem" }}>{fa ? "هیچ IP مسدودی نیست ✓" : "No blocked IPs ✓"}</p>
        ) : (
          data.blockedIps.map((b: any) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <div>
                <span style={{ color: "var(--red)", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>{b.ip}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "0.72rem", marginLeft: 8 }}>{b.reason}</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-faint)" }}>{new Date(b.blockedAt).toLocaleString()}</span>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", padding: "2px 8px" }} onClick={() => unblock(b.ip)}>
                  {fa ? "آزاد" : "unblock"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Security Logs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h4 style={{ color: "var(--green-bright)", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}>
          {fa ? "لاگ امنیتی" : "Security Logs"}
        </h4>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.68rem", color: "var(--red)" }} onClick={clearLogs}>
          {fa ? "پاک‌کردن لاگ" : "clear logs"}
        </button>
      </div>
      <div>
        {data.recentLogs.length === 0 ? (
          <p style={{ color: "var(--text-dim)", fontSize: "0.78rem" }}>{fa ? "رویدادی ثبت نشده" : "No events"}</p>
        ) : (
          data.recentLogs.map((log: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: "0.72rem" }}>
              <span style={{ color: logTypeColors[log.type] || "var(--text-dim)", fontFamily: "var(--font-mono)", width: 140, flexShrink: 0 }}>
                {log.type}
              </span>
              <span style={{ color: "var(--green)", width: 100, flexShrink: 0 }}>{log.ip || "—"}</span>
              <span style={{ color: "var(--text-dim)", flex: 1 }}>{log.detail}</span>
              <span style={{ color: "var(--text-faint)", flexShrink: 0 }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
            </div>
          ))
        )}
      </div>

      <button className="btn btn-ghost btn-sm" style={{ marginTop: 16 }} onClick={load}>
        {fa ? "به‌روزرسانی" : "refresh"}
      </button>
    </div>
  );
}
