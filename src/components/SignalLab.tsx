"use client";

import { useEffect, useRef, useState } from "react";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/**
 * SignalLab — Signal Generator + Oscilloscope, wirelessly connected.
 *
 * The Signal Generator has controls (waveform type, frequency, amplitude).
 * The Oscilloscope displays the generated signal in real-time.
 * Changing any control on the generator instantly updates the scope.
 *
 * Both look like real RF lab equipment.
 */
export default function SignalLab() {
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [frequency, setFrequency] = useState(3); // Hz (visual)
  const [amplitude, setAmplitude] = useState(0.7); // 0-1

  const genCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  // Generate the waveform value at a given phase (0 - 2π)
  const waveValue = (phase: number, wf: Waveform, amp: number): number => {
    const t = phase % (Math.PI * 2);
    switch (wf) {
      case "sine":
        return Math.sin(t) * amp;
      case "square":
        return (Math.sin(t) >= 0 ? 1 : -1) * amp;
      case "triangle":
        return (2 / Math.PI) * Math.asin(Math.sin(t)) * amp;
      case "sawtooth":
        return (2 * (t / (Math.PI * 2) - Math.floor(t / (Math.PI * 2) + 0.5))) * amp;
      default:
        return 0;
    }
  };

  useEffect(() => {
    const genCanvas = genCanvasRef.current;
    const scopeCanvas = scopeCanvasRef.current;
    if (!genCanvas || !scopeCanvas) return;
    const genCtx = genCanvas.getContext("2d")!;
    const scopeCtx = scopeCanvas.getContext("2d")!;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let gw = 0, gh = 0, sw = 0, sh = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      // Generator canvas
      gw = genCanvas.clientWidth;
      gh = genCanvas.clientHeight;
      genCanvas.width = gw * dpr;
      genCanvas.height = gh * dpr;
      genCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Scope canvas
      sw = scopeCanvas.clientWidth;
      sh = scopeCanvas.clientHeight;
      scopeCanvas.width = sw * dpr;
      scopeCanvas.height = sh * dpr;
      scopeCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(genCanvas);
    ro.observe(scopeCanvas);

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.03;

      // ---- SIGNAL GENERATOR display (smaller, shows output wave) ----
      genCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#000";
      genCtx.fillRect(0, 0, gw, gh);

      // grid
      const genGridColor = "rgba(0, 255, 65, 0.06)";
      // Read CSS variables for theme-aware colors
      const styles = getComputedStyle(document.documentElement);
      const greenColor = styles.getPropertyValue("--green").trim() || "#00ff41";
      const greenDimColor = styles.getPropertyValue("--green-dim").trim() || "#008f11";
      const greenBrightColor = styles.getPropertyValue("--green-bright").trim() || "#39ff14";
      const textColor = styles.getPropertyValue("--text-dim").trim() || "#4a7a4a";
      const textFaint = styles.getPropertyValue("--text-faint").trim() || "#2a4a2a";

      genCtx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.08)`;
      genCtx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * gw;
        genCtx.beginPath(); genCtx.moveTo(x, 0); genCtx.lineTo(x, gh); genCtx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * gh;
        genCtx.beginPath(); genCtx.moveTo(0, y); genCtx.lineTo(gw, y); genCtx.stroke();
      }
      // center line
      genCtx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.2)`;
      genCtx.beginPath(); genCtx.moveTo(0, gh / 2); genCtx.lineTo(gw, gh / 2); genCtx.stroke();

      // Draw the waveform output (scrolling)
      genCtx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.5)`;
      genCtx.shadowBlur = 6;
      genCtx.strokeStyle = greenBrightColor;
      genCtx.lineWidth = 1.5;
      genCtx.beginPath();
      const samples = gw;
      for (let i = 0; i <= samples; i++) {
        const phase = (i / samples) * Math.PI * 2 * frequency + t;
        const y = gh / 2 - waveValue(phase, waveform, amplitude) * (gh * 0.35);
        if (i === 0) genCtx.moveTo(i, y);
        else genCtx.lineTo(i, y);
      }
      genCtx.stroke();
      genCtx.shadowBlur = 0;

      // Label
      genCtx.fillStyle = textFaint;
      genCtx.font = "8px monospace";
      genCtx.fillText("GEN · OUTPUT", 6, 12);
      genCtx.fillText(`${waveform.toUpperCase()} · ${frequency.toFixed(1)}Hz · ${(amplitude * 100).toFixed(0)}%`, 6, gh - 6);

      // ---- OSCILLOSCOPE display (larger, shows received signal with sweep) ----
      scopeCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#000";
      scopeCtx.fillRect(0, 0, sw, sh);

      // grid — more detailed for scope
      scopeCtx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.1)`;
      scopeCtx.lineWidth = 1;
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * sw;
        scopeCtx.beginPath(); scopeCtx.moveTo(x, 0); scopeCtx.lineTo(x, sh); scopeCtx.stroke();
      }
      for (let i = 0; i <= 8; i++) {
        const y = (i / 8) * sh;
        scopeCtx.beginPath(); scopeCtx.moveTo(0, y); scopeCtx.lineTo(sw, y); scopeCtx.stroke();
      }
      // center axes (brighter)
      scopeCtx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.3)`;
      scopeCtx.beginPath(); scopeCtx.moveTo(0, sh / 2); scopeCtx.lineTo(sw, sh / 2); scopeCtx.stroke();
      scopeCtx.beginPath(); scopeCtx.moveTo(sw / 2, 0); scopeCtx.lineTo(sw / 2, sh); scopeCtx.stroke();

      // Draw the received signal (same waveform, slight delay to simulate wireless)
      scopeCtx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.6)`;
      scopeCtx.shadowBlur = 8;
      scopeCtx.strokeStyle = greenBrightColor;
      scopeCtx.lineWidth = 2;
      scopeCtx.beginPath();
      const scopeSamples = sw;
      const sweepPhase = t * 0.5; // slow sweep
      for (let i = 0; i <= scopeSamples; i++) {
        const fraction = i / scopeSamples;
        // Show 2-3 cycles depending on frequency
        const phase = fraction * Math.PI * 2 * frequency * 2 + t + sweepPhase;
        const y = sh / 2 - waveValue(phase, waveform, amplitude) * (sh * 0.38);
        if (i === 0) scopeCtx.moveTo(i, y);
        else scopeCtx.lineTo(i, y);
      }
      scopeCtx.stroke();
      scopeCtx.shadowBlur = 0;

      // Sweep line (moving cursor)
      const sweepX = ((t * 30) % sw);
      scopeCtx.strokeStyle = `rgba(${hexToRgb(greenBrightColor)}, 0.3)`;
      scopeCtx.lineWidth = 1;
      scopeCtx.beginPath();
      scopeCtx.moveTo(sweepX, 0);
      scopeCtx.lineTo(sweepX, sh);
      scopeCtx.stroke();

      // Scope labels
      scopeCtx.fillStyle = textColor;
      scopeCtx.font = "8px monospace";
      scopeCtx.fillText("CH1", 6, 12);
      scopeCtx.fillText(`${frequency.toFixed(1)}Hz`, sw - 50, 12);
      scopeCtx.fillText(`${(amplitude * 3.3).toFixed(2)}V`, 6, sh - 6);
      scopeCtx.fillText("TRIG: AUTO", sw - 70, sh - 6);
      scopeCtx.fillText("SCOPE · 10mV/div · 100ms/div", sw / 2 - 60, 12);
    };

    if (!reduce) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw();
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [waveform, frequency, amplitude]);

  const waveforms: { id: Waveform; label: string }[] = [
    { id: "sine", label: "sine" },
    { id: "square", label: "square" },
    { id: "triangle", label: "triangle" },
    { id: "sawtooth", label: "saw" },
  ];

  return (
    <div className="signal-lab">
      {/* SIGNAL GENERATOR */}
      <div className="signal-device">
        <div className="signal-device-bar">
          <span className="signal-device-name">SIGNAL GENERATOR</span>
          <span className="signal-device-model">Keysight 33600A</span>
        </div>
        <div className="signal-device-screen" style={{ height: 100 }}>
          <canvas ref={genCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <div className="signal-controls">
          <div className="signal-control-group">
            <div className="signal-control-label">
              <span>waveform</span>
            </div>
            <div className="signal-waveform-selector">
              {waveforms.map((w) => (
                <button
                  key={w.id}
                  className={`signal-waveform-btn ${waveform === w.id ? "active" : ""}`}
                  onClick={() => setWaveform(w.id)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
          <div className="signal-control-group">
            <div className="signal-control-label">
              <span>frequency</span>
              <span className="value">{frequency.toFixed(1)} Hz</span>
            </div>
            <input
              type="range"
              className="signal-control-input"
              min="0.5"
              max="10"
              step="0.1"
              value={frequency}
              onChange={(e) => setFrequency(parseFloat(e.target.value))}
            />
          </div>
          <div className="signal-control-group">
            <div className="signal-control-label">
              <span>amplitude</span>
              <span className="value">{(amplitude * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              className="signal-control-input"
              min="0.1"
              max="1"
              step="0.05"
              value={amplitude}
              onChange={(e) => setAmplitude(parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* WIRELESS LINK indicator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="signal-link">
          <span>~ wireless link ~</span>
          <div className="signal-link-waves">
            <div className="signal-link-wave"></div>
            <div className="signal-link-wave"></div>
            <div className="signal-link-wave"></div>
            <div className="signal-link-wave"></div>
            <div className="signal-link-wave"></div>
          </div>
        </div>
      </div>

      {/* OSCILLOSCOPE */}
      <div className="signal-device">
        <div className="signal-device-bar">
          <span className="signal-device-name">OSCILLOSCOPE</span>
          <span className="signal-device-model">Tektronix MSO64</span>
        </div>
        <div className="signal-device-screen" style={{ height: 160 }}>
          <canvas ref={scopeCanvasRef} style={{ width: "100%", height: "100%" }} />
        </div>
        <div className="signal-controls">
          <div className="signal-control-label">
            <span>received signal</span>
            <span className="value">CH1 · LIVE</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            // changing the generator controls instantly updates this display
          </div>
        </div>
      </div>
    </div>
  );
}

/** Helper: convert hex color to "r, g, b" string for rgba() */
function hexToRgb(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "0, 255, 65";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
