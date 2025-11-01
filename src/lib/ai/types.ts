/**
 * @fileoverview Type definitions for AI-powered audio analysis system
 * @module lib/ai/types
 * @description Professional audio analysis types for mastering critique and problem detection
 */

/**
 * Issue severity levels for audio problems
 */
export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Issue category classification
 */
export enum IssueCategory {
  FREQUENCY_MASKING = 'frequency_masking',
  PHASE_CORRELATION = 'phase_correlation',
  TONAL_BALANCE = 'tonal_balance',
  DYNAMIC_RANGE = 'dynamic_range',
  STEREO_FIELD = 'stereo_field',
  CLIPPING = 'clipping',
  DC_OFFSET = 'dc_offset',
}

/**
 * Frequency range classifications
 */
export enum FrequencyRange {
  SUB_BASS = 'sub_bass', // 20-60 Hz
  BASS = 'bass', // 60-250 Hz
  LOW_MID = 'low_mid', // 250-500 Hz
  MID = 'mid', // 500-2000 Hz
  HIGH_MID = 'high_mid', // 2000-4000 Hz
  PRESENCE = 'presence', // 4000-6000 Hz
  BRILLIANCE = 'brilliance', // 6000-20000 Hz
}

/**
 * Frequency masking issue detected by AI analysis
 */
export interface MaskingIssue {
  /** Issue category */
  category: IssueCategory.FREQUENCY_MASKING;

  /** Severity level */
  severity: Severity;

  /** Confidence score (0-1) */
  confidence: number;

  /** Frequency range where masking occurs */
  frequencyRange: FrequencyRange;

  /** Specific frequency bands affected (Hz) */
  frequencies: {
    masking: number; // Dominant frequency
    masked: number; // Obscured frequency
  };

  /** Energy ratio between masking and masked components */
  maskingRatio: number; // dB difference

  /** Time range where issue occurs (seconds) */
  timeRange: {
    start: number;
    end: number;
  };

  /** Human-readable description */
  description: string;

  /** Actionable suggestion for improvement */
  suggestion: string;
}

/**
 * Phase correlation issue in stereo field
 */
export interface PhaseIssue {
  /** Issue category */
  category: IssueCategory.PHASE_CORRELATION;

  /** Severity level */
  severity: Severity;

  /** Confidence score (0-1) */
  confidence: number;

  /** Phase correlation coefficient (-1 to 1) */
  correlation: number;

  /** Frequency range affected */
  frequencyRange: FrequencyRange;

  /** Specific frequency band (Hz) */
  frequency: number;

  /** Time range where issue occurs (seconds) */
  timeRange: {
    start: number;
    end: number;
  };

  /** Mono compatibility warning */
  monoCompatible: boolean;

  /** Human-readable description */
  description: string;

  /** Actionable suggestion for improvement */
  suggestion: string;
}

/**
 * Tonal balance issue
 */
export interface TonalIssue {
  /** Issue category */
  category: IssueCategory.TONAL_BALANCE;

  /** Severity level */
  severity: Severity;

  /** Confidence score (0-1) */
  confidence: number;

  /** Frequency range that's imbalanced */
  frequencyRange: FrequencyRange;

  /** Deviation from reference curve (dB) */
  deviation: number;

  /** Energy level in this band (dBFS) */
  energyLevel: number;

  /** Expected energy level (dBFS) */
  expectedLevel: number;

  /** Whether this range is too loud or too quiet */
  type: 'excessive' | 'deficient';

  /** Human-readable description */
  description: string;

  /** Actionable suggestion for improvement */
  suggestion: string;
}

/**
 * Base issue type
 */
export type AudioIssue = MaskingIssue | PhaseIssue | TonalIssue;

/**
 * Overall mix quality score breakdown
 */
export interface QualityScore {
  /** Overall score (0-100) */
  overall: number;

  /** Individual category scores */
  breakdown: {
    frequency: number; // Frequency balance (0-100)
    dynamics: number; // Dynamic range (0-100)
    stereo: number; // Stereo field quality (0-100)
    clarity: number; // Mix clarity/separation (0-100)
    loudness: number; // Loudness optimization (0-100)
  };
}

/**
 * Mix critique with professional suggestions
 */
export interface MixCritique {
  /** Overall quality assessment */
  summary: string;

  /** Quality score breakdown */
  score: QualityScore;

  /** Strengths of the mix */
  strengths: string[];

  /** Areas for improvement */
  improvements: string[];

  /** Priority issues to address first */
  priorityIssues: AudioIssue[];

  /** Genre-specific recommendations (if detected) */
  genreNotes?: string[];

  /** Before/after improvement estimate */
  estimatedImprovement: {
    scoreIncrease: number; // Estimated points gained (0-100)
    description: string;
  };
}

