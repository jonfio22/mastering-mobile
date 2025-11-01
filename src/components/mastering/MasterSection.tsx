import React, { useState } from 'react';
import RotaryKnob from './RotaryKnob';
import HardwareButton from './HardwareButton';

export default function MasterSection() {
  const [inputLevel, setInputLevel] = useState(50);
  const [stereoWidth, setStereoWidth] = useState(50);
  const [analyze, setAnalyze] = useState(50);
  const [peakTrack, setPeakTrack] = useState(true);
  const [other, setOther] = useState(false);
  const [loopSection, setLoopSection] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700">
      {/* Header */}
      <div className="text-center border-b border-gray-700 pb-2">
        <h3 className="text-[10px] md:text-xs text-gray-300 font-bold tracking-wider">
          MASTER BUSS
        </h3>
      </div>

      {/* Input Level Section */}
      <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[8px] text-gray-400 font-mono uppercase">Output</span>
          <RotaryKnob
            value={inputLevel}
            onChange={setInputLevel}
            size="small"
            color="default"
          />
        </div>
        
        {/* Level Meter */}
        <div className="relative h-32 md:h-40 w-full bg-gradient-to-b from-gray-950 to-gray-900 rounded border border-gray-800 overflow-hidden">
          {/* Meter scale */}
          <div className="absolute inset-0 flex flex-col justify-between p-1 text-[7px] text-gray-500 font-mono">
            {['+6', '+3', '0', '-3', '-6', '-12', '-18', '-24'].map((db, i) => (
              <div key={db} className="flex items-center">
                <span className="w-6">{db}</span>
                <div className="flex-1 h-px bg-gray-700 ml-1" />
              </div>
            ))}
          </div>
          
          {/* Meter bar */}
          <div className="absolute right-2 top-2 bottom-2 w-8 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500 rounded-sm opacity-70"
               style={{ 
                 clipPath: `inset(${100 - inputLevel}% 0 0 0)`
               }}
          />
        </div>

        <span className="text-[8px] text-gray-400 font-mono text-center uppercase mt-2">
          Input Level
        </span>
      </div>

      {/* Stereo Width */}
      <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        <span className="text-[9px] text-gray-300 font-mono uppercase text-center">
          Stereo Width
        </span>
        
        <div className="flex items-center justify-center gap-2">
          <span className="text-[7px] text-gray-500">LIMITER</span>
          <RotaryKnob
            value={stereoWidth}
            onChange={setStereoWidth}
            size="medium"
            color="default"
          />
        </div>

        {/* Threshold Fader */}
        <div className="mt-2">
          <span className="text-[8px] text-gray-400 font-mono block text-center mb-1">
            THRESHOLD
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={stereoWidth}
            onChange={(e) => setStereoWidth(Number(e.target.value))}
            className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #f59e0b ${stereoWidth}%, #1f2937 ${stereoWidth}%)`
            }}
          />
        </div>
      </div>

      {/* LUFS Target */}
      <div className="flex flex-col gap-2 p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        <span className="text-[9px] text-gray-300 font-mono uppercase text-center">
          LUFS Target
        </span>
        
        {/* LUFS Meter */}
        <div className="relative h-20 bg-gradient-to-b from-gray-950 to-gray-900 rounded border border-gray-800">
          <div className="absolute inset-0 flex flex-col justify-between p-1 text-[7px] text-gray-500 font-mono">
            {['-6', '-9', '-12', '-14', '-16'].map((lufs) => (
              <div key={lufs} className="flex items-center justify-between">
                <span>{lufs}</span>
                <div className="w-1 h-px bg-gray-700" />
              </div>
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-1 mt-2">
          <button
            onClick={() => setPeakTrack(!peakTrack)}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-2 h-2 rounded-full ${peakTrack ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-gray-700'}`} />
            <span className="text-[7px] text-gray-400 font-mono">PEAK TRACK</span>
          </button>
          
          <button
            onClick={() => setOther(!other)}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-2 h-2 rounded-full ${other ? 'bg-amber-500 shadow-lg shadow-amber-500/50' : 'bg-gray-700'}`} />
            <span className="text-[7px] text-gray-400 font-mono">OTHER</span>
          </button>
          
          <button
            onClick={() => setLoopSection(!loopSection)}
            className="flex flex-col items-center gap-1"
          >
            <div className={`w-2 h-2 rounded-full ${loopSection ? 'bg-purple-500 shadow-lg shadow-purple-500/50' : 'bg-gray-700'}`} />
            <span className="text-[7px] text-gray-400 font-mono">LOOP SECTION</span>
          </button>
        </div>
      </div>

      {/* Analyze Knob */}
      <div className="flex justify-center p-3 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
        <RotaryKnob
          label="ANALYZE"
          value={analyze}
          onChange={setAnalyze}
          size="medium"
          color="default"
        />
      </div>
    </div>
  );
}