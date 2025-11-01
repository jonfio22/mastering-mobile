/**
 * @fileoverview Oxford-Style Limiter Plugin Interface
 * @module components/mastering/plugins/LimiterPlugin
 * @description Professional limiter with threshold, release, and gain reduction metering
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToDB, dBToKnob, knobToTime, timeToKnob } from '@/lib/types/plugin.types';

export default function LimiterPlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const limiterParams = useAudioStore((state) => state.pluginParams.limiter);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('limiter', { bypassed: !limiterParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('limiter', {
      threshold: -0.3,
      release: 100,
      bypassed: false,
    });
  };

  const thresholdKnob = dBToKnob(limiterParams.threshold, -20, 0);
  const releaseKnob = timeToKnob(limiterParams.release, 10, 1000);

  const handleThresholdChange = (value: number) => {
    const threshold = knobToDB(value, -20, 0);
    console.debug('[LimiterPlugin] Threshold: knob', value, '-> param', threshold.toFixed(2), 'dB');
    updatePluginParams('limiter', { threshold: Math.round(threshold * 10) / 10 });
  };

  const handleReleaseChange = (value: number) => {
    const release = knobToTime(value, 10, 1000);
    console.debug('[LimiterPlugin] Release: knob', value, '-> param', release.toFixed(2), 'ms');
    updatePluginParams('limiter', { release: Math.round(release) });
  };

  // Calculate gain reduction and levels
  const gainReduction = 0; // TODO: Get from metering data when available
  const inputLevel = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;
  const outputLevel = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;

  return (
    <PluginBase
      title="OXFORD LIMITER"
      pluginType="limiter"
      bypassed={limiterParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
            <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
              Threshold
            </h3>
            <div className="flex flex-col items-center gap-2">
              <RotaryKnob
                label="THRESHOLD"
                value={thresholdKnob}
                onChange={handleThresholdChange}
                size="xlarge"
                color="burgundy"
              />
              <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                {limiterParams.threshold.toFixed(1)} dB
              </div>
            </div>
          </div>

          <div className="space-y-4 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
            <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
              Release
            </h3>
            <div className="flex flex-col items-center gap-2">
              <RotaryKnob
                label="RELEASE"
                value={releaseKnob}
                onChange={handleReleaseChange}
                size="xlarge"
                color="default"
              />
              <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                {limiterParams.release} ms
              </div>
            </div>
          </div>
        </div>

        {/* Output Ceiling Display */}
        <div className="text-center mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">Output Ceiling</div>
          <div className="text-lg font-mono px-3 py-1 bg-black/30 rounded border border-emerald-500/20 text-emerald-400 inline-block">-0.1 dBTP</div>
        </div>

        {/* Meters */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <VUMeter label="INPUT" type="volume" value={inputLevel} />
          </div>
          <div>
            <VUMeter label="GAIN REDUCTION" type="reduction" value={gainReduction} />
          </div>
          <div>
            <VUMeter label="OUTPUT" type="volume" value={outputLevel} />
          </div>
        </div>

        {/* True Peak Warning */}
        {outputLevel > 99 && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-600/50 rounded text-red-400 text-sm text-center">
            ⚠️ TRUE PEAK WARNING
          </div>
        )}
      </div>
    </PluginBase>
  );
}
