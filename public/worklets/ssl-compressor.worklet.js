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
   * DSP implementation in task 2.2
   */
  updateTimeConstants() {
    // TODO: Implement time constant calculation
    // This will be implemented in task 2.2
    //
    // Calculate attack coefficient from this.params.attack (ms)
    // attackCoeff = exp(-1 / (sampleRate * attackTime))
    //
    // Calculate release coefficient from this.params.release (ms)
    // releaseCoeff = exp(-1 / (sampleRate * releaseTime))
    //
    // These coefficients are used in the envelope follower
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
   * DSP implementation in task 2.2
   */
  computeGainReduction(inputLevel) {
    // TODO: Implement SSL-style compression curve
    // This will be implemented in task 2.2
    //
    // 1. Convert input level to dB
    // 2. Compare to threshold
    // 3. Apply ratio above threshold
    // 4. Return gain reduction in linear (not dB)
    //
    // Classic SSL characteristic:
    // - Soft knee for smooth compression
    // - Ratio-dependent curve shaping
    //
    // For now, return 1.0 (no gain reduction)
    return 1.0;
  }

  /**
   * Apply envelope follower
   *
   * DSP implementation in task 2.2
   */
  smoothEnvelope(targetGain) {
    // TODO: Implement attack/release envelope follower
    // This will be implemented in task 2.2
    //
    // Use attackCoeff/releaseCoeff for smooth gain changes
    // Faster attack, slower release for punchy compression
    //
    // For now, return target gain directly
    return targetGain;
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

      // DSP implementation in task 2.2
      // 1. Calculate gain reduction based on peak level
      // const targetGain = this.computeGainReduction(peakLevel);
      //
      // 2. Smooth with attack/release envelope
      // const gain = this.smoothEnvelope(targetGain);
      //
      // 3. Apply gain reduction and makeup gain
      // const finalGain = gain * makeupGain;

      // For now, just pass through with makeup gain
      const finalGain = makeupGain;

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
