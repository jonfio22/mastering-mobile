/**
 * @fileoverview Comprehensive TypeScript type definitions for professional audio mastering engine
 * @module types/audio
 * @description Defines all interfaces, types, and enums for the audio processing pipeline
 */

/**
 * Supported audio sample rates (Hz)
 */
export enum SampleRate {
  SR_44100 = 44100,
  SR_48000 = 48000,
  SR_88200 = 88200,
  SR_96000 = 96000,
  SR_176400 = 176400,
  SR_192000 = 192000,
}

/**
 * Supported bit depths for audio processing
 */
export enum BitDepth {
  BIT_16 = 16,
  BIT_24 = 24,
  BIT_32 = 32,
}

/**
 * Supported audio file formats
 */
export enum AudioFormat {
  WAV = 'wav',
  AIFF = 'aiff',
  FLAC = 'flac',
  MP3 = 'mp3',
  AAC = 'aac',
  OGG = 'ogg',
}

/**
 * Audio engine operational states
 */
export enum EngineState {
  UNINITIALIZED = 'uninitialized',
  INITIALIZING = 'initializing',
  READY = 'ready',
  LOADING = 'loading',
  PLAYING = 'playing',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  ERROR = 'error',
  SUSPENDED = 'suspended',
}

/**
 * Signal chain routing modes
 */
export enum ChainMode {
  SERIAL = 'serial',
  PARALLEL = 'parallel',
}

/**
 * Processor types for the signal chain
 */
export enum ProcessorType {
  EQUALIZER = 'equalizer',
  COMPRESSOR = 'compressor',
  LIMITER = 'limiter',
  REVERB = 'reverb',
  DELAY = 'delay',
  SATURATOR = 'saturator',
  STEREO_WIDENER = 'stereo_widener',
  CUSTOM = 'custom',
}

/**
 * Metering modes
 */
export enum MeteringMode {
  PEAK = 'peak',
  RMS = 'rms',
  LUFS = 'lufs',
  TRUE_PEAK = 'true_peak',
}

/**
 * Real-time metering data structure
 */
export interface MeteringData {
  /** Peak amplitude in dBFS (-Infinity to 0) */
  peakL: number;
  peakR: number;

  /** RMS (Root Mean Square) in dBFS */
  rmsL: number;
  rmsR: number;

  /** Timestamp when metered */
  timestamp: number;

  /** Sample accurate position */
  samplePosition: number;
}

/**
 * Extended metering data for LUFS calculation
 */
export interface ExtendedMeteringData extends MeteringData {
  /** Integrated LUFS (Long-term) */
  lufsIntegrated?: number;

  /** Short-term LUFS (3 seconds) */
  lufsShortTerm?: number;

  /** Momentary LUFS (400ms) */
  lufsMomentary?: number;

  /** True peak in dBTP */
  truePeakL?: number;
  truePeakR?: number;
}

/**
 * Audio buffer metadata
 */
export interface AudioBufferMetadata {
  /** Sample rate in Hz */
  sampleRate: number;

  /** Number of channels */
  numberOfChannels: number;

  /** Duration in seconds */
  duration: number;

  /** Total number of samples */
  length: number;

  /** Bit depth */
  bitDepth: BitDepth;

  /** File format */
  format: AudioFormat;

  /** File size in bytes */
  fileSize: number;

  /** Original filename */
  filename: string;
}

/**
 * Configuration for audio processors
 */
export interface ProcessorConfig {
  /** Unique identifier for the processor */
  id: string;

  /** Type of processor */
  type: ProcessorType;

  /** Human-readable name */
  name: string;

  /** Whether processor is bypassed */
  bypassed: boolean;

  /** Whether processor is enabled in the chain */
  enabled: boolean;

  /** Wet/dry mix (0-1) */
  mix: number;

  /** Input gain in dB */
  inputGain: number;

  /** Output gain in dB */
  outputGain: number;

  /** Processor-specific parameters */
  parameters: Record<string, number | string | boolean>;

  /** Preset name if loaded */
  preset?: string;
}

/**
 * Signal chain node representation
 */
export interface SignalChainNode {
  /** Unique node identifier */
  id: string;

  /** Configuration for this processor */
  config: ProcessorConfig;

  /** The actual Web Audio API node */
  node: AudioNode;

  /** Chain mode (serial/parallel) */
  mode: ChainMode;

  /** Position in the chain */
  order: number;

  /** Input gain node */
  inputGain: GainNode;

  /** Output gain node */
  outputGain: GainNode;

  /** Metering analyser */
  analyser?: AnalyserNode;
}

/**
 * Processor metadata for UI and serialization
 */
export interface ProcessorMetadata {
  /** Processor type */
  type: ProcessorType;

  /** Display name */
  displayName: string;

  /** Description */
  description: string;

  /** Category for grouping */
  category: 'dynamics' | 'frequency' | 'spatial' | 'modulation' | 'utility';

  /** Default parameter values */
  defaultParameters: Record<string, number | string | boolean>;

  /** Parameter definitions */
  parameters: ParameterDefinition[];

  /** Whether supports wet/dry mix */
  supportsMix: boolean;

  /** CPU usage estimate (1-10) */
  cpuUsage: number;
}

/**
 * Parameter definition for processor controls
 */
export interface ParameterDefinition {
  /** Parameter key */
  key: string;

  /** Display label */
  label: string;

  /** Value type */
  type: 'number' | 'boolean' | 'enum' | 'string';

