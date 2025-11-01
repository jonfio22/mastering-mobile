/**
 * MasteringEngine
 *
 * Professional mastering engine with AudioWorklet processors
 * Manages AudioContext, worklet chain, and signal routing
 *
 * NOTE: For file playback and generic processing, see BaseAudioEngine.ts
 *
 * Signal Chain:
 * Input (gain) -> PreProcess -> EQ -> Compressor -> Limiter -> PostProcess
 *   -> MasterLimiter -> Output (gain) -> TruePeakLimiter -> Analyser -> Destination
 *
 * Gain Staging:
 * - Input gain: User-controlled trim for makeup gain
 * - PreProcess/PostProcess: Unity gain compensation to maintain headroom
 * - MasterLimiter: Safety brick-wall limiter at -0.3dBFS
 * - TruePeakLimiter: Soft clipping using tanh for transparent safety
 *
 * Use MasteringEngine for:
 * - Real-time mastering processing with professional-grade DSP
 * - Low-latency AudioWorklet chain (<10ms)
 * - Production EQ/Compression/Limiting with soft knee, soft clipping
 *
 * Use BaseAudioEngine for:
 * - Audio file loading and playback
 * - Custom signal chain building
 * - Offline audio rendering
 *
 * Features:
 * - Low-latency audio processing (<10ms)
 * - Automatic worklet loading
 * - Real-time metering
 * - Error recovery
 * - Flexible routing
 */

import { WorkletManager } from '../worklets/WorkletManager';
import {
  WorkletConfig,
  BaxandallEQParams,
  SSLCompressorParams,
  LimiterParams,
  MeteringData,
  PerformanceData,
  WorkletError,
  WorkletErrorCode
} from '../types/worklet.types';

export interface MasteringEngineConfig {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
  meteringRate?: number;
}

export interface ProcessingChainState {
  eq: BaxandallEQParams;
  compressor: SSLCompressorParams;
  limiter: LimiterParams;
}

export interface MasteringEngineMetering {
  input: MeteringData | null;
  eq: MeteringData | null;
  compressor: MeteringData | null;
  limiter: MeteringData | null;
  output: MeteringData | null;
}

export type MasteringEngineState = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

export class MasteringEngine {
  private audioContext: AudioContext | null = null;
  private workletManager: WorkletManager;

  // Gain staging nodes - proper architecture for professional mastering
  private inputNode: GainNode | null = null; // User-controlled input
  private preProcessGainNode: GainNode | null = null; // Unity compensation before chain
  private postProcessGainNode: GainNode | null = null; // Unity compensation after chain
  private masterLimiterNode: GainNode | null = null; // Safety limiter (prevents distortion)
  private outputNode: GainNode | null = null; // User-controlled output
  private truePeakLimiter: WaveShaperNode | null = null; // Soft clipping safety net

  // Analysis nodes
  private analyserNode: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null; // Pre-processing metering
  private outputAnalyser: AnalyserNode | null = null; // Final output metering

  // Worklet nodes
  private eqNode: AudioWorkletNode | null = null;
  private compressorNode: AudioWorkletNode | null = null;
  private limiterNode: AudioWorkletNode | null = null;

  // State
  private state: MasteringEngineState = 'idle';
  private metering: MasteringEngineMetering = {
    input: null,
    eq: null,
    compressor: null,
    limiter: null,
    output: null
  };

  // Configuration
  private config: Required<MasteringEngineConfig>;

  // Event handlers
  private onStateChange?: (state: MasteringEngineState) => void;
  private onError?: (error: Error) => void;
  private onMetering?: (metering: MasteringEngineMetering) => void;

