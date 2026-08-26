"use client";

import { useEffect, useState } from "react";

/**
 * SignalBars — animated signal strength indicator (like phone bars).
 * Shown in the status bar. Adds telecom/RF vibe.
 */
export default function SignalBars() {
  const [level, setLevel] = useState(4);

  useEffect(() => {
    const id = setInterval(() => {
      // fluctuate between 3-5
      setLevel(3 + Math.floor(Math.random() * 3));
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="signal-bars" aria-label="signal strength">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`signal-bar ${n <= level ? "active" : ""}`}
          style={{ height: `${n * 2 + 2}px` }}
        />
      ))}
    </span>
  );
}
