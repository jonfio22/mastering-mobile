/**
 * @fileoverview Stereo Width Plugin Interface
 * @module components/mastering/plugins/StereoPlugin
 * @description Stereo width control with phase correlation meter
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToPercent, percentToKnob } from '@/lib/types/plugin.types';

export default function StereoPlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const stereoParams = useAudioStore((state) => state.pluginParams.stereo);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('stereo', { bypassed: !stereoParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('stereo', { width: 100, bypassed: true }); // Reset to bypassed state
  };

  const widthKnob = percentToKnob(stereoParams.width, 0, 200);

  const handleWidthChange = (value: number) => {
    const width = knobToPercent(value, 0, 200);
    console.debug('[StereoPlugin] Width: knob', value, '-> param', width.toFixed(2), '%');
    updatePluginParams('stereo', { width: Math.round(width) });
  };

  const leftLevel = meteringData ? (meteringData?.output?.leftPeak || 0) * 100 : 0;
  const rightLevel = meteringData ? (meteringData?.output?.rightPeak || 0) * 100 : 0;
  const phaseCorrelation = 1; // TODO: Get from metering data when available

  return (
    <PluginBase
      title="STEREO WIDTH"
      pluginType="stereo"
      bypassed={stereoParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Width Control */}
        <div className="flex flex-col items-center gap-4 mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
            Stereo Width
          </h3>
          <RotaryKnob
            label="STEREO WIDTH"
            value={widthKnob}
            onChange={handleWidthChange}
            size="xlarge"
            color="default"
          />
          <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
            {stereoParams.width}%
          </div>
          <div className="text-xs text-gray-500">
            {stereoParams.width === 0 && 'MONO'}
            {stereoParams.width === 100 && 'NORMAL'}
            {stereoParams.width > 100 && 'WIDE'}
            {stereoParams.width > 0 && stereoParams.width < 100 && 'NARROW'}
          </div>
        </div>

        {/* Stereo Field Visualization */}
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">Stereo Field</div>
          <div className="relative h-32 flex items-center justify-center">
            <div
              className="absolute h-full bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-emerald-500/20 rounded transition-all duration-300"
              style={{ width: `${stereoParams.width}%` }}
            />
            <div className="relative text-xs font-mono text-gray-400">
              <span className="absolute -left-20">L</span>
              <span className="absolute -right-20">R</span>
            </div>
          </div>
        </div>

        {/* Phase Correlation */}
        <div className="mb-6 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
          <div className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">Phase Correlation</div>
          <div className="relative h-4 bg-gray-800 rounded overflow-hidden">
            <div
              className="absolute h-full bg-emerald-500"
              style={{
                left: '50%',
                width: `${Math.abs(phaseCorrelation) * 50}%`,
                transform: phaseCorrelation < 0 ? 'translateX(-100%)' : 'none',
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>-1</span>
            <span className="px-3 py-1 bg-black/30 rounded font-mono text-emerald-400 border border-emerald-500/20">{phaseCorrelation.toFixed(2)}</span>
            <span>+1</span>
          </div>
        </div>

        {/* L/R Meters */}
        <div className="grid grid-cols-2 gap-4">
          <VUMeter label="LEFT" type="volume" value={leftLevel} />
          <VUMeter label="RIGHT" type="volume" value={rightLevel} />
        </div>
      </div>
    </PluginBase>
  );
}
