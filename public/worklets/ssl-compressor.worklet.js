/**
 * SSL-Style Compressor AudioWorklet Processor
 *
 * Classic SSL bus compressor character for mastering
 * Known for its punchy, glue-like compression
 *
 * Parameters:
 * - threshold: -60 to 0 dB
 * - ratio: 1:1 to 20:1
 * - attack: 0.1 to 100 ms
 * - release: 10 to 1000 ms
 * - makeupGain: 0 to 20 dB
 */

class SSLCompressorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate;
    this.bypass = false;

    // Compressor Parameters
    this.params = {
      threshold: -10,    // dB
      ratio: 4,          // x:1
      attack: 10,        // ms
      release: 100,      // ms
      makeupGain: 0      // dB
    };

    // Initialize from options
    if (options.processorOptions) {
      Object.assign(this.params, options.processorOptions);
    }

    // Compressor state (stereo-linked)
    this.envelope = 0;           // Smoothed gain reduction envelope
    this.gainReduction = 0;      // Current gain reduction (dB)
    this.maxGainReduction = 0;   // Peak gain reduction for metering

    // Attack/release coefficients (calculated from time constants)
    this.attackCoeff = 0;
    this.releaseCoeff = 0;
    this.updateTimeConstants();

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
   * Set parameter and update coefficients if needed
   */
  setParameter(name, value) {
    if (this.params.hasOwnProperty(name)) {
      this.params[name] = value;

      // Update time constants when attack/release change
      if (name === 'attack' || name === 'release') {
        this.updateTimeConstants();
      }
    }
  }

  /**
   * Update attack/release time constants
   *
   * Converts attack/release times (ms) to exponential coefficients
   * for smooth envelope following
   */
  updateTimeConstants() {
    // Convert ms to seconds
    const attackSec = this.params.attack / 1000;
    const releaseSec = this.params.release / 1000;

    // Calculate coefficients: coeff = exp(-1 / (sampleRate * timeInSec))
    // This gives exponential decay with time constant = timeInSec
    this.attackCoeff = Math.exp(-1 / (this.sampleRate * attackSec));
    this.releaseCoeff = Math.exp(-1 / (this.sampleRate * releaseSec));
  }

  /**
   * Reset compressor state
   */
  reset() {
    this.envelope = 0;
    this.gainReduction = 0;
    this.maxGainReduction = 0;
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
  }

  /**
   * Calculate gain reduction based on input level
   *
   * Implements SSL-style compression with soft knee characteristic
   * Soft knee provides smooth, musical compression without harsh artifacts
   */
  computeGainReduction(inputLevel) {
    // Prevent log of zero
    if (inputLevel < 1e-10) {
      return 1.0;
    }

    // Convert to dB
    const inputDb = 20 * Math.log10(inputLevel);

    // Soft knee implementation: wider knee = smoother compression
    // Knee width: 2 * width (centered on threshold)
    const kneeWidth = 2; // dB

    if (inputDb < this.params.threshold - kneeWidth) {
      // Below knee - no compression
      return 1.0;
    }

    if (inputDb > this.params.threshold + kneeWidth) {
      // Above knee - full compression
      // Gain reduction = (threshold + (input - threshold) / ratio - input)
      const gainReductionDb = (this.params.threshold + (inputDb - this.params.threshold) / this.params.ratio) - inputDb;
      return Math.pow(10, gainReductionDb / 20);
    }

    // Inside soft knee - interpolate smoothly
    // Use parabolic curve for smooth knee (better than linear)
    const kneeCenter = this.params.threshold;
    const x = (inputDb - (kneeCenter - kneeWidth)) / (2 * kneeWidth);
    const kneeGain = 1 - (1 - 1 / this.params.ratio) * x * x;

    // Apply soft knee compression
    const gainReductionDb = (kneeCenter + (inputDb - kneeCenter) * kneeGain / this.params.ratio) - inputDb;
    return Math.pow(10, gainReductionDb / 20);
  }

  /**
   * Apply envelope follower
   *
   * Uses exponential smoothing with separate attack and release
   * rates for responsive compression with smooth recovery
   */
  smoothEnvelope(targetGain) {
    // Separate attack and release for typical compressor behavior
    // Attack is fast (responsive), release is slower (musical)
    if (targetGain < this.envelope) {
      // Attack: quickly respond to increases in signal
      this.envelope = this.attackCoeff * this.envelope + (1 - this.attackCoeff) * targetGain;
    } else {
      // Release: slowly return to unity (prevents pumping)
      this.envelope = this.releaseCoeff * this.envelope + (1 - this.releaseCoeff) * targetGain;
    }

    return this.envelope;
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

    // Makeup gain (linear)
    const makeupGain = this.dbToLinear(this.params.makeupGain);

    // Process block
    for (let i = 0; i < blockSize; i++) {
      // Get stereo peak (RMS could also be used)
      const leftSample = input[0] ? input[0][i] : 0;
      const rightSample = (isStereo && input[1]) ? input[1][i] : leftSample;
      const peakLevel = Math.max(Math.abs(leftSample), Math.abs(rightSample));

      // 1. Calculate gain reduction based on peak level
      const targetGain = this.computeGainReduction(peakLevel);

      // 2. Smooth with attack/release envelope
      const gain = this.smoothEnvelope(targetGain);

      // 3. Track for metering
      const gainReductionDb = 20 * Math.log10(gain);
      this.gainReduction = -gainReductionDb; // Negative because gain < 1 means reduction
      this.maxGainReduction = Math.max(this.maxGainReduction, this.gainReduction);

      // 4. Apply gain reduction and makeup gain
      const finalGain = gain * makeupGain;

      // Apply to output
      if (output[0]) {
        output[0][i] = leftSample * finalGain;
      }
      if (output[1]) {
        output[1][i] = rightSample * finalGain;
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
   * Send metering data (includes gain reduction)
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
        rightRMSDB: this.linearToDb(this.rightRMS),
        gainReduction: this.gainReduction,
        maxGainReduction: this.maxGainReduction
      }
    });

    // Reset max gain reduction after reporting
    this.maxGainReduction = 0;
  }

  /**
   * Utility: Linear to dB
   */
  linearToDb(linear) {
    if (linear === 0) return -Infinity;
    return 20 * Math.log10(linear);
  }

  /**
   * Utility: dB to Linear
   */
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }
}

// Register processor
registerProcessor('ssl-compressor', SSLCompressorProcessor);
