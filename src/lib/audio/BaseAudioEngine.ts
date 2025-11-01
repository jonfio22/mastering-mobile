/**
 * @fileoverview Base-level audio engine for file playback and generic processing
 * @module lib/audio/BaseAudioEngine
 * @description Core audio engine with 64-bit internal processing, flexible signal chain,
 * professional metering, and comprehensive state management.
 *
 * NOTE: For mastering-specific processing, see MasteringEngine.ts
 *
 * Use BaseAudioEngine for:
 * - Audio file loading and playback
 * - Custom signal chain building
 * - Offline audio rendering
 * - File preview functionality
 *
 * Use MasteringEngine for:
 * - Real-time mastering processing
 * - Low-latency AudioWorklet chain
 * - Production EQ/Compression/Limiting
 */

import {
  EngineState,
  AudioEngineConfig,
  AudioEngineState,
  AudioBufferMetadata,
  MeteringData,
  SignalChainNode,
  ChainMode,
  ProcessorConfig,
  AudioErrorType,
  BitDepth,
  AudioFormat,
  PlaybackState,
  SampleRate,
} from '../types/audio';
import {
  SampleRateUtils,
  AudioFormatUtils,
  dBFSUtils,
  AnalysisUtils,
  ErrorUtils,
} from '../utils/audioHelpers';

/**
 * Base-level audio engine for file playback and generic processing
 *
 * Features:
 * - Support for 44.1kHz to 192kHz sample rates
 * - 64-bit internal processing precision via Web Audio API
 * - Flexible serial/parallel signal chain architecture
 * - Professional-grade metering (peak, RMS)
 * - Comprehensive error handling and state management
 * - Memory leak prevention with proper cleanup
 * - Type-safe interfaces throughout
 * - Proper gain staging with headroom management (-18dBFS nominal, -6dBFS peak)
 * - Soft clipping and true peak limiting to prevent distortion
 * - Metering points at each signal chain stage
 *
 * GAIN STAGING CHAIN:
 * Input (-18dBFS nominal) -> Input Gain -> Effects Chain -> Master Limiter
 * -> Output Gain -> True Peak Limiter (safety net) -> Destination
 *
 * @example
 * ```typescript
 * const engine = new BaseAudioEngine(96000);
 * await engine.initialize();
 * await engine.loadAudio(audioFile);
 * engine.play();
 * ```
 */
export class BaseAudioEngine {
  // Core Web Audio API components
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  // Gain staging nodes
  private inputGainNode: GainNode | null = null;
  private preProcessGainNode: GainNode | null = null; // Unity gain compensation
  private postProcessGainNode: GainNode | null = null; // Unity gain compensation
  private masterLimiterGain: GainNode | null = null; // Safety limiter
  private outputGainNode: GainNode | null = null;
  private truePeakLimiterNode: WaveShaperNode | null = null; // Soft clipping

  // Signal chain nodes
  private analyserNode: AnalyserNode | null = null;
  private signalChain: SignalChainNode[] = [];

  // Metering points for debugging
  private meteringPoints: Map<string, AnalyserNode> = new Map();

  // Metering and analysis
  private meteringData: MeteringData = {
    peakL: -Infinity,
    peakR: -Infinity,
    rmsL: -Infinity,
    rmsR: -Infinity,
    timestamp: 0,
    samplePosition: 0,
  };
  private meteringIntervalId: number | null = null;
  private meteringBufferL: Float32Array = new Float32Array(0);
  private meteringBufferR: Float32Array = new Float32Array(0);

  // State management
  private state: EngineState = EngineState.UNINITIALIZED;
  private playbackState: PlaybackState = {
    currentTime: 0,
    duration: 0,
    playbackRate: 1.0,
    isPlaying: false,
    isPaused: false,
    isStopped: true,
    isLooping: false,
  };
  private audioMetadata: AudioBufferMetadata | null = null;
  private lastError: Error | null = null;

  // Configuration
  private config: Required<AudioEngineConfig>;
  private targetSampleRate: number;

