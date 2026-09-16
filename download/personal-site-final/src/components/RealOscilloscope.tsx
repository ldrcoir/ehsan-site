"use client";

import { useEffect, useRef, useState } from "react";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";
type Coupling = "AC" | "DC" | "GND";
type TriggerMode = "AUTO" | "NORM" | "SINGLE";
type TriggerEdge = "RISE" | "FALL";

const TIME_DIV_OPTIONS = [
  { label: "100us", value: 0.0001 },
  { label: "200us", value: 0.0002 },
  { label: "500us", value: 0.0005 },
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

export default function RealOscilloscope({ waveform, frequency, amplitude }: {
  waveform: Waveform; frequency: number; amplitude: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const triggerFiredRef = useRef(false);
  const sweepOffsetRef = useRef(0); // Holds the trigger-locked start time

  const [timeDiv, setTimeDiv] = useState(0.05);
  const [voltDiv, setVoltDiv] = useState(1);
  const [offset, setOffset] = useState(0);
  const [coupling, setCoupling] = useState<Coupling>("DC");
  const [triggerMode, setTriggerMode] = useState<TriggerMode>("AUTO");
  const [triggerEdge, setTriggerEdge] = useState<TriggerEdge>("RISE");
  const [triggerLevel, setTriggerLevel] = useState(0);
  const [channelOn, setChannelOn] = useState(true);
  const [measurements, setMeasurements] = useState({ vpp: 0, vrms: 0, vavg: 0, freq: 0, period: 0 });

  // Convert waveform to voltage value at a given phase
  const waveValue = (phase: number, wf: Waveform, amp: number): number => {
    const t = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const peakV = amp * 5;
    switch (wf) {
      case "sine": return Math.sin(t) * peakV;
      case "square": return (t < Math.PI ? 1 : -1) * peakV;
      case "triangle": return (t < Math.PI ? -1 + (2 * t / Math.PI) : 3 - (2 * t / Math.PI)) * peakV;
      case "sawtooth": return ((t / Math.PI) - 1) * peakV;
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
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

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
      const greenBright = styles.getPropertyValue("--green-bright").trim() || "#39ff14";
      const textDim = styles.getPropertyValue("--text-dim").trim() || "#4a7a4a";
      const textFaint = styles.getPropertyValue("--text-faint").trim() || "#2a4a2a";
      const amberColor = styles.getPropertyValue("--amber").trim() || "#ffb000";

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, w, h);

      // Grid
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

      const cy = h / 2;
      const cx = w / 2;

      // Center axes
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.4)`;
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

      // Tick marks
      ctx.strokeStyle = `rgba(${hexToRgb(greenColor)}, 0.3)`;
      for (let i = 0; i <= GRID_DIVS_X * 5; i++) {
        const x = (i / (GRID_DIVS_X * 5)) * w;
        ctx.beginPath(); ctx.moveTo(x, cy - 3); ctx.lineTo(x, cy + 3); ctx.stroke();
      }
      for (let i = 0; i <= GRID_DIVS_Y * 5; i++) {
        const y = (i / (GRID_DIVS_Y * 5)) * h;
        ctx.beginPath(); ctx.moveTo(cx - 3, y); ctx.lineTo(cx + 3, y); ctx.stroke();
      }

      // Trigger level indicator
      const tLevelY = cy - ((triggerLevel - offset) / voltDiv) * divH();
      if (tLevelY >= 0 && tLevelY <= h) {
        ctx.fillStyle = amberColor;
        ctx.beginPath();
        ctx.moveTo(0, tLevelY);
        ctx.lineTo(8, tLevelY - 4);
        ctx.lineTo(8, tLevelY + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = `rgba(${hexToRgb(amberColor)}, 0.3)`;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(8, tLevelY); ctx.lineTo(w, tLevelY); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Offset indicator
      const offsetY = cy - (offset / voltDiv) * divH();
      ctx.fillStyle = greenColor;
      ctx.beginPath();
      ctx.moveTo(w - 8, offsetY);
      ctx.lineTo(w, offsetY - 4);
      ctx.lineTo(w, offsetY + 4);
      ctx.closePath();
      ctx.fill();

      // === WAVEFORM — STABLE TRIGGERED DISPLAY ===
      if (channelOn) {
        const timeWindow = timeDiv * GRID_DIVS_X;
        const samples = Math.min(Math.floor(w), 800);

        // Update measurements every 0.5s
        if (measurementTimer > 0.5 && sampleCount > 0) {
          const vpp = vppMax - vppMin;
          const vavg = sumV / sampleCount;
          const vrms = Math.sqrt(sumV2 / sampleCount);
          setMeasurements({ vpp, vrms, vavg, freq: frequency, period: 1 / frequency });
          vppMax = -Infinity; vppMin = Infinity;
          sumV = 0; sumV2 = 0; sampleCount = 0;
          measurementTimer = 0;
        }

        if (coupling === "GND") {
          ctx.beginPath();
          ctx.moveTo(0, offsetY);
          ctx.lineTo(w, offsetY);
          ctx.strokeStyle = greenBright;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          // === TRIGGERED SWEEP — stable display ===
          // Find trigger point: scan from current time backward to find a rising/falling edge
          // that crosses triggerLevel. This locks the display so it doesn't scroll.
          let triggerTime = accumulatedTime - timeWindow;
          const period = 1 / Math.max(frequency, 0.001);
          
          // For stable display: align to phase = 0 (or trigger crossing)
          // Calculate the start time that aligns the waveform
          const phaseAtNow = 2 * Math.PI * frequency * accumulatedTime;
          const cyclesElapsed = Math.floor(phaseAtNow / (2 * Math.PI));
          
          if (triggerMode === "AUTO") {
            // Auto: lock to nearest cycle boundary for stable display
            const alignedTime = (cyclesElapsed * period) - timeWindow * 0.1;
            triggerTime = alignedTime;
          } else {
            // NORM/SINGLE: find trigger crossing
            const searchStart = accumulatedTime - timeWindow * 2;
            let found = false;
            for (let i = 0; i < samples; i++) {
              const frac = i / samples;
              const t1 = searchStart + frac * timeWindow * 2;
              const t2 = t1 + (timeWindow * 2) / samples;
              const v1 = waveValue(2 * Math.PI * frequency * t1, waveform, amplitude);
              const v2 = waveValue(2 * Math.PI * frequency * t2, waveform, amplitude);
              if (triggerEdge === "RISE" && v1 < triggerLevel && v2 >= triggerLevel) {
                triggerTime = t1;
                found = true;
                break;
              }
              if (triggerEdge === "FALL" && v1 > triggerLevel && v2 <= triggerLevel) {
                triggerTime = t1;
                found = true;
                break;
              }
            }
            if (!found && triggerMode === "NORM") {
              // No trigger found — don't draw
              // Still draw labels
              ctx.fillStyle = textDim;
              ctx.font = "9px monospace";
              ctx.fillText("NO TRIGGER", w / 2 - 40, h / 2);
              // Draw labels and return
              drawLabels();
              return;
            }
          }

          // Draw waveform from triggerTime
          ctx.shadowColor = `rgba(${hexToRgb(greenColor)}, 0.5)`;
          ctx.shadowBlur = 6;
          ctx.strokeStyle = greenBright;
          ctx.lineWidth = 1.8;
          ctx.beginPath();

          const cyclesOnScreen = frequency * timeWindow;
          const isHighFreq = cyclesOnScreen > samples / 4;

          if (isHighFreq) {
            // Envelope mode for high frequencies
            const subSamples = 16;
            for (let i = 0; i <= samples; i++) {
              const frac = i / samples;
              const time = triggerTime + frac * timeWindow;
              let vMin = Infinity, vMax = -Infinity;
              for (let j = 0; j < subSamples; j++) {
                const subTime = time + (j / subSamples) * (timeWindow / samples);
                const v = waveValue(2 * Math.PI * frequency * subTime, waveform, amplitude);
                if (v > vMax) vMax = v;
                if (v < vMin) vMin = v;
                if (v > vppMax) vppMax = v;
                if (v < vppMin) vppMin = v;
                sumV += v; sumV2 += v * v; sampleCount++;
              }
              const yMax = cy - ((vMax + offset) / voltDiv) * divH();
              const yMin = cy - ((vMin + offset) / voltDiv) * divH();
              if (i === 0) ctx.moveTo(i, (yMax + yMin) / 2);
              else {
                ctx.lineTo(i, yMax);
                ctx.lineTo(i, yMin);
              }
            }
          } else {
            // Normal mode — stable waveform
            for (let i = 0; i <= samples; i++) {
              const frac = i / samples;
              const time = triggerTime + frac * timeWindow;
              const v = waveValue(2 * Math.PI * frequency * time, waveform, amplitude);
              const y = cy - ((v + offset) / voltDiv) * divH();
              if (v > vppMax) vppMax = v;
              if (v < vppMin) vppMin = v;
              sumV += v; sumV2 += v * v; sampleCount++;
              if (i === 0) ctx.moveTo(i, y);
              else ctx.lineTo(i, y);
            }
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      drawLabels();

      function drawLabels() {
        ctx.fillStyle = textDim;
        ctx.font = "9px monospace";
        ctx.fillText(`CH1 - ${coupling} - ${channelOn ? "ON" : "OFF"}`, 8, 14);
        const timeLabel = TIME_DIV_OPTIONS.find(o => o.value === timeDiv)?.label || "";
        ctx.fillText(`TIME: ${timeLabel}/div`, 8, 28);
        const voltLabel = VOLT_DIV_OPTIONS.find(o => o.value === voltDiv)?.label || "";
        ctx.fillText(`VOLT: ${voltLabel}/div`, 8, 42);
        ctx.fillText(`OFFSET: ${offset.toFixed(2)}V`, 8, 56);
        ctx.fillStyle = amberColor;
        ctx.fillText(`TRIG: ${triggerMode} - ${triggerEdge}`, w - 130, 14);
        ctx.fillText(`LVL: ${triggerLevel.toFixed(2)}V`, w - 130, 28);
        ctx.fillStyle = greenBright;
        ctx.fillText(
          `Vpp:${measurements.vpp.toFixed(2)}V  Vrms:${measurements.vrms.toFixed(2)}V  Vavg:${measurements.vavg.toFixed(2)}V  f:${measurements.freq.toFixed(1)}Hz  T:${(measurements.period * 1000).toFixed(1)}ms`,
          8, h - 8
        );
        ctx.fillStyle = textFaint;
        ctx.fillText(triggerMode === "SINGLE" && triggerFiredRef.current ? "STOPPED" : "RUN", w - 60, h - 8);
      }

      // Anti-copy watermark
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

  return (
    <div className="signal-device">
      <div className="signal-device-bar">
        <span className="signal-device-name">DIGITAL OSCILLOSCOPE</span>
        <span className="signal-device-model">Tektronix MSO64 - 4CH - 1GHz</span>
      </div>
      <div className="signal-device-screen" style={{ height: 220 }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
      </div>
      <div className="osc-controls">
        <div className="osc-control-group">
          <div className="osc-control-label"><span>TIME/DIV</span><span className="value">{TIME_DIV_OPTIONS.find(o => o.value === timeDiv)?.label}</span></div>
          <div className="osc-button-row">
            <button className="osc-arrow-btn" onClick={() => { const idx = TIME_DIV_OPTIONS.findIndex(o => o.value === timeDiv); if (idx < TIME_DIV_OPTIONS.length - 1) setTimeDiv(TIME_DIV_OPTIONS[idx + 1].value); }}>left</button>
            <button className="osc-arrow-btn" onClick={() => { const idx = TIME_DIV_OPTIONS.findIndex(o => o.value === timeDiv); if (idx > 0) setTimeDiv(TIME_DIV_OPTIONS[idx - 1].value); }}>right</button>
          </div>
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>VOLT/DIV</span><span className="value">{VOLT_DIV_OPTIONS.find(o => o.value === voltDiv)?.label}</span></div>
          <div className="osc-button-row">
            <button className="osc-arrow-btn" onClick={() => { const idx = VOLT_DIV_OPTIONS.findIndex(o => o.value === voltDiv); if (idx > 0) setVoltDiv(VOLT_DIV_OPTIONS[idx - 1].value); }}>^</button>
            <button className="osc-arrow-btn" onClick={() => { const idx = VOLT_DIV_OPTIONS.findIndex(o => o.value === voltDiv); if (idx < VOLT_DIV_OPTIONS.length - 1) setVoltDiv(VOLT_DIV_OPTIONS[idx + 1].value); }}>v</button>
          </div>
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>OFFSET</span><span className="value">{offset.toFixed(2)}V</span></div>
          <input type="range" className="signal-control-input" min="-5" max="5" step="0.1" value={offset} onChange={(e) => setOffset(parseFloat(e.target.value))} />
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>COUPLING</span></div>
          <div className="osc-button-row">
            {(["AC", "DC", "GND"] as Coupling[]).map(c => (
              <button key={c} className={`signal-waveform-btn ${coupling === c ? "active" : ""}`} onClick={() => setCoupling(c)}>{c}</button>
            ))}
          </div>
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>TRIG MODE</span></div>
          <div className="osc-button-row">
            {(["AUTO", "NORM", "SINGLE"] as TriggerMode[]).map(m => (
              <button key={m} className={`signal-waveform-btn ${triggerMode === m ? "active" : ""}`} onClick={() => setTriggerMode(m)}>{m}</button>
            ))}
          </div>
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>EDGE</span></div>
          <div className="osc-button-row">
            {(["RISE", "FALL"] as TriggerEdge[]).map(e => (
              <button key={e} className={`signal-waveform-btn ${triggerEdge === e ? "active" : ""}`} onClick={() => setTriggerEdge(e)}>{e === "RISE" ? "^" : "v"}</button>
            ))}
          </div>
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>TRIG LVL</span><span className="value">{triggerLevel.toFixed(2)}V</span></div>
          <input type="range" className="signal-control-input" min="-5" max="5" step="0.1" value={triggerLevel} onChange={(e) => setTriggerLevel(parseFloat(e.target.value))} />
        </div>
        <div className="osc-control-group">
          <div className="osc-control-label"><span>CHANNEL</span></div>
          <button className={`signal-waveform-btn ${channelOn ? "active" : ""}`} onClick={() => setChannelOn(!channelOn)} style={{ width: "100%" }}>CH1 {channelOn ? "ON" : "OFF"}</button>
        </div>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return "0, 255, 65";
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}
