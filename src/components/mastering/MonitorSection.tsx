import React, { useState } from 'react';
import VUMeter from './VUMeter';
import RotaryKnob from './RotaryKnob';
import HardwareButton from './HardwareButton';

export default function MonitorSection({ audioData }) {
  const [eqGain, setEqGain] = useState(50);
  const [monitor, setMonitor] = useState(50);
  const [redGain, setRedGain] = useState(50);
  const [masterKnob, setMasterKnob] = useState(50);
  const [activePreset, setActivePreset] = useState(null);

  const presetButtons = [
    ['1', '2', '3', '4'],
    ['5', '6', '7', '8']
  ];

  const controlButtons = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L']
  ];

  // Use audio data for meters, default to 0
  const volumeValue = audioData?.volume || 0;
  const reductionValue = audioData?.volume ? audioData.volume * 0.7 : 0;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700">
      {/* SOHO Centerpiece Header */}
      <div className="text-center border-b border-gray-700 pb-2">
        <div className="flex items-center justify-center gap-2">
          <svg viewBox="0 0 40 20" className="w-8 h-4 fill-gray-400">
            <path d="M5 10 L10 5 L10 15 Z M15 5 L20 10 L15 15 Z M25 5 L30 10 L25 15 Z M35 10 L30 5 L30 15 Z" />
          </svg>
          <h3 className="text-xs md:text-sm text-gray-200 font-bold tracking-widest">
            SOHO CENTERPIECE
          </h3>
        </div>
        <p className="text-[7px] md:text-[8px] text-gray-400 mt-1">12 & 6 CERTIMM 96KHAL</p>
      </div>

      {/* VU Meters */}
      <div className="grid grid-cols-2 gap-3">
        <VUMeter label="VOLUME" type="volume" value={volumeValue} />
        <VUMeter label="GAIN REDUCTION" type="reduction" value={reductionValue} />
      </div>

      {/* Control Knobs Row */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        <div className="flex flex-col items-center gap-2">
          <RotaryKnob
            label="EQ GAIN"
            value={eqGain}
            onChange={setEqGain}
            size="medium"
            color="burgundy"
          />
          <div className="grid grid-cols-2 gap-1 mt-1">
            {presetButtons.map((row, i) => (
              <React.Fragment key={i}>
                {row.map((btn) => (
                  <HardwareButton key={btn} label={btn} size="small" />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2">
          <RotaryKnob
            label="MONITOR"
            value={monitor}
            onChange={setMonitor}
            size="medium"
            color="blue"
          />
          <HardwareButton label="⟳" size="medium" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <RotaryKnob
            label="RED GAIN"
            value={redGain}
            onChange={setRedGain}
            size="medium"
            color="burgundy"
          />
          <div className="flex items-center gap-1">
            <span className="text-[8px] text-amber-400 font-mono">I/O:</span>
            <span className="text-[8px] text-amber-400 font-bold font-mono">18/19</span>
          </div>
        </div>
      </div>

      {/* Main Control Area */}
      <div className="grid grid-cols-2 gap-3">
        {/* Control Matrix */}
        <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
          <RotaryKnob
            value={masterKnob}
            onChange={setMasterKnob}
            size="large"
            color="default"
          />
          
          <div className="grid grid-cols-3 gap-1 mt-2">
            {controlButtons.map((row, i) => (
              <React.Fragment key={i}>
                {row.map((btn) => (
                  <HardwareButton 
                    key={btn} 
                    label={btn} 
                    size="small"
                    active={activePreset === btn}
                    onClick={() => setActivePreset(activePreset === btn ? null : btn)}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 mt-2">
            <HardwareButton label="▶" size="small" />
            <HardwareButton label="■" size="small" />
          </div>
        </div>

        {/* Monitor Dial */}
        <div className="flex flex-col items-center justify-center gap-3 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
          <div className="relative w-32 h-32 md:w-40 md:h-40">
            {/* Large monitor knob */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-600 via-gray-500 to-gray-700 shadow-2xl">
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-400 to-gray-600" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 shadow-inner" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-700 to-gray-800" />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <HardwareButton label="DIM" size="small" />
            <HardwareButton label="TALK" size="small" />
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex justify-between items-center px-2">
        <span className="text-[8px] text-gray-400 font-mono">MONITOR</span>
        <span className="text-[8px] text-gray-400 font-mono flex items-center gap-1">
          🎧 HEADPHONE
        </span>
      </div>
    </div>
  );
}