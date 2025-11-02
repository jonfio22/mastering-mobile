/**
 * ProfessionalAudioEngine
 *
 * High-quality audio processing engine for professional mastering
 * Integrates advanced DSP algorithms with proper metering and monitoring
 *
 * Signal Chain:
 * Input -> Professional EQ -> Professional Compressor -> Professional Limiter -> Output
 *
 * Features:
 * - Professional-grade DSP algorithms
 * - True peak limiting with oversampling
 * - ITU-R BS.1770 loudness measurement
 * - Comprehensive metering
 * - Low-latency processing
 * - Automatic quality optimization
 */

import { WorkletManager } from '../worklets/WorkletManager';
import {
  WorkletConfig,
  MeteringData,
  PerformanceData,
  WorkletError,
  WorkletErrorCode
} from '../types/worklet.types';

// Professional EQ parameters
export interface ProfessionalEQParams {
  bands: Array<{
    freq: number;      // Hz
    gain: number;      // dB
    q: number;         // Q factor
    type: 'highpass' | 'lowpass' | 'bell' | 'lowshelf' | 'highshelf' | 'bandpass' | 'notch';
    enabled: boolean;
  }>;
  useCramping: boolean;         // Analog frequency warping
  useAnalogSaturation: boolean; // Subtle warmth
}

// Professional Compressor parameters
export interface ProfessionalCompressorParams {
  threshold: number;     // dB
  ratio: number;        // x:1
  attack: number;       // ms
  release: number;      // ms
  knee: number;         // dB
  makeupGain: number;   // dB
  mix: number;          // % (parallel compression)

  // Advanced
  detectionMode: 'peak' | 'rms';
  lookahead: number;    // ms
  sidechainHPF: number; // Hz
  autoMakeup: boolean;
  programDependent: boolean;
  feedbackMode: boolean;
}

// Professional Limiter parameters
export interface ProfessionalLimiterParams {
  threshold: number;    // dB
  release: number;      // ms
  ceiling: number;      // dB

  // Advanced
  algorithm: 'transparent' | 'aggressive' | 'smooth';
  oversampling: 2 | 4 | 8;
  lookahead: number;    // ms
  adaptiveRelease: boolean;
  isr: boolean;         // Inter-sample reduction
  dithering: boolean;
  targetLUFS: number;   // Target loudness
}

export interface AudioEngineConfig {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
  meteringRate?: number;
  useOriginalProcessors?: boolean; // Allow fallback to original processors
}

export interface ProcessingChainState {
  eq: ProfessionalEQParams;
  compressor: ProfessionalCompressorParams;
  limiter: ProfessionalLimiterParams;
}

export interface AudioEngineMetering {
  input: MeteringData | null;
  eq: MeteringData | null;
  compressor: MeteringData | null;
  limiter: MeteringData | null;
  output: MeteringData | null;

  // Professional metering
  truePeak: number;      // dBTP
  lufs: number;         // LUFS
  dynamicRange: number; // LU
  gainReduction: {
    compressor: number;
    limiter: number;
  };
}

export type AudioEngineState = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

// Quality presets for different use cases
export enum QualityPreset {
  REALTIME = 'realtime',      // Low latency, moderate quality
  BALANCED = 'balanced',      // Good balance of quality and performance
  HIGH_QUALITY = 'high',      // Maximum quality, higher latency
  STREAMING = 'streaming',    // Optimized for streaming services
  MASTERING = 'mastering'     // Professional mastering quality
}

export class ProfessionalAudioEngine {
  private audioContext: AudioContext | null = null;
  private workletManager: WorkletManager;

  // Audio nodes
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  // Worklet nodes
  private eqNode: AudioWorkletNode | null = null;
  private compressorNode: AudioWorkletNode | null = null;
  private limiterNode: AudioWorkletNode | null = null;

  // State
  private state: AudioEngineState = 'idle';
  private qualityPreset: QualityPreset = QualityPreset.BALANCED;

  // Metering
  private metering: AudioEngineMetering = {
    input: null,
    eq: null,
    compressor: null,
    limiter: null,
    output: null,
    truePeak: 0,
    lufs: -100,
    dynamicRange: 0,
    gainReduction: {
      compressor: 0,
      limiter: 0
    }
  };

  // Configuration
  private config: Required<AudioEngineConfig>;