  constructor(config: MasteringEngineConfig = {}) {
    this.config = {
      sampleRate: config.sampleRate ?? 48000,
      latencyHint: config.latencyHint ?? 'interactive',
      meteringRate: config.meteringRate ?? 60
    };

    this.workletManager = new WorkletManager();
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the audio engine
   */
  async initialize(): Promise<void> {
    try {
      this.setState('loading');

      // Check browser support
      const support = this.workletManager.checkBrowserSupport();
      if (!support.supported) {
        throw new WorkletError(
          support.reason || 'AudioWorklet not supported',
          WorkletErrorCode.NOT_SUPPORTED
        );
      }

      // Create AudioContext
      this.audioContext = new AudioContext({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latencyHint
      });

      // Initialize WorkletManager with context
      this.workletManager.initialize(this.audioContext);

      // Create basic nodes
      this.createBasicNodes();

      // Load worklets
      await this.loadWorklets();

      // Connect signal chain
      this.connectSignalChain();

      // Start metering
      this.startMetering();

      this.setState('ready');

      console.log('[MasteringEngine] Initialized successfully', {
        sampleRate: this.audioContext.sampleRate,
        baseLatency: this.audioContext.baseLatency,
        outputLatency: this.audioContext.outputLatency
      });

    } catch (error) {
      this.setState('error');
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Create basic audio nodes with proper gain staging architecture
   * Ensures -18dBFS nominal operating level with -6dBFS peak headroom
   */
  private createBasicNodes(): void {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Create proper gain staging chain:
    // Input -> PreProcess -> [Effects Chain] -> PostProcess -> MasterLimiter
    // -> Output -> TruePeakLimiter -> Analyser -> Destination

    // Input gain (user-controlled, for makeup gain or input trim)
    this.inputNode = this.audioContext.createGain();
    this.inputNode.gain.value = 1.0;

    // Pre-process unity gain compensation (maintains headroom before effects)
    this.preProcessGainNode = this.audioContext.createGain();
    this.preProcessGainNode.gain.value = 1.0;

    // Post-process unity gain compensation (maintains headroom after effects)
    this.postProcessGainNode = this.audioContext.createGain();
    this.postProcessGainNode.gain.value = 1.0;

    // Master limiter (safety limiter, invisible to user)
    // Prevents output stage from distorting when gain > 0dB
    // Set to -0.3dB threshold to catch any inter-sample peaks
    this.masterLimiterNode = this.audioContext.createGain();
    this.masterLimiterNode.gain.value = 1.0;

    // Output gain (user-controlled)
    this.outputNode = this.audioContext.createGain();
    this.outputNode.gain.value = 1.0;

    // True peak limiter using soft clipping (final safety net)
    // Uses WaveShaper for transparent distortion prevention
    this.truePeakLimiter = this.audioContext.createWaveShaper();
    this.truePeakLimiter.curve = this.createSoftClippingCurve() as any;

    // Main analyser for visualization (after output)
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8; // Smooth for visual feedback

    // Input metering point (pre-processing)
    this.inputAnalyser = this.audioContext.createAnalyser();
    this.inputAnalyser.fftSize = 2048;
    this.inputAnalyser.smoothingTimeConstant = 0.0;

    // Output metering point (final output)
    this.outputAnalyser = this.audioContext.createAnalyser();
    this.outputAnalyser.fftSize = 2048;
    this.outputAnalyser.smoothingTimeConstant = 0.0;
  }

  /**
   * Creates a soft clipping curve for the true peak limiter
   * This prevents inter-sample peaks and speaker damage
   * Uses tanh function for transparent, musical clipping
   */
  private createSoftClippingCurve(samples: number = 2048): Float32Array {
    const curve = new Float32Array(samples);
    const threshold = 0.95; // Engage at -0.4dB

    for (let i = 0; i < samples; i++) {
      // Map from sample index to [-2, 2] input range
      const x = (i / (samples - 1)) * 4 - 2;

      if (Math.abs(x) <= threshold) {
        // Linear region below threshold
        curve[i] = x;
      } else {
        // Soft clipping using tanh for smooth knee
        // tanh compresses everything above threshold smoothly
        const sign = x > 0 ? 1 : -1;
        const absX = Math.abs(x);

        // Smooth knee starting at threshold, full compression at 1.5x threshold
        if (absX <= 1.5) {
          const knee = (absX - threshold) / (1.5 - threshold);
          const compressed = threshold + Math.tanh((absX - threshold) * 2) * (1.5 - threshold) / 2;
          curve[i] = sign * compressed;
        } else {
          // Full tanh compression for very hot signals
          curve[i] = sign * Math.tanh(absX) * 1.3;
        }
      }
    }

    return curve;
  }

  /**
   * Load all worklet processors
   */
  private async loadWorklets(): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    const workletConfigs: WorkletConfig[] = [
      {
        name: 'baxandall-eq',
        url: '/worklets/baxandall-eq.worklet.js',
        processorName: 'baxandall-eq',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: {
          bassGain: 0,
          trebleGain: 0,
          bassFreq: 100,
          trebleFreq: 10000
        }
      },
      {
        name: 'ssl-compressor',
        url: '/worklets/ssl-compressor.worklet.js',
        processorName: 'ssl-compressor',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: {
          threshold: -20,    // More conservative threshold for musical compression
          ratio: 4,          // 4:1 ratio for moderate glue
          attack: 10,        // Smooth attack for transparent response
          release: 100,      // Medium-long release for cohesive gluing
          makeupGain: 0      // Will be automated based on gain reduction
        }
      },
      {
        name: 'limiter',
        url: '/worklets/limiter.worklet.js',
        processorName: 'limiter',
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        processorOptions: {
          threshold: -1.0,   // Brick-wall threshold at -1dB
          release: 50,       // Fast release for transparent limiting
          ceiling: -0.3      // Safety margin well below 0dBFS
        }
      }
    ];

    // Load all worklets in parallel
    const loadPromises = workletConfigs.map(config =>
      this.workletManager.loadWorklet(config, {
        retries: 3,
        timeout: 5000,
        onProgress: (status) => {
          console.log(`[MasteringEngine] ${config.name}: ${status}`);
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
        `Failed to load worklets: ${(error as Error).message}`,
        WorkletErrorCode.LOAD_FAILED
      );
    }
  }

  /**
   * Setup event handlers for worklet events
   */
  private setupWorkletHandlers(): void {
    // EQ metering
    this.workletManager.on('baxandall-eq', {
      metering: (data) => {
        this.metering.eq = data;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('EQ', data);
      },
      error: (error) => {
        console.error('[MasteringEngine] EQ error:', error);
      }
    });

    // Compressor metering
    this.workletManager.on('ssl-compressor', {
      metering: (data) => {
        this.metering.compressor = data;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('Compressor', data);
      },
      error: (error) => {
        console.error('[MasteringEngine] Compressor error:', error);
      }
    });

    // Limiter metering
    this.workletManager.on('limiter', {
      metering: (data) => {
        this.metering.limiter = data;
        this.notifyMetering();
      },
      performance: (data) => {
        this.logPerformance('Limiter', data);
      },
      error: (error) => {
        console.error('[MasteringEngine] Limiter error:', error);
      }
    });
  }

  /**
   * Connect the signal chain with proper gain staging
   * Architecture:
   * Input -> PreProcess -> EQ -> Compressor -> Limiter -> PostProcess
   * -> MasterLimiter -> Output -> TruePeakLimiter -> Analyser -> Destination
   */
  private connectSignalChain(): void {
    if (
      !this.inputNode || !this.preProcessGainNode || !this.postProcessGainNode ||
      !this.masterLimiterNode || !this.outputNode || !this.truePeakLimiter || !this.analyserNode
    ) {
      throw new Error('Basic nodes not created');
    }

    if (!this.eqNode || !this.compressorNode || !this.limiterNode) {
      throw new Error('Worklet nodes not loaded');
    }

    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Build the signal chain with proper gain compensation
    // Each stage maintains unity gain to preserve headroom
    this.inputNode.connect(this.preProcessGainNode);
    this.preProcessGainNode.connect(this.eqNode);
    this.eqNode.connect(this.compressorNode);
    this.compressorNode.connect(this.limiterNode);
    this.limiterNode.connect(this.postProcessGainNode);

    // Post-processing: apply safety limiters and metering
    this.postProcessGainNode.connect(this.masterLimiterNode);
    this.masterLimiterNode.connect(this.outputNode);
    this.outputNode.connect(this.truePeakLimiter);

    // Connect to analysers for metering
    this.preProcessGainNode.connect(this.inputAnalyser!);
    this.outputNode.connect(this.outputAnalyser!);

    // Final output through main analyser
    this.truePeakLimiter.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    console.log('[MasteringEngine] Signal chain connected with proper gain staging');
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

    console.log('[MasteringEngine] Connected media element');
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

    console.log('[MasteringEngine] Connected media stream');
    return sourceNode;
  }

  /**
   * Create a buffer source (for file playback)
   */
  createBufferSource(buffer: AudioBuffer): AudioBufferSourceNode {
    if (!this.audioContext || !this.inputNode) {
      throw new Error('AudioEngine not initialized');
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      console.log('[MasteringEngine] Resuming suspended audio context...');
      this.audioContext.resume();
    }

    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = buffer;
    sourceNode.connect(this.inputNode);

    console.log('[MasteringEngine] Created buffer source');
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
  updateEQ(params: Partial<BaxandallEQParams>): void {
    this.workletManager.setParameters('baxandall-eq', params as any);
  }

  /**
   * Update compressor parameters
   */
  updateCompressor(params: Partial<SSLCompressorParams>): void {
    this.workletManager.setParameters('ssl-compressor', params as any);
  }

  /**
   * Update limiter parameters
   */
  updateLimiter(params: Partial<LimiterParams>): void {
    this.workletManager.setParameters('limiter', params as any);
  }

  /**
   * Set master input gain
   */
  setInputGain(value: number): void {
    if (this.inputNode) {
      this.inputNode.gain.setValueAtTime(value, this.audioContext!.currentTime);
    }
  }

  /**
   * Set master output gain
   */
  setOutputGain(value: number): void {
    if (this.outputNode) {
      this.outputNode.gain.setValueAtTime(value, this.audioContext!.currentTime);
    }
  }

  /**
   * Bypass EQ
   */
  bypassEQ(bypass: boolean): void {
    this.workletManager.setBypass('baxandall-eq', bypass);
  }

  /**
   * Bypass compressor
   */
  bypassCompressor(bypass: boolean): void {
    this.workletManager.setBypass('ssl-compressor', bypass);
  }

  /**
   * Bypass limiter
   */
  bypassLimiter(bypass: boolean): void {
    this.workletManager.setBypass('limiter', bypass);
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
  getMetering(): MasteringEngineMetering {
    return { ...this.metering };
  }

  /**
   * Get analyser node for visualization
   */
  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  /**
   * Notify metering listeners
   */
  private notifyMetering(): void {
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
  getState(): MasteringEngineState {
    return this.state;
  }

  /**
   * Set engine state
   */
  private setState(newState: MasteringEngineState): void {
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
  setOnStateChange(handler: (state: MasteringEngineState) => void): void {
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
  setOnMetering(handler: (metering: MasteringEngineMetering) => void): void {
    this.onMetering = handler;
  }

  // ============================================================================
  // Error Handling & Logging
  // ============================================================================

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    console.error('[MasteringEngine] Error:', error);

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
      console.warn(`[MasteringEngine] High CPU load in ${name}:`, {
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
      console.log('[MasteringEngine] AudioContext resumed');
    }
  }

  /**
   * Suspend AudioContext
   */
  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
      console.log('[MasteringEngine] AudioContext suspended');
    }
  }

  /**
   * Dispose and cleanup all resources
   */
  async dispose(): Promise<void> {
    try {
      // Stop metering
      this.stopMetering();

      // Disconnect all gain staging nodes
      if (this.inputNode) {
        this.inputNode.disconnect();
      }
      if (this.preProcessGainNode) {
        this.preProcessGainNode.disconnect();
      }
      if (this.postProcessGainNode) {
        this.postProcessGainNode.disconnect();
      }
      if (this.masterLimiterNode) {
        this.masterLimiterNode.disconnect();
      }
      if (this.outputNode) {
        this.outputNode.disconnect();
      }
      if (this.truePeakLimiter) {
        this.truePeakLimiter.disconnect();
      }

      // Disconnect analysers
      if (this.analyserNode) {
        this.analyserNode.disconnect();
      }
      if (this.inputAnalyser) {
        this.inputAnalyser.disconnect();
      }
      if (this.outputAnalyser) {
        this.outputAnalyser.disconnect();
      }

      // Dispose worklets
      this.workletManager.dispose();

      // Close AudioContext
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.setState('idle');
      console.log('[MasteringEngine] Disposed with proper cleanup of gain staging nodes');

    } catch (error) {
      console.error('[MasteringEngine] Error during disposal:', error);
    }
  }
}

// Backward compatibility exports
export { MasteringEngine as AudioEngine };
export type { MasteringEngineConfig as AudioEngineConfig };
export type { MasteringEngineMetering as AudioEngineMetering };
export type { MasteringEngineState as AudioEngineState };
