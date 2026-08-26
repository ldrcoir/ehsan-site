"use client";

import { useState } from "react";
import RealSignalGenerator from "./RealSignalGenerator";
import RealOscilloscope from "./RealOscilloscope";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";

/**
 * SignalLab — Real Signal Generator + Real Oscilloscope, wirelessly connected.
 * The generator produces a signal; the oscilloscope displays it with full controls.
 */
export default function SignalLab() {
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [frequency, setFrequency] = useState(3); // Hz (visual)
  const [amplitude, setAmplitude] = useState(0.7); // 0-1

  return (
    <div className="signal-lab signal-lab-vertical">
      <RealSignalGenerator
        waveform={waveform}
        frequency={frequency}
        amplitude={amplitude}
        onWaveformChange={setWaveform}
        onFrequencyChange={setFrequency}
        onAmplitudeChange={setAmplitude}
      />

      {/* Wireless link indicator */}
      <div className="signal-link-vertical">
        <div className="signal-link-waves">
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
        </div>
        <span className="signal-link-label">wireless link active</span>
        <div className="signal-link-waves">
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
          <div className="signal-link-wave"></div>
        </div>
      </div>

      <RealOscilloscope
        waveform={waveform}
        frequency={frequency}
        amplitude={amplitude}
      />
    </div>
  );
}