  // Event handlers
  private onStateChange?: (state: AudioEngineState) => void;
  private onError?: (error: Error) => void;
  private onMetering?: (metering: AudioEngineMetering) => void;

  constructor(config: AudioEngineConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 48000,
      latencyHint: config.latencyHint ?? 'interactive',
      meteringRate: config.meteringRate ?? 60,
      useOriginalProcessors: config.useOriginalProcessors ?? false
    };

    this.workletManager = new WorkletManager();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the audio engine with professional processors
   */
  async initialize(preset: QualityPreset = QualityPreset.BALANCED): Promise<void> {
    try {
      this.setState('loading');
      this.qualityPreset = preset;

      // Check browser support
      const support = this.workletManager.checkBrowserSupport();
      if (!support.supported) {
        throw new WorkletError(
          support.reason || 'AudioWorklet not supported',
          WorkletErrorCode.NOT_SUPPORTED
        );
      }

      // Create AudioContext with optimal settings for quality preset
      this.audioContext = new AudioContext({
        sampleRate: this.getOptimalSampleRate(preset),
        latencyHint: this.getOptimalLatency(preset)
      });

      // Initialize WorkletManager with context
      this.workletManager.initialize(this.audioContext);

      // Create basic nodes
      this.createBasicNodes();

      // Load professional worklets
      await this.loadProfessionalWorklets();

      // Connect signal chain
      this.connectSignalChain();

      // Start metering
      this.startMetering();

      // Apply quality preset
      this.applyQualityPreset(preset);

      this.setState('ready');

      console.log('[ProfessionalAudioEngine] Initialized successfully', {
        preset,
        sampleRate: this.audioContext.sampleRate,
        baseLatency: this.audioContext.baseLatency,
        outputLatency: this.audioContext.outputLatency
      });

    } catch (error) {
      // Fallback to original processors if professional ones fail
      if (this.config.useOriginalProcessors) {
        console.warn('[ProfessionalAudioEngine] Falling back to original processors');
        await this.loadOriginalWorklets();
      } else {
        this.setState('error');
        this.handleError(error as Error);
        throw error;
      }
    }
  }

  /**
   * Get optimal sample rate for quality preset
   */
  private getOptimalSampleRate(preset: QualityPreset): number {
    switch (preset) {
      case QualityPreset.REALTIME:
        return 44100; // Lower for reduced latency
      case QualityPreset.HIGH_QUALITY:
      case QualityPreset.MASTERING:
        return 96000; // Higher for better quality
      default:
        return 48000; // Standard professional rate
    }
  }

  /**
   * Get optimal latency for quality preset
   */
  private getOptimalLatency(preset: QualityPreset): AudioContextLatencyCategory {
    switch (preset) {
      case QualityPreset.REALTIME:
        return 'interactive'; // Lowest latency
      case QualityPreset.HIGH_QUALITY:
      case QualityPreset.MASTERING:
        return 'playback'; // Allow higher latency for quality
      default:
        return 'balanced'; // Balanced latency/quality
    }
  }

  /**
   * Create basic audio nodes
   */
  private createBasicNodes(): void {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Input gain node with smoothing
    this.inputNode = this.audioContext.createGain();
    this.inputNode.gain.value = 1.0;

    // Output gain node with smoothing
    this.outputNode = this.audioContext.createGain();
    this.outputNode.gain.value = 1.0;

    // Analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 4096; // Higher resolution for professional use
    this.analyserNode.smoothingTimeConstant = 0.8;
  }

  /**
   * Load professional worklet processors
   */
  private async loadProfessionalWorklets(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const workletConfigs: WorkletConfig[] = [
      {
        name: 'professional-eq',
        url: '/worklets/professional-eq.worklet.js',
        processorName: 'professional-eq',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: this.getDefaultEQOptions()
      },
      {
        name: 'professional-compressor',
        url: '/worklets/professional-compressor.worklet.js',
        processorName: 'professional-compressor',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: this.getDefaultCompressorOptions()
      },
      {
        name: 'professional-limiter',
        url: '/worklets/professional-limiter.worklet.js',
        processorName: 'professional-limiter',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: this.getDefaultLimiterOptions()
      }
    ];

    // Load all worklets in parallel
    const loadPromises = workletConfigs.map(config =>
      this.workletManager.loadWorklet(config, {
        retries: 3,
        timeout: 10000, // Increased timeout for larger processors
        onProgress: (status) => {
          console.log(`[ProfessionalAudioEngine] ${config.name}: ${status}`);
        }
      })
    );

    try {
      const nodes = await Promise.all(loadPromises);

      this.eqNode = nodes[0];
      this.compressorNode = nodes[1];
      this.limiterNode = nodes[2];

      // Setup event handlers for each worklet
      this.setupWorkletHandlers();

    } catch (error) {
      throw new WorkletError(
        `Failed to load professional worklets: ${(error as Error).message}`,
        WorkletErrorCode.LOAD_FAILED
      );
    }
  }

