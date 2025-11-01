/**
 * AudioEngine
 *
 * Main audio processing engine for mastering application
 * Manages AudioContext, worklet chain, and signal routing
 *
 * Signal Chain:
 * Input -> EQ -> Compressor -> Limiter -> Output
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

export interface AudioEngineConfig {
  sampleRate?: number;
  latencyHint?: AudioContextLatencyCategory;
  meteringRate?: number;
}

export interface ProcessingChainState {
  eq: BaxandallEQParams;
  compressor: SSLCompressorParams;
  limiter: LimiterParams;
}

export interface AudioEngineMetering {
  input: MeteringData | null;
  eq: MeteringData | null;
  compressor: MeteringData | null;
  limiter: MeteringData | null;
  output: MeteringData | null;
}

export type AudioEngineState = 'idle' | 'loading' | 'ready' | 'processing' | 'error';

export class AudioEngine {
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
  private metering: AudioEngineMetering = {
    input: null,
    eq: null,
    compressor: null,
    limiter: null,
    output: null
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

      console.log('[AudioEngine] Initialized successfully', {
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
   * Create basic audio nodes
   */
  private createBasicNodes(): void {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Input gain node
    this.inputNode = this.audioContext.createGain();
    this.inputNode.gain.value = 1.0;

    // Output gain node
    this.outputNode = this.audioContext.createGain();
    this.outputNode.gain.value = 1.0;

    // Analyser for visualization
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;
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
          threshold: -10,
          ratio: 4,
          attack: 10,
          release: 100,
          makeupGain: 0
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
          threshold: -1.0,
          release: 100,
          ceiling: -0.3
        }
      }
    ];

    // Load all worklets in parallel
    const loadPromises = workletConfigs.map(config =>
      this.workletManager.loadWorklet(config, {
        retries: 3,
        timeout: 5000,
        onProgress: (status) => {
          console.log(`[AudioEngine] ${config.name}: ${status}`);
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
        console.error('[AudioEngine] EQ error:', error);
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
        console.error('[AudioEngine] Compressor error:', error);
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
        console.error('[AudioEngine] Limiter error:', error);
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

    console.log('[AudioEngine] Signal chain connected');
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

    console.log('[AudioEngine] Connected media element');
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

    console.log('[AudioEngine] Connected media stream');
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

    console.log('[AudioEngine] Created buffer source');
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
    console.error('[AudioEngine] Error:', error);

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
      console.warn(`[AudioEngine] High CPU load in ${name}:`, {
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
      console.log('[AudioEngine] AudioContext resumed');
    }
  }

  /**
   * Suspend AudioContext
   */
  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
      console.log('[AudioEngine] AudioContext suspended');
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
      console.log('[AudioEngine] Disposed');

    } catch (error) {
      console.error('[AudioEngine] Error during disposal:', error);
    }
  }
}
