import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import VUMeter from './VUMeter';
import RotaryKnob from './RotaryKnob';
import HardwareButton from './HardwareButton';
import { useAudioStore } from '@/store/audioStore';

export default function MonitorSection({ audioData }: { audioData: any }) {
  const router = useRouter();
  const [eqGain, setEqGain] = useState(50);
  const [monitor, setMonitor] = useState(50);
  const [redGain, setRedGain] = useState(50);
  const [masterKnob, setMasterKnob] = useState(50);
  const [activePreset, setActivePreset] = useState(null);

  // Get plugin state from audio store
  const openPlugin = useAudioStore((state) => state.openPlugin);
  const openPluginModal = useAudioStore((state) => state.openPluginModal);

  // Track last tap time for double-tap detection
  const lastTapTime = useRef<{ [key: string]: number }>({});

  // Default values for knobs
  const defaultValues: { [key: string]: number } = {
    eqGain: 50,
    monitor: 50,
    redGain: 50,
    masterKnob: 50
  };

  // Macro buttons for plugins
  const macroButtons = [
    { id: 'eq', label: 'EQ', icon: '═' },
    { id: 'limiter', label: 'LIMITER', icon: '▮' },
    { id: 'stereo', label: 'STEREO', icon: '◄►' },
    { id: 'tape', label: 'TAPE', icon: '◉' },
    { id: 'output', label: 'OUTPUT', icon: '▶' },
    { id: 'input', label: 'INPUT', icon: '◀' }
  ];

  const controlButtons = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L']
  ];

  // Handle double-tap for macro buttons
  const handleMacroTap = (buttonId: string) => {
    const now = Date.now();
    const lastTap = lastTapTime.current[buttonId] || 0;

    if (now - lastTap < 300) {
      // Double tap detected - open plugin
      openPluginModal(buttonId as any);
      console.log(`Opening ${buttonId} plugin`);
    }

    lastTapTime.current[buttonId] = now;
  };

  // Handle option-click for reset (Alt key on Windows/Linux, Option key on Mac)
  const handleKnobClick = (e: any, knobName: any, setter: any) => {
    if (e.altKey) {
      setter(defaultValues[knobName]);
      e.preventDefault();
    }
  };

  // Use audio data for meters, default to 0
  const volumeValue = audioData?.volume || 0;
  const reductionValue = audioData?.volume ? audioData.volume * 0.7 : 0;

  return (
    <div className="flex flex-col gap-2 p-2 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700 h-full">
      {/* VU Meters */}
      <div className="grid grid-cols-2 gap-2">
        <VUMeter label="VOLUME" type="volume" value={volumeValue} />
        <VUMeter label="GAIN REDUCTION" type="reduction" value={reductionValue} />
      </div>

      {/* Macro Plugin Buttons */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        {macroButtons.map((button) => (
          <button
            key={button.id}
            className={`
              relative px-3 py-4 rounded-lg
              bg-gradient-to-b from-gray-700 to-gray-800
              border-2 border-gray-600
              shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_2px_rgba(255,255,255,0.1)]
              hover:from-gray-650 hover:to-gray-750
              active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.7)]
              transition-all duration-75
              ${openPlugin === button.id ? 'ring-2 ring-emerald-500 bg-gradient-to-b from-emerald-900/30 to-gray-800' : ''}
            `}
            onClick={() => handleMacroTap(button.id)}
            title={`Double-tap to open ${button.label}`}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-lg text-gray-300">{button.icon}</span>
              <span className="text-[8px] md:text-[9px] text-gray-400 font-bold tracking-wider uppercase">
                {button.label}
              </span>
            </div>
            {openPlugin === button.id && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Monitor Button */}
      <button
        onClick={() => router.push('/monitor')}
        className="
          px-4 py-3 rounded-lg
          bg-gradient-to-b from-blue-700 to-blue-800
          border-2 border-blue-600
          shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_2px_rgba(255,255,255,0.1)]
          hover:from-blue-650 hover:to-blue-750
          active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.7)]
          transition-all duration-75
          text-center text-gray-100 text-sm font-bold tracking-wider uppercase
        "
      >
        📊 Monitor
      </button>
    </div>
  );
}