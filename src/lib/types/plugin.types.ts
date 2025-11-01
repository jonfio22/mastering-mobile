/**
 * @fileoverview TypeScript type definitions for mastering plugins
 * @module lib/types/plugin.types
 * @description Defines interfaces for all plugin parameters, UI state, and A/B comparison
 */

/**
 * Plugin types enum
 */
export type PluginType = 'eq' | 'limiter' | 'stereo' | 'tape' | 'input' | 'output';

/**
 * Metering mode types
 */
export type MeteringMode = 'input' | 'output' | 'reduction';

/**
 * A/B comparison mode types
 */
export type ABMode = 'reference' | 'dry-wet';

/**
 * EQ Plugin Parameters (Baxandall 2-Band)
 */
export interface BaxandallEQParams {
  bassGain: number;      // -12.0 to +12.0 dB, step 0.1, default 0.0
  bassFreq: number;      // 20 to 500 Hz, step 1, default 100
  trebleGain: number;    // -12.0 to +12.0 dB, step 0.1, default 0.0
  trebleFreq: number;    // 1000 to 20000 Hz, step 10, default 10000
  bypassed: boolean;     // default false
}

/**
 * Limiter Plugin Parameters (Oxford-Style)
 */
export interface OxfordLimiterParams {
  threshold: number;     // -20.0 to 0.0 dB, step 0.1, default -0.3
  release: number;       // 10 to 1000 ms, step 1, default 100
  ceiling: number;       // Fixed at -0.1 dBTP (display only)
  bypassed: boolean;     // default false
}

/**
 * Stereo Plugin Parameters
 */
export interface StereoWidthParams {
  width: number;         // 0 to 200%, step 1, default 100
  bypassed: boolean;     // default false
}

/**
 * Tape Plugin Parameters (Saturation)
 */
export interface TapeSaturationParams {
  drive: number;         // 0 to 100%, step 1, default 0
  bypassed: boolean;     // default false
}

/**
 * Input Plugin Parameters
 */
export interface InputGainParams {
  gain: number;          // -12.0 to +12.0 dB, step 0.1, default 0.0
  bypassed: boolean;     // default false
}

/**
 * Output Plugin Parameters
 */
export interface OutputGainParams {
  gain: number;          // -12.0 to +12.0 dB, step 0.1, default 0.0
  bypassed: boolean;     // default false
}

/**
 * Plugin parameters union type
 */
export type PluginParams =
  | BaxandallEQParams
  | OxfordLimiterParams
  | StereoWidthParams
  | TapeSaturationParams
  | InputGainParams
  | OutputGainParams;

/**
 * A/B Comparison State
 */
export interface ABComparisonState {
  // Files
  songAFile: File | null;              // Primary track (from main upload)
  songBFile: File | null;              // Reference track or null for dry/wet mode

  // Mode
  abMode: ABMode;

  // Trim controls
  songATrim: number;                   // -12.0 to +12.0 dB, default 0.0
  songBTrim: number;                   // -12.0 to +12.0 dB, default 0.0

  // Crossfade
  crossfade: number;                   // 0 to 100%, default 0 (Song A)

  // Active song
  activeSong: 'A' | 'B';               // default 'A'
}

/**
 * Plugin UI State
 */
export interface PluginUIState {
  openPlugin: PluginType | null;       // Currently open plugin modal
}

/**
 * All Plugin Parameters State
 */
export interface AllPluginParams {
  eq: BaxandallEQParams;
  limiter: OxfordLimiterParams;
  stereo: StereoWidthParams;
  tape: TapeSaturationParams;
  input: InputGainParams;
  output: OutputGainParams;
}

/**
 * Default plugin parameters
 */
export const DEFAULT_PLUGIN_PARAMS: AllPluginParams = {
  eq: {
    bassGain: 0,
    bassFreq: 100,
    trebleGain: 0,
    trebleFreq: 10000,
    bypassed: false,
  },
  limiter: {
    threshold: -0.3,
    release: 100,
    ceiling: -0.1,
    bypassed: false,
  },
  stereo: {
    width: 100,
    bypassed: false,
  },
  tape: {
    drive: 0,
    bypassed: false,
  },
  input: {
    gain: 0,
    bypassed: false,
  },
  output: {
    gain: 0,
    bypassed: false,
  },
};