  /** Minimum value (for numbers) */
  min?: number;

  /** Maximum value (for numbers) */
  max?: number;

  /** Default value */
  default: number | string | boolean;

  /** Step size for UI controls */
  step?: number;

  /** Unit of measurement */
  unit?: string;

  /** Available options (for enums) */
  options?: string[];

  /** Tooltip description */
  description?: string;
}

/**
 * Complete audio engine state
 */
export interface AudioEngineState {
  /** Current operational state */
  state: EngineState;

  /** AudioContext sample rate */
  sampleRate: number;

  /** Loaded audio buffer metadata */
  audioMetadata: AudioBufferMetadata | null;

  /** Current playback position in seconds */
  currentTime: number;

  /** Whether audio is currently playing */
  isPlaying: boolean;

  /** Whether audio is looping */
  isLooping: boolean;

  /** Master input gain in dB */
  inputGain: number;

  /** Master output gain in dB */
  outputGain: number;

  /** Signal chain nodes */
  signalChain: SignalChainNode[];

  /** Current metering data */
  meteringData: MeteringData;

  /** Last error if any */
  lastError: AudioEngineError | null;
}

/**
 * Audio engine error types
 */
export enum AudioErrorType {
  INITIALIZATION_FAILED = 'initialization_failed',
  AUDIO_CONTEXT_ERROR = 'audio_context_error',
  FILE_LOAD_ERROR = 'file_load_error',
  DECODE_ERROR = 'decode_error',
  UNSUPPORTED_FORMAT = 'unsupported_format',
  UNSUPPORTED_SAMPLE_RATE = 'unsupported_sample_rate',
  PROCESSOR_ERROR = 'processor_error',
  PLAYBACK_ERROR = 'playback_error',
  PERMISSION_DENIED = 'permission_denied',
  UNKNOWN = 'unknown',
}

/**
 * Custom audio engine error
 */
export interface AudioEngineError {
  /** Error type */
  type: AudioErrorType;

  /** Human-readable message */
  message: string;

  /** Original error object */
  originalError?: Error;

  /** Timestamp when error occurred */
  timestamp: number;

  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Audio engine configuration options
 */
export interface AudioEngineConfig {
  /** Target sample rate (defaults to system sample rate) */
  sampleRate?: number;

  /** Latency hint for AudioContext */
  latencyHint?: AudioContextLatencyCategory;

  /** Enable high-precision metering */
  enablePrecisionMetering?: boolean;

  /** Metering update interval in ms */
  meteringInterval?: number;

  /** Maximum number of processors allowed */
  maxProcessors?: number;

  /** Enable automatic gain compensation */
  autoGainCompensation?: boolean;

  /** Enable oversampling for processors */
  enableOversampling?: boolean;
}

/**
 * Audio file validation result
 */
export interface AudioFileValidation {
  /** Whether file is valid */
  isValid: boolean;

  /** Detected format */
  format?: AudioFormat;

  /** File size in bytes */
  fileSize?: number;

  /** MIME type */
  mimeType?: string;

  /** Validation errors if any */
  errors?: string[];

  /** Warnings (non-fatal) */
  warnings?: string[];
}

/**
 * Export configuration for rendered audio
 */
export interface ExportConfig {
  /** Target sample rate */
  sampleRate: SampleRate;

  /** Target bit depth */
  bitDepth: BitDepth;

  /** Target format */
  format: AudioFormat;

  /** Whether to apply dithering */
  dithering: boolean;

  /** Normalize to target level (dBFS) */
  normalizeLevel?: number;

  /** Trim silence from start/end */
  trimSilence?: boolean;

  /** Fade in duration (seconds) */
  fadeIn?: number;

  /** Fade out duration (seconds) */
  fadeOut?: number;
}

/**
 * Playback state
 */
export interface PlaybackState {
  /** Current playback position (seconds) */
  currentTime: number;

  /** Total duration (seconds) */
  duration: number;

  /** Playback rate (0.5 - 2.0) */
  playbackRate: number;

  /** Whether playing */
  isPlaying: boolean;

  /** Whether paused */
  isPaused: boolean;

  /** Whether stopped */
  isStopped: boolean;

  /** Whether looping */
  isLooping: boolean;

  /** Loop start point (seconds) */
  loopStart?: number;

  /** Loop end point (seconds) */
  loopEnd?: number;
}

/**
 * Frequency spectrum data
 */
export interface SpectrumData {
  /** Frequency bin data (amplitude) */
  frequencies: Float32Array;

  /** Time domain data */
  waveform: Float32Array;

  /** FFT size */
  fftSize: number;

  /** Frequency resolution (Hz/bin) */
  frequencyResolution: number;

  /** Timestamp */
  timestamp: number;
}

/**
 * Analysis result for loaded audio
 */
export interface AudioAnalysis {
  /** Overall peak level (dBFS) */
  peakLevel: number;

  /** Overall RMS level (dBFS) */
  rmsLevel: number;

  /** Integrated LUFS */
  lufsIntegrated: number;

  /** True peak (dBTP) */
  truePeak: number;

  /** Dynamic range (dB) */
  dynamicRange: number;

  /** Detected clipping samples */
  clippingSamples: number;

  /** DC offset (if present) */
  dcOffset: number;

  /** Stereo correlation */
  stereoCorrelation: number;

  /** Detected silence regions */
  silenceRegions: Array<{ start: number; end: number }>;
}
