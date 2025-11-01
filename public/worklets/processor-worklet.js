/**
 * Base AudioWorklet Processor
 *
 * High-performance audio processor for real-time DSP with <10ms latency
 * Handles 128-sample blocks at 48kHz (2.67ms per block)
 *
 * Features:
 * - Zero-latency bypass
 * - Real-time parameter automation
 * - Peak/RMS metering
 * - Stereo & mono support
 * - Robust error handling
 */

class ProcessorWorklet extends AudioWorkletProcessor {
  constructor(options) {
    super();

    // Initialize state
    this.bypass = false;
    this.sampleRate = sampleRate;
    this.blockSize = 128;

    // Metering buffers (smoothed over ~100ms at 48kHz)
    this.meteringWindowSize = 4800; // 100ms at 48kHz
    this.leftPeakHistory = new Float32Array(this.meteringWindowSize);
    this.rightPeakHistory = new Float32Array(this.meteringWindowSize);
    this.historyIndex = 0;

    // Current metering values
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;

    // Message queue for thread-safe communication
    this.messageQueue = [];

    // Listen for parameter updates from main thread
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    // Initialize processor-specific parameters
    this.initializeParameters(options.processorOptions);

    // Performance monitoring
    this.processCount = 0;
    this.lastReportTime = currentTime;
    this.maxProcessTime = 0;
    this.totalProcessTime = 0;
  }

  /**
   * Override in subclass to initialize processor-specific parameters
   */
  initializeParameters(options) {
    // Base implementation - override in subclasses
    this.parameters = options || {};
  }

  /**
   * Handle messages from main thread
   */
  handleMessage(data) {
    try {
      const { type, payload } = data;

      switch (type) {
        case 'bypass':
          this.bypass = payload.value;
          break;

        case 'parameter':
          this.setParameter(payload.name, payload.value);
          break;

        case 'parameters':
          // Bulk parameter update
          Object.entries(payload).forEach(([name, value]) => {
            this.setParameter(name, value);
          });
          break;

        case 'reset':
          this.reset();
          break;

        case 'getMetering':
          this.sendMetering();
          break;

        default:
          console.warn(`[ProcessorWorklet] Unknown message type: ${type}`);
      }
    } catch (error) {
      this.sendError(`Message handling error: ${error.message}`);
    }
  }

  /**
   * Set a single parameter - override in subclass for validation
   */
  setParameter(name, value) {
    if (this.parameters.hasOwnProperty(name)) {
      this.parameters[name] = value;
    } else {
      console.warn(`[ProcessorWorklet] Unknown parameter: ${name}`);
    }
  }

  /**
   * Reset processor state - override in subclass
   */
  reset() {
    // Clear metering history
    this.leftPeakHistory.fill(0);
    this.rightPeakHistory.fill(0);
    this.historyIndex = 0;
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
  }

  /**
   * Main audio processing callback
   * Called every 128 samples (~2.67ms at 48kHz)
   */
  process(inputs, outputs, parameters) {
    const startTime = currentTime;

    try {
      const input = inputs[0];
      const output = outputs[0];

      // Handle missing input/output
      if (!input || !output || input.length === 0) {
        return true;
      }

      const numChannels = Math.min(input.length, output.length);

      // Bypass mode - direct copy with metering
      if (this.bypass) {
        for (let channel = 0; channel < numChannels; channel++) {
          const inputChannel = input[channel];
          const outputChannel = output[channel];

          if (inputChannel && outputChannel) {
            outputChannel.set(inputChannel);
          }
        }

        // Still update metering in bypass mode
        this.updateMetering(input);

        return true;
      }

      // Process audio through subclass implementation
      this.processAudio(input, output, parameters);

      // Update metering with processed output
      this.updateMetering(output);

      // Performance monitoring
      this.processCount++;
      const processTime = currentTime - startTime;
      this.totalProcessTime += processTime;
      this.maxProcessTime = Math.max(this.maxProcessTime, processTime);

      // Report performance every second
      if (currentTime - this.lastReportTime > 1.0) {
        this.reportPerformance();
        this.lastReportTime = currentTime;
      }

      return true; // Keep processor alive

    } catch (error) {
      this.sendError(`Processing error: ${error.message}`);
      // Pass through on error
      this.copyInputToOutput(inputs[0], outputs[0]);
      return true;
    }
  }

