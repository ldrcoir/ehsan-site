"use client";

import { useEffect, useRef, useState } from "react";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/**
 * RealSignalGenerator — Full-featured RF signal generator simulation.
 *
 * Controls:
 * - Waveform: sine/square/triangle/sawtooth
 * - Frequency: 1Hz to 100MHz
 * - Amplitude: 0-10V peak-to-peak
 * - Offset: -5V to +5V DC offset
 * - Output impedance: 50Ω / 600Ω / High-Z
 * - Modulation: AM / FM / None
 * - Modulation frequency
 * - Output on/off
 */

const FREQ_RANGES = [
  { label: "Hz", min: 1, max: 999, mult: 1 },
  { label: "kHz", min: 1, max: 999, mult: 1000 },
  { label: "MHz", min: 1, max: 100, mult: 1000000 },
];

type OutputImpedance = "50Ω" | "600Ω" | "High-Z";
type Modulation = "NONE" | "AM" | "FM";

export default function RealSignalGenerator({
  waveform,
  frequency,
  amplitude,
  onWaveformChange,
  onFrequencyChange,
  onAmplitudeChange,
}: {
  waveform: Waveform;
  frequency: number;
  amplitude: number;
  onWaveformChange: (w: Waveform) => void;
  onFrequencyChange: (f: number) => void;
  onAmplitudeChange: (a: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);

  const [freqRange, setFreqRange] = useState(0); // index into FREQ_RANGES
  const [ampV, setAmpV] = useState(2.0); // peak voltage in V
  const [offset, setOffset] = useState(0); // DC offset
  const [impedance, setImpedance] = useState<OutputImpedance>("50Ω");
  const [modulation, setModulation] = useState<Modulation>("NONE");
  const [modFreq, setModFreq] = useState(10); // Hz
  const [outputOn, setOutputOn] = useState(true);

  // The actual frequency value based on range
  const actualFreq = frequency * FREQ_RANGES[freqRange].mult;

  // Generate the waveform value at a given phase
  const waveValue = (phase: number, wf: Waveform, amp: number): number => {
    const t = phase % (Math.PI * 2);
    switch (wf) {
      case "sine":     return Math.sin(t) * amp;
      case "square":   return (Math.sin(t) >= 0 ? 1 : -1) * amp;
      case "triangle": return (2 / Math.PI) * Math.asin(Math.sin(t)) * amp;
      case "sawtooth": return (2 * (t / (2 * Math.PI) - Math.floor(t / (2 * Math.PI) + 0.5))) * amp;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let t = 0;
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      t += 0.03;

      const styles = getComputedStyle(document.documentElement);
      const bgColor = styles.getPropertyValue("--bg").trim() || "#000";
      const greenColor = styles.getPropertyValue("--green").trim() || "#00ff41";
      const greenBright = styles.getPropertyValue("--green-bright").trim() || "#39ff14";
      const textDim = styles.getPropertyValue("--text-dim").trim() || "#4a7a4a";
      const textFaint = styles.getPropertyValue("--text-faint").trim() || "#2a4a2a";

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.1)`;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * w;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 0; i <= 4; i++) {
        const y = (i / 4) * h;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Center line
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.25)`;
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();

      if (outputOn) {
        // Draw waveform
        ctx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.6)`;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = greenBright;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i <= w; i++) {
          const frac = i / w;
          // Carrier phase: advances both across screen and in time
          const carrierCycles = 2; // show 2 carrier cycles
          const carrierPhase = frac * Math.PI * 2 * carrierCycles + phaseRef.current;

          // Modulation phase: also varies across screen AND in time
          const modCycles = carrierCycles * (modFreq / Math.max(visualFreq, 0.1));
          const modPhase = frac * Math.PI * 2 * modCycles + modPhaseRef.current;
          const modSignal = Math.sin(modPhase); // -1 to +1

          let v: number;

          if (modulation === "AM") {
            // AM: amplitude varies with modulation
            // v = carrier * (1 + depth * modSignal) / (1 + depth) for normalization
            const amFactor = 1 + modDepth * modSignal;
            v = waveValue(carrierPhase, waveform, ampV) * amFactor / (1 + modDepth);
          } else if (modulation === "FM") {
            // FM: frequency/phase varies with modulation
            // Phase deviation = depth * integral of modSignal
            // For visual: phase shift proportional to modSignal
            const fmPhaseShift = modDepth * 3 * modSignal; // up to ±3 radians
            v = waveValue(carrierPhase + fmPhaseShift, waveform, ampV);
          } else {
            v = waveValue(carrierPhase, waveform, ampV);
          }

          // Apply DC offset
          v += offset;

          // Map to screen (max ±10V → full height)
          const y = h / 2 - (v / 10) * (h / 2 - 8);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Output off — show flat line
        ctx.strokeStyle = `rgba(${hexToRgb(textFaint)}, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = textDim;
      ctx.font = "8px monospace";
      ctx.fillText("GEN · OUTPUT", 6, 12);

      const freqLabel = actualFreq >= 1000000
        ? `${(actualFreq / 1000000).toFixed(2)} MHz`
        : actualFreq >= 1000
        ? `${(actualFreq / 1000).toFixed(2)} kHz`
        : `${actualFreq.toFixed(1)} Hz`;
      ctx.fillStyle = outputOn ? greenBright : textFaint;
      ctx.fillText(
        `${waveform.toUpperCase()} · ${freqLabel} · ${ampV.toFixed(2)}Vpp · ${offset.toFixed(2)}V DC`,
        6, h - 6
      );

      // Status
      ctx.fillStyle = outputOn ? greenBright : "#ff0040";
      ctx.fillText(outputOn ? "● OUTPUT" : "○ OFF", w - 60, 12);
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
  }, [waveform, frequency, ampV, offset, impedance, modulation, modFreq, outputOn, freqRange]);

  const waveforms: { id: Waveform; label: string }[] = [
    { id: "sine", label: "∿ sine" },
    { id: "square", label: "⊓ sqr" },
    { id: "triangle", label: "△ tri" },
    { id: "sawtooth", label: "⩘ saw" },
  ];

  return (
    <div className="signal-device">
      <div className="signal-device-bar">
        <span className="signal-device-name">SIGNAL GENERATOR</span>
        <span className="signal-device-model">Keysight 33600A · 80MHz</span>
      </div>
      <div className="signal-device-screen" style={{ height: 100 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="osc-controls">
        {/* Waveform selector */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>WAVEFORM</span>
          </div>
          <div className="osc-button-row">
            {waveforms.map(w => (
              <button
                key={w.id}
                className={`signal-waveform-btn ${waveform === w.id ? "active" : ""}`}
                onClick={() => onWaveformChange(w.id)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency range */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>FREQ RANGE</span>
            <span className="value">×{FREQ_RANGES[freqRange].label}</span>
          </div>
          <div className="osc-button-row">
            {FREQ_RANGES.map((r, i) => (
              <button
                key={r.label}
                className={`signal-waveform-btn ${freqRange === i ? "active" : ""}`}
                onClick={() => {
                  setFreqRange(i);
                  onFrequencyChange(Math.min(frequency, r.max));
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Frequency fine tune */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>FREQUENCY</span>
            <span className="value">
              {frequency.toFixed(1)} {FREQ_RANGES[freqRange].label}
            </span>
          </div>
          <input
            type="range"
            className="signal-control-input"
            min={FREQ_RANGES[freqRange].min}
            max={FREQ_RANGES[freqRange].max}
            step="0.1"
            value={frequency}
            onChange={(e) => onFrequencyChange(parseFloat(e.target.value))}
          />
        </div>

        {/* Amplitude */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>AMPLITUDE (Vpp)</span>
            <span className="value">{ampV.toFixed(2)}V</span>
          </div>
          <input
            type="range"
            className="signal-control-input"
            min="0.01"
            max="10"
            step="0.1"
            value={ampV}
            onChange={(e) => {
              setAmpV(parseFloat(e.target.value));
              onAmplitudeChange(parseFloat(e.target.value) / 10);
            }}
          />
        </div>

        {/* DC Offset */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>DC OFFSET</span>
            <span className="value">{offset.toFixed(2)}V</span>
          </div>
          <input
            type="range"
            className="signal-control-input"
            min="-5"
            max="5"
            step="0.1"
            value={offset}
            onChange={(e) => setOffset(parseFloat(e.target.value))}
          />
        </div>

        {/* Output impedance */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>IMPEDANCE</span>
          </div>
          <div className="osc-button-row">
            {(["50Ω", "600Ω", "High-Z"] as OutputImpedance[]).map(z => (
              <button
                key={z}
                className={`signal-waveform-btn ${impedance === z ? "active" : ""}`}
                onClick={() => setImpedance(z)}
              >
                {z}
              </button>
            ))}
          </div>
        </div>

        {/* Modulation */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>MODULATION</span>
          </div>
          <div className="osc-button-row">
            {(["NONE", "AM", "FM"] as Modulation[]).map(m => (
              <button
                key={m}
                className={`signal-waveform-btn ${modulation === m ? "active" : ""}`}
                onClick={() => setModulation(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Mod freq (only if modulation on) */}
        {modulation !== "NONE" && (
          <div className="osc-control-group">
            <div className="osc-control-label">
              <span>MOD FREQ</span>
              <span className="value">{modFreq.toFixed(1)}Hz</span>
            </div>
            <input
              type="range"
              className="signal-control-input"
              min="1"
              max="100"
              step="0.5"
              value={modFreq}
              onChange={(e) => setModFreq(parseFloat(e.target.value))}
            />
          </div>
        )}

        {/* Output on/off */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>OUTPUT</span>
          </div>
          <button
            className={`signal-waveform-btn ${outputOn ? "active" : ""}`}
            onClick={() => setOutputOn(!outputOn)}
            style={{ width: "100%", background: outputOn ? "var(--green)" : "var(--red)", color: "#000" }}
          >
            {outputOn ? "● OUTPUT ON" : "○ OUTPUT OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "0, 255, 65";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}
