/**
 * @fileoverview Tape Saturation Plugin Interface
 * @module components/mastering/plugins/TapePlugin
 * @description Analog tape saturation with drive control
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToPercent, percentToKnob } from '@/lib/types/plugin.types';

export default function TapePlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const tapeParams = useAudioStore((state) => state.pluginParams.tape);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('tape', { bypassed: !tapeParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('tape', { drive: 0, bypassed: false });
  };

  const driveKnob = percentToKnob(tapeParams.drive, 0, 100);

  const handleDriveChange = (value: number) => {
    const drive = knobToPercent(value, 0, 100);
    console.debug('[TapePlugin] Drive: knob', value, '-> param', drive.toFixed(2), '%');
    updatePluginParams('tape', { drive: Math.round(drive) });
  };

  const inputLevel = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;
  const outputLevel = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;

  return (
    <PluginBase
      title="TAPE SATURATION"
      pluginType="tape"
      bypassed={tapeParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Drive Control */}
        <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
            Drive
          </h3>
          <div
            className="relative"
            style={{
              filter: `drop-shadow(0 0 ${tapeParams.drive / 5}px rgba(255, 140, 0, ${
                tapeParams.drive / 100
              }))`,
            }}
          >
            <RotaryKnob
              label="DRIVE"
              value={driveKnob}
              onChange={handleDriveChange}
              size="xlarge"
              color="burgundy"
            />
          </div>
          <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">{tapeParams.drive}%</div>
        </div>

        {/* Warmth Indicator */}
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-br from-orange-900/20 to-amber-900/20 transition-opacity duration-300"
            style={{ opacity: tapeParams.drive / 100 }}
          />
          <div className="relative text-center">
            <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">Harmonic Warmth</div>
            <div className="relative h-24 flex items-end justify-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-4 bg-gradient-to-t from-orange-600 to-amber-500 rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(
                      10,
                      (tapeParams.drive / 100) * (Math.random() * 60 + 40)
                    )}%`,
                    opacity: tapeParams.drive / 100,
                  }}
                />
              ))}
            </div>
            <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-amber-400 border border-amber-500/20 inline-block">
              {tapeParams.drive === 0 && 'CLEAN'}
              {tapeParams.drive > 0 && tapeParams.drive < 30 && 'SUBTLE'}
              {tapeParams.drive >= 30 && tapeParams.drive < 70 && 'WARM'}
              {tapeParams.drive >= 70 && 'HOT'}
            </div>
          </div>
        </div>

        {/* I/O Meters */}
        <div className="grid grid-cols-2 gap-4">
          <VUMeter label="INPUT" type="volume" value={inputLevel} />
          <VUMeter label="OUTPUT" type="volume" value={outputLevel} />
        </div>
      </div>
    </PluginBase>
  );
}