  /**
   * Override this method in subclass to implement DSP
   */
  processAudio(input, output, parameters) {
    // Default: pass through
    const numChannels = Math.min(input.length, output.length);
    for (let channel = 0; channel < numChannels; channel++) {
      if (input[channel] && output[channel]) {
        output[channel].set(input[channel]);
      }
    }
  }

  /**
   * Update peak and RMS metering
   */
  updateMetering(channels) {
    if (!channels || channels.length === 0) return;

    const blockSize = channels[0]?.length || 128;

    // Process left channel (or mono)
    if (channels[0]) {
      const { peak, rms } = this.analyzeSamples(channels[0]);
      this.leftPeak = peak;
      this.leftRMS = rms;
    }

    // Process right channel (if stereo)
    if (channels[1]) {
      const { peak, rms } = this.analyzeSamples(channels[1]);
      this.rightPeak = peak;
      this.rightRMS = rms;
    } else {
      // Mono - copy left to right
      this.rightPeak = this.leftPeak;
      this.rightRMS = this.leftRMS;
    }
  }

  /**
   * Analyze samples for peak and RMS
   */
  analyzeSamples(samples) {
    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < samples.length; i++) {
      const abs = Math.abs(samples[i]);
      peak = Math.max(peak, abs);
      sumSquares += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sumSquares / samples.length);

    return { peak, rms };
  }

  /**
   * Copy input to output (error fallback)
   */
  copyInputToOutput(input, output) {
    if (!input || !output) return;

    const numChannels = Math.min(input.length, output.length);
    for (let channel = 0; channel < numChannels; channel++) {
      if (input[channel] && output[channel]) {
        output[channel].set(input[channel]);
      }
    }
  }

  /**
   * Send metering data to main thread
   */
  sendMetering() {
    this.port.postMessage({
      type: 'metering',
      payload: {
        leftPeak: this.leftPeak,
        rightPeak: this.rightPeak,
        leftRMS: this.leftRMS,
        rightRMS: this.rightRMS,
        leftPeakDB: this.linearToDb(this.leftPeak),
        rightPeakDB: this.linearToDb(this.rightPeak),
        leftRMSDB: this.linearToDb(this.leftRMS),
        rightRMSDB: this.linearToDb(this.rightRMS)
      }
    });
  }

  /**
   * Report performance metrics
   */
  reportPerformance() {
    const avgProcessTime = this.totalProcessTime / this.processCount;
    const cpuLoad = (avgProcessTime / (this.blockSize / this.sampleRate)) * 100;

    this.port.postMessage({
      type: 'performance',
      payload: {
        avgProcessTimeMs: avgProcessTime * 1000,
        maxProcessTimeMs: this.maxProcessTime * 1000,
        cpuLoad: cpuLoad,
        processCount: this.processCount
      }
    });

    // Reset counters
    this.processCount = 0;
    this.maxProcessTime = 0;
    this.totalProcessTime = 0;
  }

  /**
   * Send error to main thread
   */
  sendError(message) {
    this.port.postMessage({
      type: 'error',
      payload: { message, timestamp: currentTime }
    });
  }

  /**
   * Utility: Convert linear amplitude to dB
   */
  linearToDb(linear) {
    if (linear === 0) return -Infinity;
    return 20 * Math.log10(linear);
  }

  /**
   * Utility: Convert dB to linear amplitude
   */
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }

  /**
   * Utility: Clamp value between min and max
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Utility: Linear interpolation
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

// Register the processor
registerProcessor('processor-worklet', ProcessorWorklet);