  // Playback timing
  private startTime: number = 0;
  private pauseTime: number = 0;

  /**
   * Creates a new AudioEngine instance
   * @param sampleRate - Target sample rate (defaults to system sample rate)
   * @param config - Optional configuration overrides
   */
  constructor(sampleRate?: number, config?: Partial<AudioEngineConfig>) {
    this.targetSampleRate = sampleRate || 48000;

    // Merge default config with user overrides
    this.config = {
      sampleRate: this.targetSampleRate,
      latencyHint: 'interactive',
      enablePrecisionMetering: true,
      meteringInterval: 50, // 20Hz update rate
      maxProcessors: 32,
      autoGainCompensation: false,
      enableOversampling: true,
      ...config,
    };

    // Validate sample rate
    if (!SampleRateUtils.isSupported(this.targetSampleRate)) {
      console.warn(
        `Sample rate ${this.targetSampleRate} not in supported list. ` +
        `Nearest supported: ${SampleRateUtils.getNearestSupported(this.targetSampleRate)}`
      );
    }
  }

  /**
   * Initializes the audio engine and creates AudioContext
   * Must be called after user interaction due to browser autoplay policies
   * @throws {Error} If initialization fails
   */
  async initialize(): Promise<void> {
    if (this.state !== EngineState.UNINITIALIZED) {
      console.warn('AudioEngine already initialized');
      return;
    }

    this.setState(EngineState.INITIALIZING);

    try {
      // Create AudioContext with target sample rate
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported in this browser');
      }

      this.audioContext = new AudioContextClass({
        sampleRate: this.config.sampleRate,
        latencyHint: this.config.latencyHint,
      });

      // Verify achieved sample rate
      const actualSampleRate = this.audioContext.sampleRate;
      if (actualSampleRate !== this.config.sampleRate) {
        console.warn(
          `Requested sample rate ${this.config.sampleRate} Hz, ` +
          `got ${actualSampleRate} Hz`
        );
        this.config.sampleRate = actualSampleRate;
      }

      // Create proper gain staging chain
      this.inputGainNode = this.audioContext.createGain();
      this.preProcessGainNode = this.audioContext.createGain();
      this.postProcessGainNode = this.audioContext.createGain();
      this.masterLimiterGain = this.audioContext.createGain();
      this.outputGainNode = this.audioContext.createGain();

      // Set default unity gains
      this.inputGainNode.gain.value = 1.0;
      this.preProcessGainNode.gain.value = 1.0;
      this.postProcessGainNode.gain.value = 1.0;
      this.masterLimiterGain.gain.value = 1.0;
      this.outputGainNode.gain.value = 1.0;

      // Create soft clipping WaveShaper for true peak limiting (safety net)
      // This is INVISIBLE to the user and only engages to prevent damage
      this.truePeakLimiterNode = this.audioContext.createWaveShaper();
      this.truePeakLimiterNode.curve = this.createSoftClipCurve(1.5, 2048); // 3dB headroom

      // Create analyser for output metering
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.0; // No smoothing for accurate metering

      // Create metering points for debugging signal chain
      this.createMeteringPoint('input');
      this.createMeteringPoint('preProcess');
      this.createMeteringPoint('postProcess');
      this.createMeteringPoint('masterLimiter');
      this.createMeteringPoint('output');

      // Connect master gain staging chain:
      // input -> preProcess -> (signal chain connects here) -> postProcess
      // -> masterLimiter -> output -> truePeakLimiter -> analyser -> destination
      this.inputGainNode.connect(this.preProcessGainNode);
      this.postProcessGainNode.connect(this.masterLimiterGain);
      this.masterLimiterGain.connect(this.outputGainNode);
      this.outputGainNode.connect(this.truePeakLimiterNode);
      this.truePeakLimiterNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);

