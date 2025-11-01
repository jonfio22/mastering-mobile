/**
 * @fileoverview Baxandall 2-Band EQ Plugin Interface
 * @module components/mastering/plugins/EQPlugin
 * @description Professional EQ plugin with bass and treble controls
 */

import React from 'react';
import PluginBase from './PluginBase';
import RotaryKnob from '../RotaryKnob';
import VUMeter from '../VUMeter';
import { useAudioStore } from '@/store/audioStore';
import { knobToDB, dBToKnob, knobToFrequency, frequencyToKnob } from '@/lib/types/plugin.types';

/**
 * EQPlugin Component
 *
 * Baxandall 2-band EQ with:
 * - Bass Gain (-12 to +12 dB)
 * - Bass Frequency (20-500 Hz)
 * - Treble Gain (-12 to +12 dB)
 * - Treble Frequency (1k-20k Hz)
 * - Output VU meter
 */
export default function EQPlugin() {
  const closePluginModal = useAudioStore((state) => state.closePluginModal);
  const eqParams = useAudioStore((state) => state.pluginParams.eq);
  const updatePluginParams = useAudioStore((state) => state.updatePluginParams);
  const meteringData = useAudioStore((state) => state.meteringData);

  const handleBypassToggle = () => {
    updatePluginParams('eq', { bypassed: !eqParams.bypassed });
  };

  const handleReset = () => {
    updatePluginParams('eq', {
      bassGain: 0,
      bassFreq: 100,
      trebleGain: 0,
      trebleFreq: 10000,
      bypassed: false,
    });
  };

  // Convert parameter values to knob values (0-100)
  const bassGainKnob = dBToKnob(eqParams.bassGain, -12, 12);
  const bassFreqKnob = frequencyToKnob(eqParams.bassFreq, 20, 500);
  const trebleGainKnob = dBToKnob(eqParams.trebleGain, -12, 12);
  const trebleFreqKnob = frequencyToKnob(eqParams.trebleFreq, 1000, 20000);

  // Handle knob changes
  const handleBassGainChange = (value: number) => {
    const gain = knobToDB(value, -12, 12);
    console.debug('[EQPlugin] Bass Gain: knob', value, '-> param', gain.toFixed(2), 'dB');
    updatePluginParams('eq', { bassGain: Math.round(gain * 10) / 10 });
  };

  const handleBassFreqChange = (value: number) => {
    const freq = knobToFrequency(value, 20, 500);
    console.debug('[EQPlugin] Bass Freq: knob', value, '-> param', freq.toFixed(2), 'Hz');
    updatePluginParams('eq', { bassFreq: Math.round(freq) });
  };

  const handleTrebleGainChange = (value: number) => {
    const gain = knobToDB(value, -12, 12);
    console.debug('[EQPlugin] Treble Gain: knob', value, '-> param', gain.toFixed(2), 'dB');
    updatePluginParams('eq', { trebleGain: Math.round(gain * 10) / 10 });
  };

  const handleTrebleFreqChange = (value: number) => {
    const freq = knobToFrequency(value, 1000, 20000);
    console.debug('[EQPlugin] Treble Freq: knob', value, '-> param', freq.toFixed(2), 'Hz');
    updatePluginParams('eq', { trebleFreq: Math.round(freq) });
  };

  // Calculate VU meter value from metering data (if available)
  const vuValue = meteringData
    ? Math.max(meteringData?.output?.leftPeak || 0, meteringData?.output?.rightPeak || 0) * 100
    : 0;

  return (
    <PluginBase
      title="BAXANDALL EQ"
      pluginType="eq"
      bypassed={eqParams.bypassed}
      onClose={closePluginModal}
      onBypassToggle={handleBypassToggle}
      onReset={handleReset}
    >
      <div className="max-w-5xl mx-auto">
        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Bass Controls */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
            <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
              Bass Shelf
            </h3>
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center">
                <RotaryKnob
                  label="BASS GAIN"
                  value={bassGainKnob}
                  onChange={handleBassGainChange}
                  size="large"
                  color="burgundy"
                />
                <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  {eqParams.bassGain >= 0 ? '+' : ''}
                  {eqParams.bassGain.toFixed(1)} dB
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RotaryKnob
                  label="BASS FREQ"
                  value={bassFreqKnob}
                  onChange={handleBassFreqChange}
                  size="large"
                  color="default"
                />
                <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  {eqParams.bassFreq} Hz
                </div>
              </div>
            </div>
          </div>

          {/* Treble Controls */}
          <div className="space-y-4 p-6 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
            <h3 className="text-xs font-bold text-emerald-400 tracking-[0.15em] text-center mb-2 uppercase">
              Treble Shelf
            </h3>
            <div className="flex flex-col items-center gap-6">
              <div className="flex flex-col items-center">
                <RotaryKnob
                  label="TREBLE GAIN"
                  value={trebleGainKnob}
                  onChange={handleTrebleGainChange}
                  size="large"
                  color="burgundy"
                />
                <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  {eqParams.trebleGain >= 0 ? '+' : ''}
                  {eqParams.trebleGain.toFixed(1)} dB
                </div>
              </div>
              <div className="flex flex-col items-center">
                <RotaryKnob
                  label="TREBLE FREQ"
                  value={trebleFreqKnob}
                  onChange={handleTrebleFreqChange}
                  size="large"
                  color="default"
                />
                <div className="mt-2 px-3 py-1 bg-black/30 rounded text-xs font-mono text-emerald-400 border border-emerald-500/20">
                  {(eqParams.trebleFreq / 1000).toFixed(1)} kHz
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Output Meter */}
        <div className="max-w-xs mx-auto">
          <VUMeter label="OUTPUT" type="volume" value={vuValue} />
        </div>
      </div>
    </PluginBase>
  );
}