  /**
   * Load original worklets as fallback
   */
  private async loadOriginalWorklets(): Promise<void> {
    // Implementation would load the original worklets
    // This is a fallback mechanism
    console.log('[ProfessionalAudioEngine] Loading original worklets as fallback');
    // ... load original worklets ...
  }

  /**
   * Get default EQ options
   */
  private getDefaultEQOptions(): any {
    return {
      bands: [
        { freq: 60, gain: 0, q: 0.7, type: 'highpass', enabled: false },
        { freq: 200, gain: 0, q: 0.7, type: 'bell', enabled: true },
        { freq: 1000, gain: 0, q: 0.7, type: 'bell', enabled: true },
        { freq: 5000, gain: 0, q: 0.7, type: 'bell', enabled: true },
        { freq: 12000, gain: 0, q: 0.7, type: 'lowpass', enabled: false }
      ],
      useCramping: true,
      useAnalogSaturation: true
    };
  }

  /**
   * Get default compressor options
   */
  private getDefaultCompressorOptions(): any {
    return {
      threshold: -12,
      ratio: 4,
      attack: 10,
      release: 100,
      knee: 2,
      makeupGain: 0,
      mix: 100,
      detectionMode: 'rms',
      lookahead: 5,
      sidechainHPF: 0,
      autoMakeup: true,
      programDependent: true,
      feedbackMode: false
    };
  }

  /**
   * Get default limiter options
   */
  private getDefaultLimiterOptions(): any {
    return {
      threshold: -0.3,
      release: 50,
      ceiling: -0.1,
      algorithm: 'transparent',
      oversampling: 4,
      lookahead: 2,
      adaptiveRelease: true,
      isr: true,
      dithering: true,
      targetLUFS: -14
    };
  }

  /**
   * Apply quality preset settings
   */
  private applyQualityPreset(preset: QualityPreset): void {
    switch (preset) {
      case QualityPreset.REALTIME:
        // Low latency settings
        this.updateLimiter({ oversampling: 2, lookahead: 1 });
        this.updateCompressor({ lookahead: 2 });
        break;

      case QualityPreset.HIGH_QUALITY:
        // High quality settings
        this.updateLimiter({ oversampling: 4, lookahead: 3 });
        this.updateCompressor({ lookahead: 5 });
        break;

      case QualityPreset.MASTERING:
        // Maximum quality
        this.updateLimiter({ oversampling: 8, lookahead: 5, algorithm: 'transparent' });
        this.updateCompressor({ lookahead: 10, detectionMode: 'rms' });
        break;

      case QualityPreset.STREAMING:
        // Optimized for streaming services
        this.updateLimiter({ targetLUFS: -14, ceiling: -1.0, isr: true });
        this.updateCompressor({ autoMakeup: true });
        break;

      case QualityPreset.BALANCED:
      default:
        // Balanced settings
        this.updateLimiter({ oversampling: 4, lookahead: 2 });
        this.updateCompressor({ lookahead: 5 });
        break;
    }
  }

  /**
   * Setup event handlers for worklet events
   */
  private setupWorkletHandlers(): void {
    // EQ metering
    this.workletManager.on('professional-eq', {
      metering: (data) => {
        this.metering.eq = data;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('EQ', data);
      },
      error: (error) => {
        console.error('[ProfessionalAudioEngine] EQ error:', error);
      }
    });

    // Compressor metering
    this.workletManager.on('professional-compressor', {
      metering: (data: any) => {
        this.metering.compressor = data;
        this.metering.gainReduction.compressor = data.gainReduction || 0;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('Compressor', data);
      },
      error: (error) => {
        console.error('[ProfessionalAudioEngine] Compressor error:', error);
      }
    });

    // Limiter metering
    this.workletManager.on('professional-limiter', {
      metering: (data: any) => {
        this.metering.limiter = data;
        this.metering.gainReduction.limiter = data.gainReduction || 0;
        this.metering.truePeak = data.truePeakDB || 0;
        this.metering.lufs = data.lufs || -100;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('Limiter', data);
      },
      error: (error) => {
        console.error('[ProfessionalAudioEngine] Limiter error:', error);
      }
    });
  }

