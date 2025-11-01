/**
 * WorkletManager
 *
 * Manages AudioWorklet lifecycle, parameter messaging, and error handling
 * Provides type-safe bridge between main thread and audio thread
 *
 * Features:
 * - Load/unload/reload worklets
 * - Type-safe parameter updates
 * - Event-based metering and performance monitoring
 * - Automatic error recovery
 * - Browser compatibility detection
 */

import {
  WorkletConfig,
  WorkletState,
  WorkletEventHandlers,
  WorkletMessage,
  ParametersPayload,
  MeteringData,
  PerformanceData,
  ErrorPayload,
  AudioWorkletSupport,
  WorkletError,
  WorkletErrorCode,
  WorkletLoadOptions,
  WorkletNodeConfig
} from '../types/worklet.types';

export class WorkletManager {
  private audioContext: AudioContext | null = null;
  private worklets: Map<string, WorkletState> = new Map();
  private eventHandlers: Map<string, WorkletEventHandlers> = new Map();
  private meteringInterval: number | null = null;
  private meteringRate = 60; // Hz

  constructor() {
    this.checkBrowserSupport();
  }

  // ============================================================================
  // Initialization & Browser Support
  // ============================================================================

  /**
   * Initialize with an AudioContext
   */
  initialize(audioContext: AudioContext): void {
    this.audioContext = audioContext;
  }

  /**
   * Check if AudioWorklet is supported in this browser
   */
  checkBrowserSupport(): AudioWorkletSupport {
    const hasAudioContext = typeof AudioContext !== 'undefined' ||
                           typeof (window as any).webkitAudioContext !== 'undefined';

    if (!hasAudioContext) {
      return {
        supported: false,
        audioContext: false,
        audioWorklet: false,
        reason: 'Web Audio API not supported'
      };
    }

    // Create temporary context to check for AudioWorklet support
    const tempContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const hasAudioWorklet = tempContext.audioWorklet !== undefined;
    tempContext.close();

    if (!hasAudioWorklet) {
      return {
        supported: false,
        audioContext: true,
        audioWorklet: false,
        reason: 'AudioWorklet not supported (requires modern browser)'
      };
    }

    return {
      supported: true,
      audioContext: true,
      audioWorklet: true
    };
  }

  // ============================================================================
  // Worklet Loading & Registration
  // ============================================================================

