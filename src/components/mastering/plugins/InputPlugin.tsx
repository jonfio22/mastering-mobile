/**
 * @fileoverview Input Gain Plugin Interface
 * @module components/mastering/plugins/InputPlugin
 * @description Input gain stage with clipping detection
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToDB, dBToKnob } from '@/lib/types/plugin.types';

export default function InputPlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const inputParams = useAudioStore((state) => state.pluginParams.input);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('input', { bypassed: !inputParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('input', { gain: 0, bypassed: true }); // Reset to bypassed state
  };

  const gainKnob = dBToKnob(inputParams.gain, -12, 12);

  const handleGainChange = (value: number) => {
    const gain = knobToDB(value, -12, 12);
    console.debug('[InputPlugin] Gain: knob', value, '-> param', gain.toFixed(2), 'dB');
    updatePluginParams('input', { gain: Math.round(gain * 10) / 10 });
  };

  const inputLevel = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;
  const outputLevel = inputLevel; // TODO: Apply gain to calculate output
  const isClipping = outputLevel > 100;

  return (
    <PluginBase
      title="INPUT GAIN"
      pluginType="input"
      bypassed={inputParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Gain Control */}
        <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
            Input Gain
          </h3>
          <RotaryKnob
            label="INPUT GAIN"
            value={gainKnob}
            onChange={handleGainChange}
            size="xlarge"
            color="burgundy"
          />
          <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
            {inputParams.gain >= 0 ? '+' : ''}
            {inputParams.gain.toFixed(1)} dB
          </div>
        </div>

        {/* Clipping Indicator */}
        {isClipping && (
          <div className="mb-6 p-4 bg-red-900/20 border-2 border-red-600 rounded text-center animate-pulse">
            <div className="text-2xl mb-2">⚠️</div>
            <div className="text-red-400 font-bold">CLIPPING DETECTED</div>
            <div className="text-xs text-red-300 mt-1">Reduce input gain</div>
          </div>
        )}

        {/* I/O Meters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <VUMeter label="PRE-GAIN" type="volume" value={inputLevel} />
          </div>
          <div>
            <VUMeter label="POST-GAIN" type="volume" value={outputLevel} />
            {isClipping && (
              <div className="mt-2 text-center">
                <div className="inline-block px-3 py-1 bg-red-600 rounded text-white text-xs font-bold">
                  CLIP
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PluginBase>
  );
}