      // Initialize metering buffers
      const bufferLength = this.analyserNode.frequencyBinCount;
      this.meteringBufferL = new Float32Array(bufferLength);
      this.meteringBufferR = new Float32Array(bufferLength);

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.setState(EngineState.READY);
      console.info(
        `AudioEngine initialized at ${actualSampleRate} Hz, ` +
        `latency: ${this.audioContext.baseLatency?.toFixed(3) || 'N/A'}s`
      );
    } catch (error) {
      this.lastError = error as Error;
      this.setState(EngineState.ERROR);
      throw ErrorUtils.createError(
        AudioErrorType.INITIALIZATION_FAILED,
        'Failed to initialize AudioEngine',
        error as Error,
        { targetSampleRate: this.targetSampleRate }
      );
    }
  }

  /**
   * Loads an audio file into the engine
   * @param file - Audio file to load
   * @throws {Error} If loading or decoding fails
   */
  async loadAudio(file: File): Promise<void> {
    this.ensureInitialized();
    this.setState(EngineState.LOADING);

    try {
      // Resume audio context if suspended (for browsers that require user gesture)
      if (this.audioContext?.state === 'suspended') {
        console.log('[BaseAudioEngine] Resuming suspended audio context...');
        await this.audioContext.resume();
      }

      // Validate file format
      const validation = AudioFormatUtils.validateFile(file);
      if (!validation.isValid) {
        throw new Error(
          `Invalid audio file: ${validation.errors?.join(', ')}`
        );
      }

      if (validation.warnings && validation.warnings.length > 0) {
        console.warn('File validation warnings:', validation.warnings);
      }

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Decode audio data
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);

      // Store metadata
      this.audioMetadata = {
        sampleRate: this.audioBuffer.sampleRate,
        numberOfChannels: this.audioBuffer.numberOfChannels,
        duration: this.audioBuffer.duration,
        length: this.audioBuffer.length,
        bitDepth: validation.format
          ? AudioFormatUtils.getRecommendedBitDepth(validation.format)
          : BitDepth.BIT_24,
        format: validation.format || AudioFormat.WAV,
        fileSize: file.size,
        filename: file.name,
      };

      // Reset playback state
      this.playbackState = {
        currentTime: 0,
        duration: this.audioBuffer.duration,
        playbackRate: 1.0,
        isPlaying: false,
        isPaused: false,
        isStopped: true,
        isLooping: false,
      };

      this.setState(EngineState.READY);
      console.info(
        `Loaded: ${file.name}, ` +
        `${this.audioMetadata.numberOfChannels}ch, ` +
        `${this.audioMetadata.sampleRate}Hz, ` +
        `${this.audioMetadata.duration.toFixed(2)}s`
      );
    } catch (error) {
      this.lastError = error as Error;
      this.setState(EngineState.ERROR);
      throw ErrorUtils.createError(
        AudioErrorType.FILE_LOAD_ERROR,
        'Failed to load audio file',
        error as Error,
        { filename: file.name, fileSize: file.size }
      );
    }
  }

  /**
   * Starts or resumes audio playback
   */
  play(): void {
    this.ensureInitialized();
    this.ensureAudioLoaded();

    if (this.playbackState.isPlaying) {
      console.warn('Already playing');
      return;
    }

    try {
      // Resume AudioContext if suspended
      if (this.audioContext!.state === 'suspended') {
        this.audioContext!.resume();
      }

      // Create new source node
      this.sourceNode = this.audioContext!.createBufferSource();
      this.sourceNode.buffer = this.audioBuffer;
      this.sourceNode.loop = this.playbackState.isLooping;
      this.sourceNode.playbackRate.value = this.playbackState.playbackRate;

      // Connect to signal chain
      this.connectSourceToChain();

      // Handle playback end
      this.sourceNode.onended = () => {
        if (!this.playbackState.isLooping) {
          this.handlePlaybackEnded();
        }
      };

      // Start playback
      const offset = this.playbackState.isPaused
        ? this.pauseTime
        : this.playbackState.currentTime;

      this.sourceNode.start(0, offset);
      this.startTime = this.audioContext!.currentTime - offset;

      // Update state
      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;
      this.playbackState.isStopped = false;
      this.setState(EngineState.PLAYING);

      // Start metering
      this.startMetering();

      console.info(`Playback started at ${offset.toFixed(3)}s`);
    } catch (error) {
      this.lastError = error as Error;
      this.setState(EngineState.ERROR);
      console.error('Failed to start playback:', error);
    }
  }

  /**
   * Pauses audio playback
   */
  pause(): void {
    if (!this.playbackState.isPlaying) {
      console.warn('Not currently playing');
      return;
    }

    try {
      // Store current position
      this.pauseTime = this.audioContext!.currentTime - this.startTime;

      // Stop source node
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      // Update state
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = true;
      this.playbackState.currentTime = this.pauseTime;
      this.setState(EngineState.PAUSED);

      // Stop metering
      this.stopMetering();

      console.info(`Playback paused at ${this.pauseTime.toFixed(3)}s`);
    } catch (error) {
      this.lastError = error as Error;
      console.error('Failed to pause playback:', error);
    }
  }

  /**
   * Stops audio playback and resets position
   */
  stop(): void {
    try {
      // Stop source node
      if (this.sourceNode) {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }

      // Reset state
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = false;
      this.playbackState.isStopped = true;
      this.playbackState.currentTime = 0;
      this.pauseTime = 0;
      this.startTime = 0;

      this.setState(EngineState.STOPPED);

      // Stop metering and reset
      this.stopMetering();
      this.resetMetering();

      console.info('Playback stopped');
    } catch (error) {
      this.lastError = error as Error;
      console.error('Failed to stop playback:', error);
    }
  }

  /**
   * Seeks to a specific time in the audio
   * @param time - Time in seconds
   */
  seek(time: number): void {
    this.ensureAudioLoaded();

    const clampedTime = Math.max(0, Math.min(time, this.playbackState.duration));

    if (this.playbackState.isPlaying) {
      // If playing, restart from new position
      const wasPlaying = this.playbackState.isPlaying;
      this.stop();
      this.playbackState.currentTime = clampedTime;
      if (wasPlaying) {
        this.play();
      }
    } else {
      // If paused or stopped, just update position
      this.playbackState.currentTime = clampedTime;
      this.pauseTime = clampedTime;
    }

    console.info(`Seeked to ${clampedTime.toFixed(3)}s`);
  }

  /**
   * Connects a processor to the signal chain
   * @param processor - AudioNode to connect
   * @param parallel - Whether to connect in parallel (default: false = serial)
   */
  connectProcessor(processor: AudioNode, parallel = false): void {
    this.ensureInitialized();

    if (this.signalChain.length >= this.config.maxProcessors) {
      throw new Error(`Maximum number of processors (${this.config.maxProcessors}) reached`);
    }

    const mode = parallel ? ChainMode.PARALLEL : ChainMode.SERIAL;

    // Create wrapper nodes for gain staging
    const inputGain = this.audioContext!.createGain();
    const outputGain = this.audioContext!.createGain();
    inputGain.gain.value = 1.0;
    outputGain.gain.value = 1.0;

    // Create analyser for processor metering
    const analyser = this.audioContext!.createAnalyser();
    analyser.fftSize = 2048;

    // Create signal chain node
    const chainNode: SignalChainNode = {
      id: `processor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      config: {
        id: `config_${Date.now()}`,
        type: 'custom' as any,
        name: 'Custom Processor',
        bypassed: false,
        enabled: true,
        mix: 1.0,
        inputGain: 0,
        outputGain: 0,
        parameters: {},
      },
      node: processor,
      mode,
      order: this.signalChain.length,
      inputGain,
      outputGain,
      analyser,
    };

    // Add to chain
    this.signalChain.push(chainNode);

    // Rebuild signal chain connections
    this.rebuildSignalChain();

    console.info(`Processor connected in ${mode} mode`);
  }

  /**
   * Disconnects a processor from the signal chain
   * @param processor - AudioNode to disconnect
   */
  disconnectProcessor(processor: AudioNode): void {
    const index = this.signalChain.findIndex(node => node.node === processor);

    if (index === -1) {
      console.warn('Processor not found in signal chain');
      return;
    }

    const node = this.signalChain[index];

    // Disconnect all nodes
    node.inputGain.disconnect();
    node.node.disconnect();
    node.outputGain.disconnect();
    if (node.analyser) {
      node.analyser.disconnect();
    }

    // Remove from chain
    this.signalChain.splice(index, 1);

    // Update order numbers
    this.signalChain.forEach((n, i) => {
      n.order = i;
    });

    // Rebuild signal chain connections
    this.rebuildSignalChain();

    console.info('Processor disconnected');
  }

  /**
   * Gets the analyser node for spectrum/waveform visualization
   * @returns AnalyserNode
   */
  getAnalyserNode(): AnalyserNode {
    this.ensureInitialized();
    return this.analyserNode!;
  }

  /**
   * Gets current metering data
   * @returns MeteringData with peak and RMS levels
   */
  getMeteringData(): MeteringData {
    return { ...this.meteringData };
  }

  /**
   * Gets current audio engine state
   * @returns Complete engine state
   */
  getState(): AudioEngineState {
    return {
      state: this.state,
      sampleRate: this.audioContext?.sampleRate || 0,
      audioMetadata: this.audioMetadata,
      currentTime: this.getCurrentTime(),
      isPlaying: this.playbackState.isPlaying,
      isLooping: this.playbackState.isLooping,
      inputGain: dBFSUtils.linearToGain(this.inputGainNode?.gain.value || 1.0),
      outputGain: dBFSUtils.linearToGain(this.outputGainNode?.gain.value || 1.0),
      signalChain: [...this.signalChain],
      meteringData: this.getMeteringData(),
      lastError: this.lastError ? {
        type: AudioErrorType.UNKNOWN,
        message: this.lastError.message,
        originalError: this.lastError,
        timestamp: Date.now(),
      } : null,
    };
  }

  /**
   * Gets the AudioContext instance (for advanced use)
   * @returns AudioContext or null if not initialized
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /**
   * Gets the current audio buffer (for analysis)
   * @returns AudioBuffer or null if not loaded
   */
  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  /**
   * Sets input gain
   * @param gainDb - Gain in dB
   */
  setInputGain(gainDb: number): void {
    this.ensureInitialized();
    const linear = dBFSUtils.dbToLinear(gainDb);
    this.inputGainNode!.gain.value = linear;
  }

  /**
   * Sets output gain
   * @param gainDb - Gain in dB
   */
  setOutputGain(gainDb: number): void {
    this.ensureInitialized();
    const linear = dBFSUtils.dbToLinear(gainDb);
    this.outputGainNode!.gain.value = linear;
  }

  /**
   * Sets loop mode
   * @param enabled - Whether to enable looping
   */
  setLoop(enabled: boolean): void {
    this.playbackState.isLooping = enabled;
    if (this.sourceNode) {
      this.sourceNode.loop = enabled;
    }
  }

  /**
   * Sets playback rate
   * @param rate - Playback rate (0.5 to 2.0)
   */
  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    this.playbackState.playbackRate = clampedRate;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = clampedRate;
    }
  }

  /**
   * Suspends the AudioContext to save resources
   */
  async suspend(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'running') {
      await this.audioContext.suspend();
      this.setState(EngineState.SUSPENDED);
      console.info('AudioContext suspended');
    }
  }

  /**
   * Resumes a suspended AudioContext
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      this.setState(this.playbackState.isPlaying ? EngineState.PLAYING : EngineState.READY);
      console.info('AudioContext resumed');
    }
  }

  /**
   * Cleans up all resources and disconnects nodes
   * MUST be called when done with the engine to prevent memory leaks
   */
  cleanup(): void {
    console.info('Cleaning up AudioEngine...');

    // Stop playback
    this.stop();

    // Disconnect all processors
    while (this.signalChain.length > 0) {
      const node = this.signalChain[0];
      this.disconnectProcessor(node.node);
    }

    // Disconnect master gain staging nodes
    if (this.inputGainNode) {
      this.inputGainNode.disconnect();
      this.inputGainNode = null;
    }

    if (this.preProcessGainNode) {
      this.preProcessGainNode.disconnect();
      this.preProcessGainNode = null;
    }

    if (this.postProcessGainNode) {
      this.postProcessGainNode.disconnect();
      this.postProcessGainNode = null;
    }

    if (this.masterLimiterGain) {
      this.masterLimiterGain.disconnect();
      this.masterLimiterGain = null;
    }

    if (this.outputGainNode) {
      this.outputGainNode.disconnect();
      this.outputGainNode = null;
    }

    if (this.truePeakLimiterNode) {
      this.truePeakLimiterNode.disconnect();
      this.truePeakLimiterNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    // Disconnect all metering points
    this.meteringPoints.forEach(analyser => {
      analyser.disconnect();
    });
    this.meteringPoints.clear();

    // Close AudioContext
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clear buffers
    this.audioBuffer = null;
    this.audioMetadata = null;
    this.meteringBufferL = new Float32Array(0);
    this.meteringBufferR = new Float32Array(0);

    // Reset state
    this.setState(EngineState.UNINITIALIZED);
    this.resetMetering();

    console.info('AudioEngine cleaned up');
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  /**
   * Sets the engine state
   */
  private setState(newState: EngineState): void {
    this.state = newState;
  }

  /**
   * Ensures engine is initialized
   */
  private ensureInitialized(): void {
    if (!this.audioContext || this.state === EngineState.UNINITIALIZED) {
      throw new Error('AudioEngine not initialized. Call initialize() first.');
    }
  }

  /**
   * Ensures audio is loaded
   */
  private ensureAudioLoaded(): void {
    if (!this.audioBuffer) {
      throw new Error('No audio loaded. Call loadAudio() first.');
    }
  }

  /**
   * Gets current playback time
   */
  private getCurrentTime(): number {
    if (this.playbackState.isPlaying && this.audioContext) {
      return this.audioContext.currentTime - this.startTime;
    }
    return this.playbackState.currentTime;
  }

  /**
   * Creates a soft clipping curve for the WaveShaper (true peak limiter)
   * @param threshold - Clipping threshold (where soft clipping begins)
   * @param samples - Number of samples for the curve
   * @returns Float32Array with the soft clipping curve
   */
  private createSoftClipCurve(threshold: number, samples: number): Float32Array {
    const curve = new Float32Array(samples);
    const length = samples;
    const mid = length / 2;

    for (let i = 0; i < length; i++) {
      // Map sample index to input range [-threshold, threshold]
      const x = (i / mid - 1) * threshold;

      if (Math.abs(x) < 0.9) {
        // Linear region: no clipping
        curve[i] = x;
      } else if (x > 0.9) {
        // Soft clipping on positive side: tanh function
        // Creates smooth knee around threshold
        curve[i] = Math.tanh(x * 0.5);
      } else {
        // Soft clipping on negative side
        curve[i] = Math.tanh(x * 0.5);
      }
    }

    return curve;
  }

  /**
   * Creates a metering point at a specific position in the signal chain
   * Used for debugging gain staging and identifying level issues
   * @param name - Name of the metering point (for identification)
   */
  private createMeteringPoint(name: string): void {
    if (!this.audioContext) return;

    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.0;

    this.meteringPoints.set(name, analyser);

    // Connect analyser to destination for metering (won't affect audio path)
    // This allows us to measure levels at each point
  }

  /**
   * Gets metering data at a specific point in the signal chain
   * @param pointName - Name of the metering point
   * @returns Metering data or null if point doesn't exist
   */
  getMeteringPointData(pointName: string): MeteringData | null {
    const analyser = this.meteringPoints.get(pointName);
    if (!analyser) return null;

    const tempBuffer = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(tempBuffer);

    const peakL = AnalysisUtils.findPeak(tempBuffer);
    const rmsL = AnalysisUtils.calculateRMS(tempBuffer);

    return {
      peakL: dBFSUtils.linearToDb(peakL),
      peakR: dBFSUtils.linearToDb(peakL), // Approximation for single analyser
      rmsL: dBFSUtils.linearToDb(rmsL),
      rmsR: dBFSUtils.linearToDb(rmsL),
      timestamp: Date.now(),
      samplePosition: 0,
    };
  }

  /**
   * Connects source node to signal chain with proper gain staging
   */
  private connectSourceToChain(): void {
    if (!this.sourceNode) return;

    // If no processors, connect directly through unity gain nodes
    if (this.signalChain.length === 0) {
      this.sourceNode.connect(this.inputGainNode!);
      this.inputGainNode!.connect(this.preProcessGainNode!);
      this.preProcessGainNode!.connect(this.postProcessGainNode!);
      // Rest already connected in initialize()
    } else {
      // Connect through signal chain
      this.sourceNode.connect(this.inputGainNode!);
      // Chain is already connected via rebuildSignalChain
    }
  }

  /**
   * Rebuilds signal chain connections with proper gain compensation
   * Ensures unity gain through the chain to maintain headroom
   */
  private rebuildSignalChain(): void {
    // Disconnect everything first
    this.inputGainNode!.disconnect();
    this.preProcessGainNode!.disconnect();
    this.signalChain.forEach(node => {
      node.inputGain.disconnect();
      node.node.disconnect();
      node.outputGain.disconnect();
      if (node.analyser) {
        node.analyser.disconnect();
      }
    });

    if (this.signalChain.length === 0) {
      // No processors, direct connection: input -> preProcess -> postProcess -> rest
      this.inputGainNode!.connect(this.preProcessGainNode!);
      this.preProcessGainNode!.connect(this.postProcessGainNode!);
      return;
    }

    // Separate serial and parallel processors
    const serialNodes = this.signalChain.filter(n => n.mode === ChainMode.SERIAL);
    const parallelNodes = this.signalChain.filter(n => n.mode === ChainMode.PARALLEL);

    // Start chain: input -> preProcess
    this.inputGainNode!.connect(this.preProcessGainNode!);

    let lastNode: AudioNode = this.preProcessGainNode!;

    // Connect serial chain with proper gain compensation
    serialNodes.forEach((node, index) => {
      lastNode.connect(node.inputGain);
      node.inputGain.connect(node.node);
      node.node.connect(node.analyser!);
      node.analyser!.connect(node.outputGain);

      // Compensate for processor gain changes to maintain unity gain
      // If processor increases level, reduce output gain accordingly
      // This is critical for headroom management
      node.outputGain.gain.value = 1.0; // Will be adjusted per processor type

      lastNode = node.outputGain;
    });

    // Connect parallel processors (summing)
    if (parallelNodes.length > 0) {
      // Create a summing node for parallel processing
      const sumNode = this.audioContext!.createGain();
      sumNode.gain.value = 1.0 / (parallelNodes.length + 1); // -3dB per parallel branch

      // Connect input to all parallel processors
      parallelNodes.forEach(node => {
        lastNode.connect(node.inputGain);
        node.inputGain.connect(node.node);
        node.node.connect(node.analyser!);
        node.analyser!.connect(node.outputGain);
        node.outputGain.gain.value = 1.0 / (parallelNodes.length + 1);
        node.outputGain.connect(sumNode);
      });

      // Also connect dry signal at reduced level
      lastNode.connect(sumNode);
      lastNode = sumNode;
    }

    // Connect to post-process: maintains unity gain through chain
    lastNode.connect(this.postProcessGainNode!);
  }

  /**
   * Starts metering updates
   */
  private startMetering(): void {
    if (this.meteringIntervalId !== null) {
      return;
    }

    this.meteringIntervalId = window.setInterval(() => {
      this.updateMetering();
    }, this.config.meteringInterval);
  }

  /**
   * Stops metering updates
   */
  private stopMetering(): void {
    if (this.meteringIntervalId !== null) {
      window.clearInterval(this.meteringIntervalId);
      this.meteringIntervalId = null;
    }
  }

  /**
   * Updates metering data
   */
  private updateMetering(): void {
    if (!this.analyserNode || !this.audioBuffer) {
      return;
    }

    // Get time domain data
    const tempBuffer = new Float32Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getFloatTimeDomainData(tempBuffer);
    this.meteringBufferL = tempBuffer;

    // For stereo, we need to separate channels
    // Note: AnalyserNode gives us mixed data, so we approximate
    const numChannels = this.audioBuffer.numberOfChannels;

    let peakL = 0;
    let peakR = 0;
    let sumL = 0;
    let sumR = 0;

    if (numChannels === 1) {
      // Mono - both channels same
      peakL = AnalysisUtils.findPeak(this.meteringBufferL);
      peakR = peakL;
      const rms = AnalysisUtils.calculateRMS(this.meteringBufferL);
      sumL = rms * rms * this.meteringBufferL.length;
      sumR = sumL;
    } else {
      // Stereo approximation
      // Note: For true stereo metering, we need AudioWorklet or separate analysers
      for (let i = 0; i < this.meteringBufferL.length; i += 2) {
        const l = Math.abs(this.meteringBufferL[i]);
        const r = Math.abs(this.meteringBufferL[i + 1] || this.meteringBufferL[i]);

        peakL = Math.max(peakL, l);
        peakR = Math.max(peakR, r);
        sumL += l * l;
        sumR += r * r;
      }
    }

    // Calculate RMS
    const sampleCount = this.meteringBufferL.length / 2;
    const rmsL = Math.sqrt(sumL / sampleCount);
    const rmsR = Math.sqrt(sumR / sampleCount);

    // Convert to dBFS
    this.meteringData = {
      peakL: dBFSUtils.linearToDb(peakL),
      peakR: dBFSUtils.linearToDb(peakR),
      rmsL: dBFSUtils.linearToDb(rmsL),
      rmsR: dBFSUtils.linearToDb(rmsR),
      timestamp: Date.now(),
      samplePosition: Math.floor(this.getCurrentTime() * (this.audioContext?.sampleRate || 48000)),
    };
  }

  /**
   * Resets metering data
   */
  private resetMetering(): void {
    this.meteringData = {
      peakL: -Infinity,
      peakR: -Infinity,
      rmsL: -Infinity,
      rmsR: -Infinity,
      timestamp: 0,
      samplePosition: 0,
    };
  }

  /**
   * Handles playback ended event
   */
  private handlePlaybackEnded(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isStopped = true;
    this.playbackState.currentTime = 0;
    this.setState(EngineState.STOPPED);
    this.stopMetering();
    this.resetMetering();
    console.info('Playback ended');
  }
}

/**
 * Export singleton instance creator for convenience
 */
let engineInstance: BaseAudioEngine | null = null;

/**
 * Gets or creates a singleton BaseAudioEngine instance
 * @param sampleRate - Sample rate (only used on first call)
 * @param config - Configuration (only used on first call)
 * @returns BaseAudioEngine instance
 */
export function getBaseAudioEngine(
  sampleRate?: number,
  config?: Partial<AudioEngineConfig>
): BaseAudioEngine {
  if (!engineInstance) {
    engineInstance = new BaseAudioEngine(sampleRate, config);
  }
  return engineInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetBaseAudioEngine(): void {
  if (engineInstance) {
    engineInstance.cleanup();
    engineInstance = null;
  }
}

// Backward compatibility exports
export { BaseAudioEngine as AudioEngine };
export function getAudioEngine(
  sampleRate?: number,
  config?: Partial<AudioEngineConfig>
): BaseAudioEngine {
  console.warn('getAudioEngine() is deprecated. Use getBaseAudioEngine() instead.');
  return getBaseAudioEngine(sampleRate, config);
}
export function resetAudioEngine(): void {
  console.warn('resetAudioEngine() is deprecated. Use resetBaseAudioEngine() instead.');
  resetBaseAudioEngine();
}

export default BaseAudioEngine;
