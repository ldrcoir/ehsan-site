"use client";

import { useEffect, useRef, useState } from "react";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";
type Coupling = "AC" | "DC" | "GND";
type TriggerMode = "AUTO" | "NORM" | "SINGLE";
type TriggerEdge = "RISE" | "FALL";

/**
 * RealOscilloscope — Full-featured oscilloscope simulation.
 *
 * Controls:
 * - Time/div (sweep speed): 1ms to 500ms per division
 * - Volt/div (vertical scale): 10mV to 5V per division
 * - Vertical offset (position)
 * - Trigger level, mode (AUTO/NORM/SINGLE), edge (RISE/FALL)
 * - Coupling (AC/DC/GND)
 * - Channel on/off
 *
 * Measurements: Vpp, Vrms, Vavg, Frequency, Period
 *
 * Connects to a SignalGenerator-like source via props.
 */

const TIME_DIV_OPTIONS = [
  { label: "100µs", value: 0.0001 },
  { label: "200µs", value: 0.0002 },
  { label: "500µs", value: 0.0005 },
  { label: "1ms", value: 0.001 },
  { label: "2ms", value: 0.002 },
  { label: "5ms", value: 0.005 },
  { label: "10ms", value: 0.01 },
  { label: "20ms", value: 0.02 },
  { label: "50ms", value: 0.05 },
  { label: "100ms", value: 0.1 },
  { label: "200ms", value: 0.2 },
  { label: "500ms", value: 0.5 },
];

const VOLT_DIV_OPTIONS = [
  { label: "10mV", value: 0.01 },
  { label: "20mV", value: 0.02 },
  { label: "50mV", value: 0.05 },
  { label: "100mV", value: 0.1 },
  { label: "200mV", value: 0.2 },
  { label: "500mV", value: 0.5 },
  { label: "1V", value: 1 },
  { label: "2V", value: 2 },
  { label: "5V", value: 5 },
];

