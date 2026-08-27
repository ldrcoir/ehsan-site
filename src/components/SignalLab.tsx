"use client";

import { useState } from "react";
import RealSignalGenerator from "./RealSignalGenerator";
import RealOscilloscope from "./RealOscilloscope";

type Waveform = "sine" | "square" | "triangle" | "sawtooth";
type Modulation = "NONE" | "AM" | "FM";

/**
 * SignalLab — Real Signal Generator + Real Oscilloscope, wirelessly connected.
 * The generator produces a signal; the oscilloscope displays it with full controls.
 *
 * Modulation state lives HERE (lifted up) so that the oscilloscope sees the same
 * modulated signal the generator is producing. Otherwise changing modulation on
 * the generator wouldn't be reflected on the scope.
 */
export default function SignalLab() {
  const [waveform, setWaveform] = useState<Waveform>("sine");
  const [frequency, setFrequency] = useState(3); // Hz (visual)
  const [amplitude, setAmplitude] = useState(0.7); // 0-1

  // Modulation state — shared between generator and oscilloscope
  const [modulation, setModulation] = useState<Modulation>("NONE");
  const [modFreq, setModFreq] = useState(10); // Hz
  const [modDepth, setModDepth] = useState(0.5); // 0-1
  const [outputOn, setOutputOn] = useState(true);

  return (
    <div className="signal-lab signal-lab-vertical">
      <RealSignalGenerator
        waveform={waveform}
        frequency={frequency}
        amplitude={amplitude}
        onWaveformChange={setWaveform}
        onFrequencyChange={setFrequency}
        onAmplitudeChange={setAmplitude}
        // Modulation — controlled from parent so the scope sees the same signal
        modulation={modulation}
        modFreq={modFreq}
        modDepth={modDepth}
        outputOn={outputOn}
        onModulationChange={setModulation}
        onModFreqChange={setModFreq}
        onModDepthChange={setModDepth}
        onOutputOnChange={setOutputOn}
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
        modulation={modulation}
        modFreq={modFreq}
        modDepth={modDepth}
        outputOn={outputOn}
      />
    </div>
  );
}
