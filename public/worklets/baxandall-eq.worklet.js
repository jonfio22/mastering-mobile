/**
 * Baxandall EQ AudioWorklet Processor
 *
 * Classic Baxandall tone control for mastering
 * Smooth, musical shelving EQ with interactive bass/treble controls
 *
 * Parameters:
 * - bassGain: -12 to +12 dB
 * - trebleGain: -12 to +12 dB
 * - bassFreq: 50-500 Hz (default: 100 Hz)
 * - trebleFreq: 2000-16000 Hz (default: 10000 Hz)
 */

class BaxandallEQProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate;
    this.bypass = false;

    // EQ Parameters
    this.params = {
      bassGain: 0,      // dB
      trebleGain: 0,    // dB
      bassFreq: 100,    // Hz
      trebleFreq: 10000 // Hz
    };

    // Initialize from options
    if (options.processorOptions) {
      Object.assign(this.params, options.processorOptions);
    }

    // Biquad filter state (stereo)
    this.bassFilterL = this.createBiquadState();
    this.bassFilterR = this.createBiquadState();
    this.trebleFilterL = this.createBiquadState();
    this.trebleFilterR = this.createBiquadState();

    // Calculate initial coefficients
    this.updateFilters();

    // Metering
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;

    // Message handler
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Create biquad filter state
   */
  createBiquadState() {
    return {
      // Coefficients
      b0: 1, b1: 0, b2: 0,
      a1: 0, a2: 0,
      // State variables
      x1: 0, x2: 0,
      y1: 0, y2: 0
    };
  }

  /**
   * Handle messages from main thread
   */
  handleMessage(data) {
    const { type, payload } = data;

    switch (type) {
      case 'bypass':
        this.bypass = payload.value;
        break;

      case 'parameter':
        this.setParameter(payload.name, payload.value);
        break;

      case 'parameters':
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
    }
  }

  /**
   * Set parameter and update filters if needed
   */
  setParameter(name, value) {
    if (this.params.hasOwnProperty(name)) {
      this.params[name] = value;

      // Update filter coefficients when parameters change
      if (name === 'bassGain' || name === 'bassFreq' || name === 'trebleGain' || name === 'trebleFreq') {
        this.updateFilters();
      }
    }
  }

  /**
   * Update filter coefficients
   *
   * Implements low-shelf and high-shelf biquad filters with proper
   * gain linearization to ensure shelves are flat at opposite end
   */
  updateFilters() {
    // Update bass (low-shelf) filter
    this.updateShelfFilter(
      this.params.bassGain,
      this.params.bassFreq,
      true, // isLowShelf
      this.bassFilterL,
      this.bassFilterR
    );

    // Update treble (high-shelf) filter
    this.updateShelfFilter(
      this.params.trebleGain,
      this.params.trebleFreq,
      false, // isHighShelf
      this.trebleFilterL,
      this.trebleFilterR
    );
  }

  /**
   * Calculate and apply shelf filter coefficients
   * Uses standard biquad shelf formulation with proper gain scaling
   */
  updateShelfFilter(gainDb, freq, isLowShelf, filterL, filterR) {
    // Skip if no gain
    if (Math.abs(gainDb) < 0.01) {
      // Set to unity gain (all-pass)
      filterL.b0 = filterL.b1 = filterL.b2 = 1.0;
      filterL.a1 = filterL.a2 = 0.0;
      filterR.b0 = filterR.b1 = filterR.b2 = 1.0;
      filterR.a1 = filterR.a2 = 0.0;
      return;
    }

    // Convert gain from dB to linear
    const A = Math.pow(10, gainDb / 40); // Sqrt of power gain for shelf filters

    // Normalized frequency
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const sinW0 = Math.sin(w0);
    const cosW0 = Math.cos(w0);

    // Q factor for shelf (0.707 = Butterworth, provides smooth response)
    const Q = 0.707;
    const alpha = sinW0 / (2 * Q);

    // Calculate coefficients
    let b0, b1, b2, a0, a1, a2;

    if (isLowShelf) {
      // Low-shelf formula
      const twosqrtA = 2 * Math.sqrt(A);
      b0 = A * ((A + 1) - (A - 1) * cosW0 + twosqrtA * alpha);
      b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
      b2 = A * ((A + 1) - (A - 1) * cosW0 - twosqrtA * alpha);
      a0 = (A + 1) + (A - 1) * cosW0 + twosqrtA * alpha;
      a1 = -2 * ((A - 1) + (A + 1) * cosW0);
      a2 = (A + 1) + (A - 1) * cosW0 - twosqrtA * alpha;
    } else {
      // High-shelf formula
      const twosqrtA = 2 * Math.sqrt(A);
      b0 = A * ((A + 1) + (A - 1) * cosW0 + twosqrtA * alpha);
      b1 = -2 * A * ((A - 1) + (A + 1) * cosW0);
      b2 = A * ((A + 1) + (A - 1) * cosW0 - twosqrtA * alpha);
      a0 = (A + 1) - (A - 1) * cosW0 + twosqrtA * alpha;
      a1 = 2 * ((A - 1) - (A + 1) * cosW0);
      a2 = (A + 1) - (A - 1) * cosW0 - twosqrtA * alpha;
    }

    // Normalize coefficients
    filterL.b0 = b0 / a0;
    filterL.b1 = b1 / a0;
    filterL.b2 = b2 / a0;
    filterL.a1 = a1 / a0;
    filterL.a2 = a2 / a0;

    // Same for right channel
    filterR.b0 = filterL.b0;
    filterR.b1 = filterL.b1;
    filterR.b2 = filterL.b2;
    filterR.a1 = filterL.a1;
    filterR.a2 = filterL.a2;
  }

  /**
   * Reset filter state
   */
  reset() {
    // Clear filter state
    [this.bassFilterL, this.bassFilterR, this.trebleFilterL, this.trebleFilterR].forEach(filter => {
      filter.x1 = filter.x2 = 0;
      filter.y1 = filter.y2 = 0;
    });

    // Clear metering
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
  }

  /**
   * Process biquad filter
   */
  processBiquad(input, filter) {
    const { b0, b1, b2, a1, a2 } = filter;

    const output = b0 * input + b1 * filter.x1 + b2 * filter.x2
                 - a1 * filter.y1 - a2 * filter.y2;

    // Update state
    filter.x2 = filter.x1;
    filter.x1 = input;
    filter.y2 = filter.y1;
    filter.y1 = output;

    return output;
  }

  /**
   * Main processing loop
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !output || input.length === 0) {
      return true;
    }

    const blockSize = input[0]?.length || 128;
    const isStereo = input.length >= 2;

    // Bypass mode
    if (this.bypass) {
      for (let channel = 0; channel < Math.min(input.length, output.length); channel++) {
        if (input[channel] && output[channel]) {
          output[channel].set(input[channel]);
        }
      }
      this.updateMetering(output, blockSize);
      return true;
    }

    // Process left channel
    if (input[0] && output[0]) {
      for (let i = 0; i < blockSize; i++) {
        let sample = input[0][i];

        // Apply bass shelf filter
        sample = this.processBiquad(sample, this.bassFilterL);

        // Apply treble shelf filter
        sample = this.processBiquad(sample, this.trebleFilterL);

        output[0][i] = sample;
      }
    }

    // Process right channel (or copy left if mono)
    if (output[1]) {
      if (isStereo && input[1]) {
        for (let i = 0; i < blockSize; i++) {
          let sample = input[1][i];

          // Apply bass shelf filter
          sample = this.processBiquad(sample, this.bassFilterR);

          // Apply treble shelf filter
          sample = this.processBiquad(sample, this.trebleFilterR);

          output[1][i] = sample;
        }
      } else {
        // Mono to stereo
        output[1].set(output[0]);
      }
    }

    this.updateMetering(output, blockSize);
    return true;
  }

  /**
   * Update metering
   */
  updateMetering(channels, blockSize) {
    if (!channels || channels.length === 0) return;

    // Left channel
    if (channels[0]) {
      const { peak, rms } = this.analyzeSamples(channels[0], blockSize);
      this.leftPeak = peak;
      this.leftRMS = rms;
    }

    // Right channel
    if (channels[1]) {
      const { peak, rms } = this.analyzeSamples(channels[1], blockSize);
      this.rightPeak = peak;
      this.rightRMS = rms;
    } else {
      this.rightPeak = this.leftPeak;
      this.rightRMS = this.leftRMS;
    }
  }

  /**
   * Analyze samples
   */
  analyzeSamples(samples, blockSize) {
    let peak = 0;
    let sumSquares = 0;

    for (let i = 0; i < blockSize; i++) {
      const abs = Math.abs(samples[i]);
      peak = Math.max(peak, abs);
      sumSquares += samples[i] * samples[i];
    }

    const rms = Math.sqrt(sumSquares / blockSize);
    return { peak, rms };
  }

  /**
   * Send metering data
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
   * Utility: Linear to dB
   */
  linearToDb(linear) {
    if (linear === 0) return -Infinity;
    return 20 * Math.log10(linear);
  }
}

// Register processor
registerProcessor('baxandall-eq', BaxandallEQProcessor);