export default function RealOscilloscope({
  waveform,
  frequency,
  amplitude,
}: {
  waveform: Waveform;
  frequency: number; // Hz
  amplitude: number; // 0-1 (fraction of max)
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const triggerFiredRef = useRef(false);

  const [timeDiv, setTimeDiv] = useState(0.05); // 50ms/div default
  const [voltDiv, setVoltDiv] = useState(1); // 1V/div default (shows ±4V range)
  const [offset, setOffset] = useState(0); // vertical position in volts
  const [coupling, setCoupling] = useState<Coupling>("DC");
  const [triggerMode, setTriggerMode] = useState<TriggerMode>("AUTO");
  const [triggerEdge, setTriggerEdge] = useState<TriggerEdge>("RISE");
  const [triggerLevel, setTriggerLevel] = useState(0); // volts
  const [channelOn, setChannelOn] = useState(true);
  const [measurements, setMeasurements] = useState({
    vpp: 0, vrms: 0, vavg: 0, freq: 0, period: 0,
  });

  // Convert the source waveform to voltage
  const waveValue = (phase: number, wf: Waveform, amp: number): number => {
    const t = phase % (Math.PI * 2);
    // amp comes in as 0-1 (fraction), convert to actual voltage (0-10V range)
    // The generator's amplitude slider is 0-10Vpp, so peak = amp * 5V
    const peakV = amp * 5;
    switch (wf) {
      case "sine":     return Math.sin(t) * peakV;
      case "square":   return (Math.sin(t) >= 0 ? 1 : -1) * peakV;
      case "triangle": return (2 / Math.PI) * Math.asin(Math.sin(t)) * peakV;
      case "sawtooth": return (2 * (t / (2 * Math.PI) - Math.floor(t / (2 * Math.PI) + 0.5))) * peakV;
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

    // Drawing constants
    const GRID_DIVS_X = 10;
    const GRID_DIVS_Y = 8;
    const divW = () => w / GRID_DIVS_X;
    const divH = () => h / GRID_DIVS_Y;

    let lastTime = 0;
    let accumulatedTime = 0;
    let sampleCount = 0;
    let vppMax = -Infinity, vppMin = Infinity;
    let sumV = 0, sumV2 = 0;
    let measurementTimer = 0;

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);

      const dt = lastTime === 0 ? 0.016 : Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      accumulatedTime += dt;
      measurementTimer += dt;

      const styles = getComputedStyle(document.documentElement);
      const bgColor = styles.getPropertyValue("--bg").trim() || "#000";
      const greenColor = styles.getPropertyValue("--green").trim() || "#00ff41";
      const greenDim = styles.getPropertyValue("--green-dim").trim() || "#008f11";
      const greenBright = styles.getPropertyValue("--green-bright").trim() || "#39ff14";
      const textDim = styles.getPropertyValue("--text-dim").trim() || "#4a7a4a";
      const textFaint = styles.getPropertyValue("--text-faint").trim() || "#2a4a2a";
      const amberColor = styles.getPropertyValue("--amber").trim() || "#ffb000";
      const redColor = styles.getPropertyValue("--red").trim() || "#ff0040";

      // Background
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // ---- GRID ----
      // Major grid lines
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.15)`;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_DIVS_X; i++) {
        const x = i * divW();
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let i = 0; i <= GRID_DIVS_Y; i++) {
        const y = i * divH();
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Center axes (brighter) + tick marks
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.4)`;
      ctx.lineWidth = 1;
      const cy = h / 2;
      const cx = w / 2;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      // Tick marks on center axes (8 minor per div)
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.3)`;
      for (let i = 0; i <= GRID_DIVS_X * 5; i++) {
        const x = (i / (GRID_DIVS_X * 5)) * w;
        ctx.beginPath(); ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); ctx.stroke();
      }
      for (let i = 0; i <= GRID_DIVS_Y * 5; i++) {
        const y = (i / (GRID_DIVS_Y * 5)) * h;
        ctx.beginPath(); ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y); ctx.stroke();
      }

      // ---- TRIGGER LEVEL INDICATOR ----
      // T-level arrows on left side
      const tLevelY = cy - ((triggerLevel - offset) / voltDiv) * divH();
      if (tLevelY >= 0 && tLevelY <= h) {
        ctx.fillStyle = amberColor;
        ctx.beginPath();
        ctx.moveTo(0, tLevelY);
        ctx.lineTo(8, tLevelY - 4);
        ctx.lineTo(8, tLevelY + 4);
        ctx.closePath();
        ctx.fill();
        // dashed line across
        ctx.strokeStyle = `rgba(${hexToRgb(amberColor)}, 0.3)`;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(8, tLevelY);
        ctx.lineTo(w, tLevelY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ---- OFFSET INDICATOR (channel position) ----
      const offsetY = cy - (offset / voltDiv) * divH();
      ctx.fillStyle = greenColor;
      ctx.beginPath();
      ctx.moveTo(w - 8, offsetY);
      ctx.lineTo(w, offsetY - 4);
      ctx.lineTo(w, offsetY + 4);
      ctx.closePath();
      ctx.fill();

      // ---- WAVEFORM ----
      if (channelOn) {
        // Time window visible on screen = timeDiv * number of horizontal divisions
        const timeWindow = timeDiv * GRID_DIVS_X;
        const samples = Math.floor(w);

        // Reset measurement accumulators periodically
        if (sampleCount > 200) {
          const vpp = vppMax - vppMin;
          const vavg = sumV / sampleCount;
          const vrms = Math.sqrt(sumV2 / sampleCount);
          const period = 1 / frequency;
          setMeasurements({
            vpp: vpp, vrms: vrms, vavg: vavg,
            freq: frequency, period: period,
          });
          vppMax = -Infinity; vppMin = Infinity;
          sumV = 0; sumV2 = 0;
          sampleCount = 0;
        }

        // Draw waveform
        ctx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.6)`;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = greenBright;
        ctx.lineWidth = 1.8;

        if (coupling === "GND") {
          // Flat line at offset position
          ctx.beginPath();
          ctx.moveTo(0, offsetY);
          ctx.lineTo(w, offsetY);
          ctx.stroke();
        } else {
          // Determine if we're in "high frequency" mode (many cycles per screen)
          const cyclesOnScreen = frequency * timeWindow;
          const isHighFreq = cyclesOnScreen > samples / 4;
          // Use more sub-samples for better envelope quality
          const subSamples = isHighFreq ? 16 : 1;

          if (isHighFreq && coupling !== "GND") {
            // ENVELOPE MODE: smooth min/max envelope
            ctx.beginPath();
            const startTime = accumulatedTime - timeWindow;
            const points: { x: number; yMin: number; yMax: number }[] = [];

            for (let i = 0; i <= samples; i++) {
              const frac = i / samples;
              const time = startTime + frac * timeWindow;
              let vMin = Infinity, vMax = -Infinity;
              for (let j = 0; j < subSamples; j++) {
                const subTime = time + (j / subSamples) * (timeWindow / samples);
                let v = waveValue(2 * Math.PI * frequency * subTime, waveform, amplitude);
                if (v > vMax) vMax = v;
                if (v < vMin) vMin = v;
                if (v > vppMax) vppMax = v;
                if (v < vppMin) vppMin = v;
                sumV += v;
                sumV2 += v * v;
                sampleCount++;
              }
              const yMax = cy - ((vMax + offset) / voltDiv) * divH();
              const yMin = cy - ((vMin + offset) / voltDiv) * divH();
              points.push({ x: i, yMin, yMax });
            }

            // Filled envelope
            ctx.fillStyle = `rgba(${hexToRgb(greenColor)}, 0.15)`;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].yMax);
            for (const p of points) ctx.lineTo(p.x, p.yMax);
            for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].yMin);
            ctx.closePath();
            ctx.fill();

            // Top + bottom edges
            ctx.strokeStyle = greenBright;
            ctx.lineWidth = 1.2;
            ctx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.4)`;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            for (const p of points) ctx.lineTo(p.x, p.yMax);
            ctx.moveTo(points[0].x, points[0].yMin);
            for (const p of points) ctx.lineTo(p.x, p.yMin);
            ctx.stroke();
            ctx.shadowBlur = 0;
          } else {
            // NORMAL MODE: smooth continuous waveform
            ctx.beginPath();
            const startTime = accumulatedTime - timeWindow;
            ctx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.5)`;
            ctx.shadowBlur = 6;
            ctx.strokeStyle = greenBright;
            ctx.lineWidth = 1.8;
            for (let i = 0; i <= samples; i++) {
              const frac = i / samples;
              const time = startTime + frac * timeWindow;
              let v = waveValue(2 * Math.PI * frequency * time, waveform, amplitude);
              if (coupling === "AC") { v = v - 0; }
              const y = cy - ((v + offset) / voltDiv) * divH();
              if (v > vppMax) vppMax = v;
              if (v < vppMin) vppMin = v;
              sumV += v;
              sumV2 += v * v;
              sampleCount++;
              if (i === 0) ctx.moveTo(i, y);
              else ctx.lineTo(i, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
        ctx.shadowBlur = 0;
      }

      // ---- LABELS ----
      ctx.fillStyle = textDim;
      ctx.font = "9px monospace";

      // Top-left: channel info
      ctx.fillText(`CH1 · ${coupling} · ${channelOn ? "ON" : "OFF"}`, 8, 14);
      // Time/div
      const timeLabel = TIME_DIV_OPTIONS.find(o => o.value === timeDiv)?.label || "";
      ctx.fillText(`TIME: ${timeLabel}/div`, 8, 28);
      // Volt/div
      const voltLabel = VOLT_DIV_OPTIONS.find(o => o.value === voltDiv)?.label || "";
      ctx.fillText(`VOLT: ${voltLabel}/div`, 8, 42);
      // Offset
      ctx.fillText(`OFFSET: ${offset.toFixed(2)}V`, 8, 56);

      // Top-right: trigger info
      ctx.fillStyle = amberColor;
      ctx.fillText(`TRIG: ${triggerMode} · ${triggerEdge}`, w - 130, 14);
      ctx.fillText(`LVL: ${triggerLevel.toFixed(2)}V`, w - 130, 28);

      // Bottom: measurements
      ctx.fillStyle = greenBright;
      ctx.fillText(
        `Vpp:${measurements.vpp.toFixed(2)}V  Vrms:${measurements.vrms.toFixed(2)}V  Vavg:${measurements.vavg.toFixed(2)}V  f:${measurements.freq.toFixed(1)}Hz  T:${(measurements.period * 1000).toFixed(1)}ms`,
        8, h - 8
      );

      // Bottom-right: sweep status
      ctx.fillStyle = textFaint;
      ctx.fillText(triggerMode === "SINGLE" && triggerFiredRef.current ? "STOPPED" : "RUN", w - 60, h - 8);

      // === ANTI-COPY PROTECTION ===
      // Watermark the canvas + domain lock
      import("@/lib/canvas-protect").then(({ watermarkCanvas }) => {
        watermarkCanvas(ctx, w, h);
      });
    };

    if (!reduce) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      draw(performance.now());
      cancelAnimationFrame(rafRef.current);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [waveform, frequency, amplitude, timeDiv, voltDiv, offset, coupling, triggerMode, triggerEdge, triggerLevel, channelOn]);

  const controlBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      className={`signal-waveform-btn ${active ? "active" : ""}`}
      onClick={onClick}
      style={{ minWidth: "40px" }}
    >
      {label}
    </button>
  );

  return (
    <div className="signal-device">
      <div className="signal-device-bar">
        <span className="signal-device-name">DIGITAL OSCILLOSCOPE</span>
        <span className="signal-device-model">Tektronix MSO64 · 4CH · 1GHz</span>
      </div>
      <div className="signal-device-screen" style={{ height: 220 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="osc-controls">
        {/* Horizontal */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>TIME/DIV</span>
            <span className="value">{TIME_DIV_OPTIONS.find(o => o.value === timeDiv)?.label}</span>
          </div>
          <div className="osc-button-row">
            <button className="osc-arrow-btn" onClick={() => {
              const idx = TIME_DIV_OPTIONS.findIndex(o => o.value === timeDiv);
              if (idx < TIME_DIV_OPTIONS.length - 1) setTimeDiv(TIME_DIV_OPTIONS[idx + 1].value);
            }}>◄</button>
            <button className="osc-arrow-btn" onClick={() => {
              const idx = TIME_DIV_OPTIONS.findIndex(o => o.value === timeDiv);
              if (idx > 0) setTimeDiv(TIME_DIV_OPTIONS[idx - 1].value);
            }}>►</button>
          </div>
        </div>

        {/* Vertical */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>VOLT/DIV</span>
            <span className="value">{VOLT_DIV_OPTIONS.find(o => o.value === voltDiv)?.label}</span>
          </div>
          <div className="osc-button-row">
            <button className="osc-arrow-btn" onClick={() => {
              const idx = VOLT_DIV_OPTIONS.findIndex(o => o.value === voltDiv);
              if (idx > 0) setVoltDiv(VOLT_DIV_OPTIONS[idx - 1].value);
            }}>▲</button>
            <button className="osc-arrow-btn" onClick={() => {
              const idx = VOLT_DIV_OPTIONS.findIndex(o => o.value === voltDiv);
              if (idx < VOLT_DIV_OPTIONS.length - 1) setVoltDiv(VOLT_DIV_OPTIONS[idx + 1].value);
            }}>▼</button>
          </div>
        </div>

        {/* Offset */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>OFFSET</span>
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

        {/* Coupling */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>COUPLING</span>
          </div>
          <div className="osc-button-row">
            {(["AC", "DC", "GND"] as Coupling[]).map(c => (
              <button
                key={c}
                className={`signal-waveform-btn ${coupling === c ? "active" : ""}`}
                onClick={() => setCoupling(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger Mode */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>TRIG MODE</span>
          </div>
          <div className="osc-button-row">
            {(["AUTO", "NORM", "SINGLE"] as TriggerMode[]).map(m => (
              <button
                key={m}
                className={`signal-waveform-btn ${triggerMode === m ? "active" : ""}`}
                onClick={() => setTriggerMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger Edge */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>EDGE</span>
          </div>
          <div className="osc-button-row">
            {(["RISE", "FALL"] as TriggerEdge[]).map(e => (
              <button
                key={e}
                className={`signal-waveform-btn ${triggerEdge === e ? "active" : ""}`}
                onClick={() => setTriggerEdge(e)}
              >
                {e === "RISE" ? "↗" : "↘"}
              </button>
            ))}
          </div>
        </div>

        {/* Trigger Level */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>TRIG LVL</span>
            <span className="value">{triggerLevel.toFixed(2)}V</span>
          </div>
          <input
            type="range"
            className="signal-control-input"
            min="-5"
            max="5"
            step="0.1"
            value={triggerLevel}
            onChange={(e) => setTriggerLevel(parseFloat(e.target.value))}
          />
        </div>

        {/* Channel on/off */}
        <div className="osc-control-group">
          <div className="osc-control-label">
            <span>CHANNEL</span>
          </div>
          <button
            className={`signal-waveform-btn ${channelOn ? "active" : ""}`}
            onClick={() => setChannelOn(!channelOn)}
            style={{ width: "100%" }}
          >
            CH1 {channelOn ? "ON" : "OFF"}
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
