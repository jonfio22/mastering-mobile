import React, { useState } from 'react';
import RotaryKnob from './RotaryKnob';
import VerticalFader from './VerticalFader';
import HardwareButton from './HardwareButton';

export default function EQSection() {
  const [knobValues, setKnobValues] = useState(Array(8).fill(50));
  const [faderValues, setFaderValues] = useState(Array(5).fill(50));
  const [soloStates, setSoloStates] = useState(Array(4).fill(false));
  const [muteStates, setMuteStates] = useState(Array(4).fill(false));

  const channelLabels = ['1-2', '3-4', '5-6', '7-8'];

  return (
    <div className="flex flex-col gap-4 p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700">
      {/* Header */}
      <div className="text-center border-b border-gray-700 pb-2">
        <h3 className="text-[10px] md:text-xs text-gray-300 font-bold tracking-wider">
          EQ GAIN / COMPRESSION
        </h3>
      </div>

      {/* Rotary knobs row */}
      <div className="border-2 border-gray-700 rounded-lg p-3 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
          {knobValues.map((value, i) => (
            <RotaryKnob
              key={i}
              value={value}
              onChange={(val) => {
                const newValues = [...knobValues];
                newValues[i] = val;
                setKnobValues(newValues);
              }}
              size="small"
              color="burgundy"
            />
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="text-[8px] text-gray-400 font-mono uppercase">
            Stereo Input Channels 9-24
          </span>
        </div>
      </div>

      {/* Channel strips */}
      <div className="border-2 border-gray-700 rounded-lg p-3 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2 md:gap-4">
          {/* Channels 1-8 */}
          {channelLabels.map((label, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="flex gap-1">
                <HardwareButton
                  label="S"
                  variant="solo"
                  size="small"
                  active={soloStates[i]}
                  onClick={() => {
                    const newStates = [...soloStates];
                    newStates[i] = !newStates[i];
                    setSoloStates(newStates);
                  }}
                />
                <HardwareButton
                  label="M"
                  variant="mute"
                  size="small"
                  active={muteStates[i]}
                  onClick={() => {
                    const newStates = [...muteStates];
                    newStates[i] = !newStates[i];
                    setMuteStates(newStates);
                  }}
                />
              </div>
              <span className="text-[9px] text-gray-300 font-mono">{label}</span>
              <VerticalFader
                value={faderValues[i]}
                onChange={(val) => {
                  const newValues = [...faderValues];
                  newValues[i] = val;
                  setFaderValues(newValues);
                }}
                height="h-24 md:h-32"
              />
            </div>
          ))}

          {/* Master/Drive fader */}
          <div className="flex flex-col items-center gap-2">
            <HardwareButton
              label="DRIVE"
              size="small"
            />
            <span className="text-[9px] text-gray-300 font-mono">MASTER</span>
            <VerticalFader
              value={faderValues[4]}
              onChange={(val) => {
                const newValues = [...faderValues];
                newValues[4] = val;
                setFaderValues(newValues);
              }}
              height="h-24 md:h-32"
            />
          </div>
        </div>
        
        <div className="text-center mt-3 pt-2 border-t border-gray-700">
          <span className="text-[8px] text-gray-400 font-mono uppercase">
            Stereo Input Channels 1-8
          </span>
        </div>
      </div>
    </div>
  );
}