  /**
   * Load and register a worklet module
   */
  async loadWorklet(
    config: WorkletConfig,
    options: WorkletLoadOptions = {}
  ): Promise<AudioWorkletNode> {
    if (!this.audioContext) {
      throw new WorkletError(
        'AudioContext not initialized. Call initialize() first.',
        WorkletErrorCode.AUDIO_CONTEXT_ERROR
      );
    }

    const { name, url, processorName } = config;
    const { retries = 3, timeout = 5000, onProgress } = options;

    // Check if already loaded
    if (this.worklets.has(name)) {
      const state = this.worklets.get(name)!;
      if (state.loaded && state.node) {
        console.warn(`[WorkletManager] Worklet "${name}" already loaded`);
        return state.node;
      }
    }

    // Initialize state
    this.worklets.set(name, {
      loaded: false,
      node: null,
      config,
      lastMetering: null,
      lastPerformance: null,
      errors: []
    });

    onProgress?.('Loading module...');

    // Load the worklet module with retry logic
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        await this.loadModuleWithTimeout(url, timeout);
        onProgress?.('Module loaded');
        break;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[WorkletManager] Load attempt ${attempt + 1}/${retries} failed:`, error);
        if (attempt < retries - 1) {
          await this.delay(500 * (attempt + 1)); // Exponential backoff
        }
      }
    }

    if (lastError) {
      throw new WorkletError(
        `Failed to load worklet module: ${lastError.message}`,
        WorkletErrorCode.LOAD_FAILED,
        name
      );
    }

    onProgress?.('Creating worklet node...');

    // Create the AudioWorkletNode
    let node: AudioWorkletNode;
    try {
      const nodeConfig: WorkletNodeConfig = {
        numberOfInputs: config.numberOfInputs ?? 1,
        numberOfOutputs: config.numberOfOutputs ?? 1,
        outputChannelCount: config.outputChannelCount ?? [2],
        channelCount: 2,
        channelCountMode: 'explicit',
        channelInterpretation: 'speakers'
      };

      node = new AudioWorkletNode(
        this.audioContext,
        processorName,
        {
          ...nodeConfig,
          processorOptions: config.processorOptions ?? {}
        }
      );
    } catch (error) {
      throw new WorkletError(
        `Failed to create worklet node: ${(error as Error).message}`,
        WorkletErrorCode.NODE_CREATION_FAILED,
        name
      );
    }

    // Set up message handling
    this.setupMessageHandlers(name, node);

    // Update state
    const state = this.worklets.get(name)!;
    state.loaded = true;
    state.node = node;

    onProgress?.('Ready');

    // Emit loaded event
    this.emitEvent(name, 'loaded', name);

    console.log(`[WorkletManager] Loaded worklet: ${name}`);
    return node;
  }

  /**
   * Load module with timeout
   */
  private async loadModuleWithTimeout(url: string, timeout: number): Promise<void> {
    return Promise.race([
      this.audioContext!.audioWorklet.addModule(url),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Load timeout')), timeout)
      )
    ]);
  }

  /**
   * Unload a worklet
   */
  unloadWorklet(name: string): void {
    const state = this.worklets.get(name);
    if (!state) {
      console.warn(`[WorkletManager] Worklet "${name}" not found`);
      return;
    }

    // Disconnect and destroy node
    if (state.node) {
      state.node.disconnect();
      state.node.port.close();
    }

    // Clear state
    this.worklets.delete(name);
    this.eventHandlers.delete(name);

    // Emit unloaded event
    this.emitEvent(name, 'unloaded', name);

    console.log(`[WorkletManager] Unloaded worklet: ${name}`);
  }

  /**
   * Reload a worklet (useful for development/hot-reload)
   */
  async reloadWorklet(name: string): Promise<AudioWorkletNode> {
    const state = this.worklets.get(name);
    if (!state) {
      throw new WorkletError(
        `Cannot reload: worklet "${name}" not found`,
        WorkletErrorCode.UNKNOWN,
        name
      );
    }

    const config = state.config;
    this.unloadWorklet(name);

    // Add cache busting to URL
    const url = `${config.url}?t=${Date.now()}`;
    return this.loadWorklet({ ...config, url });
  }

  // ============================================================================
  // Parameter Management
  // ============================================================================

  /**
   * Set a single parameter
   */
  setParameter(workletName: string, paramName: string, value: number): void {
    this.sendMessage(workletName, {
      type: 'parameter',
      payload: { name: paramName, value }
    });
  }

  /**
   * Set multiple parameters at once
   */
  setParameters(workletName: string, params: ParametersPayload): void {
    this.sendMessage(workletName, {
      type: 'parameters',
      payload: params
    });
  }

  /**
   * Set bypass state
   */
  setBypass(workletName: string, bypass: boolean): void {
    this.sendMessage(workletName, {
      type: 'bypass',
      payload: { value: bypass }
    });
  }

  /**
   * Reset worklet state
   */
  reset(workletName: string): void {
    this.sendMessage(workletName, {
      type: 'reset',
      payload: {}
    });
  }

  // ============================================================================
  // Metering
  // ============================================================================

  /**
   * Start automatic metering updates
   */
  startMetering(rate: number = 60): void {
    this.meteringRate = rate;

    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
    }

    this.meteringInterval = window.setInterval(() => {
      this.worklets.forEach((_, name) => {
        this.requestMetering(name);
      });
    }, 1000 / rate);
  }

  /**
   * Stop automatic metering updates
   */
  stopMetering(): void {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
    }
  }

  /**
   * Request metering data from a worklet
   */
  requestMetering(workletName: string): void {
    this.sendMessage(workletName, {
      type: 'getMetering',
      payload: {}
    });
  }

  /**
   * Get last metering data
   */
  getMetering(workletName: string): MeteringData | null {
    return this.worklets.get(workletName)?.lastMetering ?? null;
  }

  /**
   * Get last performance data
   */
  getPerformance(workletName: string): PerformanceData | null {
    return this.worklets.get(workletName)?.lastPerformance ?? null;
  }

  // ============================================================================
  // Event Handling
  // ============================================================================

  /**
   * Register event handlers for a worklet
   */
  on(workletName: string, handlers: WorkletEventHandlers): void {
    this.eventHandlers.set(workletName, {
      ...this.eventHandlers.get(workletName),
      ...handlers
    });
  }

  /**
   * Remove event handlers
   */
  off(workletName: string): void {
    this.eventHandlers.delete(workletName);
  }

  /**
   * Setup message handlers for a worklet node
   */
  private setupMessageHandlers(name: string, node: AudioWorkletNode): void {
    node.port.onmessage = (event: MessageEvent) => {
      const message = event.data as WorkletMessage;
      this.handleWorkletMessage(name, message);
    };

    node.port.onmessageerror = (event: MessageEvent) => {
      console.error(`[WorkletManager] Message error from ${name}:`, event);
      this.recordError(name, {
        message: 'Message serialization error',
        timestamp: Date.now()
      });
    };

    node.onprocessorerror = (event: Event) => {
      console.error(`[WorkletManager] Processor error from ${name}:`, event);
      this.recordError(name, {
        message: 'Audio processor error',
        timestamp: Date.now()
      });
    };
  }

  /**
   * Handle incoming message from worklet
   */
  private handleWorkletMessage(workletName: string, message: WorkletMessage): void {
    const { type, payload } = message;

    switch (type) {
      case 'metering':
        this.handleMetering(workletName, payload as MeteringData);
        break;

      case 'performance':
        this.handlePerformance(workletName, payload as PerformanceData);
        break;

      case 'error':
        this.handleError(workletName, payload as ErrorPayload);
        break;

      default:
        console.warn(`[WorkletManager] Unknown message type from ${workletName}:`, type);
    }
  }

  /**
   * Handle metering data
   */
  private handleMetering(workletName: string, data: MeteringData): void {
    const state = this.worklets.get(workletName);
    if (state) {
      state.lastMetering = data;
    }

    this.emitEvent(workletName, 'metering', data);
  }

  /**
   * Handle performance data
   */
  private handlePerformance(workletName: string, data: PerformanceData): void {
    const state = this.worklets.get(workletName);
    if (state) {
      state.lastPerformance = data;
    }

    this.emitEvent(workletName, 'performance', data);
  }

  /**
   * Handle error from worklet
   */
  private handleError(workletName: string, error: ErrorPayload): void {
    console.error(`[WorkletManager] Error from ${workletName}:`, error.message);
    this.recordError(workletName, error);
    this.emitEvent(workletName, 'error', error);
  }

  /**
   * Record error in state
   */
  private recordError(workletName: string, error: ErrorPayload): void {
    const state = this.worklets.get(workletName);
    if (state) {
      state.errors.push(error);
      // Keep only last 10 errors
      if (state.errors.length > 10) {
        state.errors.shift();
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emitEvent(workletName: string, eventType: string, data: unknown): void {
    const handlers = this.eventHandlers.get(workletName);
    if (!handlers) return;

    const handler = (handlers as any)[eventType];
    if (handler && typeof handler === 'function') {
      try {
        handler(data);
      } catch (error) {
        console.error(`[WorkletManager] Error in ${eventType} handler:`, error);
      }
    }
  }

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send message to worklet
   */
  private sendMessage(workletName: string, message: WorkletMessage): void {
    const state = this.worklets.get(workletName);
    if (!state || !state.node) {
      console.warn(`[WorkletManager] Cannot send message: worklet "${workletName}" not loaded`);
      return;
    }

    try {
      state.node.port.postMessage(message);
    } catch (error) {
      console.error(`[WorkletManager] Failed to send message to ${workletName}:`, error);
      this.recordError(workletName, {
        message: `Message send failed: ${(error as Error).message}`,
        timestamp: Date.now()
      });
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get worklet node
   */
  getNode(workletName: string): AudioWorkletNode | null {
    return this.worklets.get(workletName)?.node ?? null;
  }

  /**
   * Check if worklet is loaded
   */
  isLoaded(workletName: string): boolean {
    return this.worklets.get(workletName)?.loaded ?? false;
  }

  /**
   * Get all loaded worklet names
   */
  getLoadedWorklets(): string[] {
    return Array.from(this.worklets.entries())
      .filter(([_, state]) => state.loaded)
      .map(([name]) => name);
  }

  /**
   * Get errors for a worklet
   */
  getErrors(workletName: string): ErrorPayload[] {
    return this.worklets.get(workletName)?.errors ?? [];
  }

  /**
   * Clear errors for a worklet
   */
  clearErrors(workletName: string): void {
    const state = this.worklets.get(workletName);
    if (state) {
      state.errors = [];
    }
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all worklets
   */
  dispose(): void {
    this.stopMetering();

    const workletNames = Array.from(this.worklets.keys());
    workletNames.forEach(name => this.unloadWorklet(name));

    this.worklets.clear();
    this.eventHandlers.clear();
    this.audioContext = null;
  }
}
