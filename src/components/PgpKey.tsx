"use client";

/**
 * PGP Key display component — shows admin's PGP public key
 * for secure communication. Key is set from admin panel.
 */
import { useState } from "react";

export default function PgpKey({ pgpKey, lang }: { pgpKey: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  const fa = lang === "fa";

  if (!pgpKey) return null;

  const copy = () => {
    navigator.clipboard.writeText(pgpKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pgp-section" style={{ marginTop: 24 }}>
      <p className="contact-label" style={{ marginBottom: 8 }}>
        {fa ? "کلید عمومی PGP (ارتباط امن)" : "PGP Public Key (secure communication)"}
      </p>
      <div style={{
        background: "var(--bg)", border: "1px solid var(--border)",
        padding: 12, maxHeight: 120, overflow: "auto",
        fontFamily: "var(--font-mono)", fontSize: "0.7rem",
        color: "var(--green-dim)", whiteSpace: "pre-wrap",
      }}>
        {pgpKey}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ marginTop: 8 }}
        onClick={copy}
      >
        {copied ? (fa ? "✓ کپی شد" : "✓ copied") : (fa ? "کپی کلید" : "copy key")}
      </button>
    </div>
  );
}
