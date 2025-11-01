/**
 * Type definitions for AudioWorklet messaging and management
 */

// ============================================================================
// Message Types (Main Thread <-> Audio Thread)
// ============================================================================

export type WorkletMessageType =
  | 'bypass'
  | 'parameter'
  | 'parameters'
  | 'reset'
  | 'getMetering'
  | 'metering'
  | 'performance'
  | 'error';

export interface WorkletMessage<T = unknown> {
  type: WorkletMessageType;
  payload: T;
}

// ============================================================================
// Parameter Types
// ============================================================================

export interface BypassPayload {
  value: boolean;
}

export interface ParameterPayload {
  name: string;
  value: number;
}

export interface ParametersPayload {
  [key: string]: number;
}

// ============================================================================
// Metering Types
// ============================================================================

export interface MeteringData {
  leftPeak: number;      // Linear (0-1)
  rightPeak: number;     // Linear (0-1)
  leftRMS: number;       // Linear (0-1)
  rightRMS: number;      // Linear (0-1)
  leftPeakDB: number;    // dB
  rightPeakDB: number;   // dB
  leftRMSDB: number;     // dB
  rightRMSDB: number;    // dB
}

export interface PerformanceData {
  avgProcessTimeMs: number;
  maxProcessTimeMs: number;
  cpuLoad: number;
  processCount: number;
}

export interface ErrorPayload {
  message: string;
  timestamp: number;
}

// ============================================================================
// Worklet Configuration
// ============================================================================

export interface WorkletConfig {
  name: string;
  url: string;
  processorName: string;
  numberOfInputs?: number;
  numberOfOutputs?: number;
  outputChannelCount?: number[];
  processorOptions?: Record<string, unknown>;
}

export interface WorkletNodeConfig {
  numberOfInputs?: number;
  numberOfOutputs?: number;
  outputChannelCount?: number[];
  channelCount?: number;
  channelCountMode?: ChannelCountMode;
  channelInterpretation?: ChannelInterpretation;
}

// ============================================================================
// Processor-Specific Parameter Types
// ============================================================================

// Baxandall EQ Parameters
export interface BaxandallEQParams {
  bassGain: number;      // dB (-12 to +12)
  trebleGain: number;    // dB (-12 to +12)
  bassFreq: number;      // Hz (50-500)
  trebleFreq: number;    // Hz (2000-16000)
  bypass: boolean;
}

// SSL Compressor Parameters
export interface SSLCompressorParams {
  threshold: number;     // dB (-60 to 0)
  ratio: number;         // 1-20
  attack: number;        // ms (0.1-100)
  release: number;       // ms (10-1000)
  makeupGain: number;    // dB (0-20)
  bypass: boolean;
}

// Limiter Parameters
export interface LimiterParams {
  threshold: number;     // dB (-20 to 0)
  release: number;       // ms (10-1000)
  ceiling: number;       // dB (-0.3 to 0)
  bypass: boolean;
}

// Union type for all processor parameters
export type ProcessorParams =
  | BaxandallEQParams
  | SSLCompressorParams
  | LimiterParams;

// ============================================================================
// Worklet Manager Types
// ============================================================================

export interface WorkletState {
  loaded: boolean;
  node: AudioWorkletNode | null;
  config: WorkletConfig;
  lastMetering: MeteringData | null;
  lastPerformance: PerformanceData | null;
  errors: ErrorPayload[];
}

export type WorkletEventType = 'metering' | 'performance' | 'error' | 'loaded' | 'unloaded';

export interface WorkletEventHandler {
  (data: unknown): void;
}

export interface WorkletEventHandlers {
  metering?: (data: MeteringData) => void;
  performance?: (data: PerformanceData) => void;
  error?: (error: ErrorPayload) => void;
  loaded?: (workletName: string) => void;
  unloaded?: (workletName: string) => void;
}

// ============================================================================
// Browser Compatibility
// ============================================================================

export interface AudioWorkletSupport {
  supported: boolean;
  audioContext: boolean;
  audioWorklet: boolean;
  reason?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type WorkletStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WorkletLoadOptions {
  retries?: number;
  timeout?: number;
  onProgress?: (status: string) => void;
}

// ============================================================================
// Error Types
// ============================================================================

export class WorkletError extends Error {
  constructor(
    message: string,
    public code: WorkletErrorCode,
    public workletName?: string
  ) {
    super(message);
    this.name = 'WorkletError';
  }
}

export enum WorkletErrorCode {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  LOAD_FAILED = 'LOAD_FAILED',
  MODULE_NOT_FOUND = 'MODULE_NOT_FOUND',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  NODE_CREATION_FAILED = 'NODE_CREATION_FAILED',
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  PARAMETER_ERROR = 'PARAMETER_ERROR',
  AUDIO_CONTEXT_ERROR = 'AUDIO_CONTEXT_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}