/**
 * Spectral analysis data for frequency detection
 */
export interface SpectralAnalysis {
  /** FFT magnitude data (dB) */
  magnitudes: Float32Array[];

  /** Frequency bins (Hz) */
  frequencies: number[];

  /** Time stamps for each frame (seconds) */
  timeStamps: number[];

  /** FFT size used */
  fftSize: number;

  /** Hop size between frames */
  hopSize: number;

  /** Sample rate */
  sampleRate: number;
}

/**
 * Critical band energy distribution (Bark scale)
 */
export interface CriticalBandEnergy {
  /** Critical band index (0-24 for Bark scale) */
  band: number;

  /** Center frequency (Hz) */
  centerFrequency: number;

  /** Lower frequency bound (Hz) */
  lowerBound: number;

  /** Upper frequency bound (Hz) */
  upperBound: number;

  /** Energy in this band (dBFS) */
  energy: number;

  /** Deviation from reference (dB) */
  deviation: number;
}

/**
 * Complete AI analysis result
 */
export interface AnalysisResult {
  /** Timestamp of analysis */
  timestamp: number;

  /** Audio duration analyzed (seconds) */
  duration: number;

  /** All detected issues */
  issues: AudioIssue[];

  /** Issues grouped by severity */
  issuesBySeverity: {
    critical: AudioIssue[];
    high: AudioIssue[];
    medium: AudioIssue[];
    low: AudioIssue[];
  };

  /** Overall mix critique */
  critique: MixCritique;

  /** Spectral analysis data */
  spectralAnalysis: SpectralAnalysis;

  /** Critical band energy distribution */
  criticalBands: CriticalBandEnergy[];

  /** Phase correlation over time */
  phaseCorrelation: {
    overall: number; // Average correlation (-1 to 1)
    byFrequency: Array<{
      frequency: number;
      correlation: number;
    }>;
  };

  /** Dynamic range analysis */
  dynamicRange: {
    crestFactor: number; // dB
    peakToRMS: number; // dB
    recommendation: string;
  };

  /** Loudness analysis */
  loudness: {
    lufsIntegrated: number;
    lufsMomentaryMax: number;
    truePeak: number; // dBTP
    recommendation: string;
  };

  /** Processing time (ms) */
  processingTime: number;
}

/**
 * Configuration options for AI analysis
 */
export interface AnalysisConfig {
  /** FFT size for spectral analysis (default: 8192) */
  fftSize?: number;

  /** Hop size as fraction of FFT size (default: 0.25) */
  hopSizeFraction?: number;

  /** Enable frequency masking detection */
  enableMaskingDetection?: boolean;

  /** Enable phase correlation analysis */
  enablePhaseAnalysis?: boolean;

  /** Enable tonal balance analysis */
  enableTonalBalance?: boolean;

  /** Enable dynamic range analysis */
  enableDynamicRange?: boolean;

  /** Enable loudness analysis (LUFS) */
  enableLoudnessAnalysis?: boolean;

  /** Minimum confidence threshold for reporting issues (0-1) */
  confidenceThreshold?: number;

  /** Minimum severity for reporting (default: LOW) */
  minimumSeverity?: Severity;

  /** Reference curve for tonal balance (default: 'k-weighting') */
  referenceCurve?: 'k-weighting' | 'fletcher-munson' | 'flat';

  /** Genre hint for specialized analysis */
  genreHint?: 'rock' | 'pop' | 'classical' | 'electronic' | 'jazz' | 'hip-hop' | 'auto';
}

/**
 * Frequency band definition for analysis
 */
export interface FrequencyBand {
  /** Band name */
  name: FrequencyRange;

  /** Lower frequency (Hz) */
  lowerFreq: number;

  /** Upper frequency (Hz) */
  upperFreq: number;

  /** Center frequency (Hz) */
  centerFreq: number;

  /** Expected energy range (dBFS) */
  expectedRange: {
    min: number;
    max: number;
    optimal: number;
  };
}

/**
 * Masking threshold calculation result
 */
export interface MaskingThreshold {
  /** Frequency bin */
  frequency: number;

  /** Threshold level (dB) */
  threshold: number;

  /** Actual signal level (dB) */
  signalLevel: number;

  /** Whether signal is masked */
  isMasked: boolean;

  /** Masking margin (dB) */
  margin: number;
}

/**
 * Reference curves for tonal balance comparison
 */
export interface ReferenceCurve {
  /** Curve name */
  name: string;

  /** Frequency points (Hz) */
  frequencies: number[];

  /** Expected levels at each frequency (dB) */
  levels: number[];

  /** Description */
  description: string;
}