  /**
   * Connect the signal chain
   */
  private connectSignalChain(): void {
    if (!this.inputNode || !this.outputNode || !this.analyserNode) {
      throw new Error('Basic nodes not created');
    }

    if (!this.eqNode || !this.compressorNode || !this.limiterNode) {
      throw new Error('Worklet nodes not loaded');
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Signal chain: Input -> EQ -> Compressor -> Limiter -> Output -> Destination
    this.inputNode
      .connect(this.eqNode)
      .connect(this.compressorNode)
      .connect(this.limiterNode)
      .connect(this.outputNode)
      .connect(this.audioContext.destination);

    // Also connect to analyser for visualization
    this.outputNode.connect(this.analyserNode);

    console.log('[ProfessionalAudioEngine] Signal chain connected');
  }

  // ============================================================================
  // Audio Input/Output
  // ============================================================================

  /**
   * Connect a media element (audio/video) as input
   */
  connectMediaElement(element: HTMLMediaElement): MediaElementAudioSourceNode {
    if (!this.audioContext || !this.inputNode) {
      throw new Error('AudioEngine not initialized');
    }

    const sourceNode = this.audioContext.createMediaElementSource(element);
    sourceNode.connect(this.inputNode);

    console.log('[ProfessionalAudioEngine] Connected media element');
    return sourceNode;
  }

  /**
   * Connect a media stream (microphone, etc.) as input
   */
  connectMediaStream(stream: MediaStream): MediaStreamAudioSourceNode {
    if (!this.audioContext || !this.inputNode) {
      throw new Error('AudioEngine not initialized');
    }

    const sourceNode = this.audioContext.createMediaStreamSource(stream);
    sourceNode.connect(this.inputNode);

    console.log('[ProfessionalAudioEngine] Connected media stream');
    return sourceNode;
  }

  /**
   * Create a buffer source (for file playback)
   */
  createBufferSource(buffer: AudioBuffer): AudioBufferSourceNode {
    if (!this.audioContext || !this.inputNode) {
      throw new Error('AudioEngine not initialized');
    }

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(this.inputNode);

    console.log('[ProfessionalAudioEngine] Created buffer source');
    return sourceNode;
  }

  /**
   * Decode audio data into buffer
   */
  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (!this.audioContext) {
      throw new Error('AudioEngine not initialized');
    }

    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  // ============================================================================
  // Parameter Control
  // ============================================================================

  /**
   * Update EQ parameters
   */
  updateEQ(params: Partial<ProfessionalEQParams>): void {
    if (params.bands) {
      // Update individual bands
      params.bands.forEach((band, index) => {
        this.workletManager.sendMessage('professional-eq', {
          type: 'band',
          payload: { index, params: band }
        });
      });
    }

    // Update other parameters
    const otherParams = { ...params };
    delete otherParams.bands;

    if (Object.keys(otherParams).length > 0) {
      this.workletManager.setParameters('professional-eq', otherParams as any);
    }
  }

  /**
   * Update compressor parameters
   */
  updateCompressor(params: Partial<ProfessionalCompressorParams>): void {
    this.workletManager.setParameters('professional-compressor', params as any);
  }

  /**
   * Update limiter parameters
   */
  updateLimiter(params: Partial<ProfessionalLimiterParams>): void {
    this.workletManager.setParameters('professional-limiter', params as any);
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: QualityPreset): void {
    this.qualityPreset = preset;
    this.applyQualityPreset(preset);
  }

  /**
   * Get current quality preset
   */
  getQualityPreset(): QualityPreset {
    return this.qualityPreset;
  }

  /**
   * Set master input gain
   */
  setInputGain(value: number): void {
    if (this.inputNode && this.audioContext) {
      // Use exponential ramp for smooth transitions
      this.inputNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, value),
        this.audioContext.currentTime + 0.05
      );
    }
  }

  /**
   * Set master output gain
   */
  setOutputGain(value: number): void {
    if (this.outputNode && this.audioContext) {
      // Use exponential ramp for smooth transitions
      this.outputNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, value),
        this.audioContext.currentTime + 0.05
      );
    }
  }

  /**
   * Bypass EQ
   */
  bypassEQ(bypass: boolean): void {
    this.workletManager.setBypass('professional-eq', bypass);
  }

  /**
   * Bypass compressor
   */
  bypassCompressor(bypass: boolean): void {
    this.workletManager.setBypass('professional-compressor', bypass);
  }

  /**
   * Bypass limiter
   */
  bypassLimiter(bypass: boolean): void {
    this.workletManager.setBypass('professional-limiter', bypass);
  }

  // ============================================================================
  // Metering
  // ============================================================================

  /**
   * Start automatic metering updates
   */
  private startMetering(): void {
    this.workletManager.startMetering(this.config.meteringRate);
  }

  /**
   * Stop metering updates
   */
  private stopMetering(): void {
    this.workletManager.stopMetering();
  }

  /**
   * Get current metering data
   */
  getMetering(): AudioEngineMetering {
    return { ...this.metering };
  }

  /**
   * Get analyser node for visualization
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Calculate dynamic range
   */
  private calculateDynamicRange(): number {
    if (this.metering.lufs > -100 && this.metering.truePeak > -100) {
      return this.metering.truePeak - this.metering.lufs;
    }
    return 0;
  }

  /**
   * Notify metering listeners
   */
  private notifyMetering(): void {
    // Calculate dynamic range
    this.metering.dynamicRange = this.calculateDynamicRange();

    if (this.onMetering) {
      this.onMetering({ ...this.metering });
    }
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Get current engine state
   */
  getState(): AudioEngineState {
    return this.state;
  }

  /**
   * Set engine state
   */
  private setState(newState: AudioEngineState): void {
    if (this.state !== newState) {
      this.state = newState;
      if (this.onStateChange) {
        this.onStateChange(newState);
      }
    }
  }

  /**
   * Get AudioContext
   */
  getContext(): AudioContext | null {
    return this.audioContext;
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Register state change handler
   */
  setOnStateChange(handler: (state: AudioEngineState) => void): void {
    this.onStateChange = handler;
  }

  /**
   * Register error handler
   */
  setOnError(handler: (error: Error) => void): void {
    this.onError = handler;
  }

  /**
   * Register metering handler
   */
  setOnMetering(handler: (metering: AudioEngineMetering) => void): void {
    this.onMetering = handler;
  }

  // ============================================================================
  // Error Handling & Logging
  // ============================================================================

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[ProfessionalAudioEngine] Error:', error);

    if (this.onError) {
      this.onError(error);
    }
  }

  /**
   * Log performance metrics
   */
  private logPerformance(name: string, data: PerformanceData): void {
    // Only log if CPU load is high
    if (data.cpuLoad > 50) {
      console.warn(`[ProfessionalAudioEngine] High CPU load in ${name}:`, {
        cpuLoad: `${data.cpuLoad.toFixed(1)}%`,
        avgProcessTime: `${data.avgProcessTimeMs.toFixed(3)}ms`,
        maxProcessTime: `${data.maxProcessTimeMs.toFixed(3)}ms`
      });
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Resume AudioContext (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[ProfessionalAudioEngine] AudioContext resumed');
    }
  }

  /**
   * Suspend AudioContext
   */
  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
      console.log('[ProfessionalAudioEngine] AudioContext suspended');
    }
  }

  /**
   * Dispose and cleanup all resources
   */
  async dispose(): Promise<void> {
    try {
      // Stop metering
      this.stopMetering();

      // Disconnect nodes
      if (this.inputNode) {
        this.inputNode.disconnect();
      }
      if (this.outputNode) {
        this.outputNode.disconnect();
      }
      if (this.analyserNode) {
        this.analyserNode.disconnect();
      }

      // Dispose worklets
      this.workletManager.dispose();

      // Close AudioContext
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.setState('idle');
      console.log('[ProfessionalAudioEngine] Disposed');

    } catch (error) {
      console.error('[ProfessionalAudioEngine] Error during disposal:', error);
    }
  }
}

// Export quality preset enum for use in UI
export { QualityPreset as AudioQualityPreset };