/**
 * Default A/B comparison state
 */
export const DEFAULT_AB_STATE: ABComparisonState = {
  songAFile: null,
  songBFile: null,
  abMode: 'dry-wet',
  songATrim: 0,
  songBTrim: 0,
  crossfade: 0,
  activeSong: 'A',
};

/**
 * Linear conversion utilities
 * These functions perform proper bidirectional conversion between knob values (0-100)
 * and parameter values in their native ranges.
 */

/**
 * Utility function to convert rotary knob value (0-100) to parameter value (linear)
 * Formula: param = min + (knob / 100) * (max - min)
 * Examples:
 *   - knob=0 -> param=min
 *   - knob=50 -> param=(min+max)/2
 *   - knob=100 -> param=max
 */
export function knobToParam(knobValue: number, min: number, max: number): number {
  // Clamp knob value to valid range
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  const result = min + (clampedKnob / 100) * (max - min);
  return result;
}

/**
 * Utility function to convert parameter value to rotary knob value (0-100, linear)
 * This is the exact mathematical inverse of knobToParam
 * Formula: knob = ((param - min) / (max - min)) * 100
 * Examples:
 *   - param=min -> knob=0
 *   - param=(min+max)/2 -> knob=50
 *   - param=max -> knob=100
 */
export function paramToKnob(paramValue: number, min: number, max: number): number {
  // Clamp param value to valid range
  const clampedParam = Math.max(min, Math.min(max, paramValue));
  const range = max - min;
  if (range === 0) return 0; // Prevent division by zero
  const result = ((clampedParam - min) / range) * 100;
  return result;
}

/**
 * Logarithmic conversion for frequency-based parameters
 * Provides perceptually linear spacing (Hz feel linear)
 * Used for: bass frequency, treble frequency
 */
export function knobToFrequency(knobValue: number, minFreq: number, maxFreq: number): number {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const logFreq = minLog + (clampedKnob / 100) * (maxLog - minLog);
  return Math.exp(logFreq);
}

/**
 * Inverse of knobToFrequency - converts frequency to knob position
 */
export function frequencyToKnob(frequency: number, minFreq: number, maxFreq: number): number {
  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));
  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const logFreq = Math.log(clampedFreq);
  return ((logFreq - minLog) / (maxLog - minLog)) * 100;
}

/**
 * Decibel conversion with proper scaling
 * Provides linear dB feel with symmetric negative/positive ranges
 * Used for: gains, thresholds
 */
export function knobToDB(knobValue: number, minDB: number, maxDB: number): number {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  // Simple linear dB scaling
  return minDB + (clampedKnob / 100) * (maxDB - minDB);
}

/**
 * Inverse of knobToDB - converts dB value to knob position
 */
export function dBToKnob(dbValue: number, minDB: number, maxDB: number): number {
  const clampedDB = Math.max(minDB, Math.min(maxDB, dbValue));
  const range = maxDB - minDB;
  if (range === 0) return 0;
  return ((clampedDB - minDB) / range) * 100;
}

/**
 * Time/milliseconds conversion (linear)
 * Used for: release time, decay time
 */
export function knobToTime(knobValue: number, minMs: number, maxMs: number): number {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  return minMs + (clampedKnob / 100) * (maxMs - minMs);
}

/**
 * Inverse of knobToTime - converts milliseconds to knob position
 */
export function timeToKnob(ms: number, minMs: number, maxMs: number): number {
  const clampedMs = Math.max(minMs, Math.min(maxMs, ms));
  const range = maxMs - minMs;
  if (range === 0) return 0;
  return ((clampedMs - minMs) / range) * 100;
}

/**
 * Percentage conversion (linear, 0-100%)
 * Used for: width, drive, saturation
 */
export function knobToPercent(knobValue: number, minPercent: number = 0, maxPercent: number = 100): number {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  return minPercent + (clampedKnob / 100) * (maxPercent - minPercent);
}

/**
 * Inverse of knobToPercent - converts percentage to knob position
 */
export function percentToKnob(percent: number, minPercent: number = 0, maxPercent: number = 100): number {
  const clampedPercent = Math.max(minPercent, Math.min(maxPercent, percent));
  const range = maxPercent - minPercent;
  if (range === 0) return 0;
  return ((clampedPercent - minPercent) / range) * 100;
}
