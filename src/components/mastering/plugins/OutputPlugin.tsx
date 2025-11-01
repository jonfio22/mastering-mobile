/**
 * @fileoverview Output Level Plugin Interface
 * @module components/mastering/plugins/OutputPlugin
 * @description Master output level with LUFS metering and export readiness indicator
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToDB, dBToKnob } from '@/lib/types/plugin.types';

export default function OutputPlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const outputParams = useAudioStore((state) => state.pluginParams.output);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('output', { bypassed: !outputParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('output', { gain: 0, bypassed: false });
  };

  const gainKnob = dBToKnob(outputParams.gain, -12, 12);

  const handleGainChange = (value: number) => {
    const gain = knobToDB(value, -12, 12);
    console.debug('[OutputPlugin] Gain: knob', value, '-> param', gain.toFixed(2), 'dB');
    updatePluginParams('output', { gain: Math.round(gain * 10) / 10 });
  };

  const leftLevel = meteringData ? (meteringData?.output?.leftPeak || 0) * 100 : 0;
  const rightLevel = meteringData ? (meteringData?.output?.rightPeak || 0) * 100 : 0;
  const lufs = -14.2; // TODO: Calculate from metering data
  const truePeak = Math.max(leftLevel, rightLevel);
  const isExportReady = lufs >= -15 && lufs <= -13 && truePeak < 99;

  return (
    <PluginBase
      title="MASTER OUTPUT"
      pluginType="output"
      bypassed={outputParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Master Level Control */}
        <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
            Master Level
          </h3>
          <RotaryKnob
            label="MASTER LEVEL"
            value={gainKnob}
            onChange={handleGainChange}
            size="xlarge"
            color="burgundy"
          />
          <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
            {outputParams.gain >= 0 ? '+' : ''}
            {outputParams.gain.toFixed(1)} dB
          </div>
        </div>

        {/* LUFS Display */}
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">Integrated Loudness</div>
          <div
            className={`text-3xl font-mono text-center ${
              lufs >= -15 && lufs <= -13
                ? 'text-emerald-400'
                : lufs < -15
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {lufs.toFixed(1)} LUFS
          </div>
          <div className="text-xs text-center text-gray-500 mt-2">
            Target: -14 LUFS (Streaming)
          </div>
        </div>

        {/* True Peak Display */}
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">True Peak</div>
          <div
            className={`text-xl font-mono text-center ${
              truePeak < 99 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {((truePeak - 100) / 10).toFixed(2)} dBTP
          </div>
        </div>

        {/* Export Ready Indicator */}
        <div
          className={`mb-6 p-6 rounded-xl border-2 text-center ${
            isExportReady
              ? 'bg-emerald-900/20 border-emerald-600'
              : 'bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700/30'
          }`}
        >
          <div className="text-2xl mb-2">{isExportReady ? '✓' : '○'}</div>
          <div
            className={`font-bold ${
              isExportReady ? 'text-emerald-400' : 'text-gray-500'
            }`}
          >
            {isExportReady ? 'EXPORT READY' : 'NOT OPTIMIZED'}
          </div>
          {!isExportReady && (
            <div className="text-xs text-gray-500 mt-2">
              Adjust levels to meet streaming standards
            </div>
          )}
        </div>

        {/* L/R Output Meters */}
        <div className="grid grid-cols-2 gap-4">
          <VUMeter label="LEFT OUT" type="volume" value={leftLevel} />
          <VUMeter label="RIGHT OUT" type="volume" value={rightLevel} />
        </div>
      </div>
    </PluginBase>
  );
}
