/**
 * True Peak Limiter AudioWorklet Processor
 *
 * Brick-wall limiter for final stage mastering
 * Prevents digital clipping while maintaining transparency
 *
 * Features:
 * - True peak detection (oversampled)
 * - Ultra-fast attack (<1ms)
 * - Adjustable release
 * - Output ceiling control
 *
 * Parameters:
 * - threshold: -20 to 0 dB
 * - release: 10 to 1000 ms
 * - ceiling: -0.3 to 0 dB (safety headroom)
 */

class LimiterProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate;
    this.bypass = false;

    // Limiter Parameters
    this.params = {
      threshold: -1.0,   // dB
      release: 100,      // ms
      ceiling: -0.3      // dB (safety margin)
    };

    // Initialize from options
    if (options.processorOptions) {
      Object.assign(this.params, options.processorOptions);
    }

    // Limiter state
    this.envelope = 1.0;         // Current gain envelope (1.0 = no limiting)
    this.peakHold = 0;           // Peak hold for display
    this.gainReduction = 0;      // Current GR in dB
    this.maxGainReduction = 0;   // Max GR for metering

    // Release coefficient
    this.releaseCoeff = 0;
    this.updateReleaseCoeff();

    // Lookahead buffer (for zero-latency brick-wall limiting)
    // Note: True brick-wall limiting requires lookahead (adds latency)
    // For now, we'll use a simple attack-only approach
    this.lookaheadSamples = 0; // Will be implemented in task 2.3
    this.delayBufferL = null;
    this.delayBufferR = null;
    this.delayWriteIndex = 0;

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

      // Update release coefficient when release changes
      if (name === 'release') {
        this.updateReleaseCoeff();
      }
    }
  }

  /**
   * Update release coefficient
   *
   * DSP implementation in task 2.3
   */
  updateReleaseCoeff() {
    // TODO: Implement release coefficient calculation
    // This will be implemented in task 2.3
    //
    // Convert release time (ms) to coefficient for smooth release
    // releaseCoeff = exp(-1 / (sampleRate * releaseTime))
    //
    // Ultra-fast attack is hardcoded (typically 0.1-0.5ms)
  }

  /**
   * Reset limiter state
   */
  reset() {
    this.envelope = 1.0;
    this.peakHold = 0;
    this.gainReduction = 0;
    this.maxGainReduction = 0;
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;

    // Clear delay buffers if allocated
    if (this.delayBufferL) {
      this.delayBufferL.fill(0);
      this.delayBufferR.fill(0);
      this.delayWriteIndex = 0;
    }
  }

  /**
   * Detect true peak level
   *
   * DSP implementation in task 2.3
   */
  detectPeak(leftSample, rightSample) {
    // TODO: Implement true peak detection with oversampling
    // This will be implemented in task 2.3
    //
    // For mastering-grade limiting, we need to detect inter-sample peaks
    // This requires upsampling (typically 4x) to catch peaks between samples
    //
    // Steps:
    // 1. Upsample to 4x (using polyphase filter)
    // 2. Find peak in upsampled signal
    // 3. Return detected peak
    //
    // For now, use simple peak detection
    return Math.max(Math.abs(leftSample), Math.abs(rightSample));
  }

  /**
   * Calculate required gain reduction
   *
   * DSP implementation in task 2.3
   */
  calculateGainReduction(peakLevel) {
    // TODO: Implement brick-wall limiting calculation
    // This will be implemented in task 2.3
    //
    // Compare peak level to threshold
    // If over threshold, calculate exact gain needed to limit to ceiling
    //
    // Formula:
    // if (peakDB > threshold) {
    //   targetDB = ceiling
    //   gainReduction = targetDB - peakDB
    // }
    //
    // For now, return 1.0 (no gain reduction)
    return 1.0;
  }

  /**
   * Apply envelope smoothing
   *
   * DSP implementation in task 2.3
   */
  smoothEnvelope(targetGain) {
    // TODO: Implement ultra-fast attack, smooth release
    // This will be implemented in task 2.3
    //
    // Attack: instant or near-instant (0.1ms)
    // Release: smooth using releaseCoeff
    //
    // if (targetGain < currentEnvelope) {
    //   // Attack: instant
    //   currentEnvelope = targetGain
    // } else {
    //   // Release: smooth
    //   currentEnvelope = currentEnvelope + (targetGain - currentEnvelope) * releaseCoeff
    // }
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

    // Ceiling in linear
    const ceilingLinear = this.dbToLinear(this.params.ceiling);
    const thresholdLinear = this.dbToLinear(this.params.threshold);

    // Process block
    for (let i = 0; i < blockSize; i++) {
      // Get input samples
      const leftSample = input[0] ? input[0][i] : 0;
      const rightSample = (isStereo && input[1]) ? input[1][i] : leftSample;

      // DSP implementation in task 2.3
      // 1. Detect true peak (with oversampling)
      // const peakLevel = this.detectPeak(leftSample, rightSample);
      //
      // 2. Calculate required gain reduction
      // const targetGain = this.calculateGainReduction(peakLevel);
      //
      // 3. Smooth with envelope follower
      // const gain = this.smoothEnvelope(targetGain);
      //
      // 4. Apply gain and ensure we don't exceed ceiling
      // let leftOut = leftSample * gain;
      // let rightOut = rightSample * gain;
      //
      // 5. Hard clip at ceiling (safety)
      // leftOut = Math.max(-ceilingLinear, Math.min(ceilingLinear, leftOut));
      // rightOut = Math.max(-ceilingLinear, Math.min(ceilingLinear, rightOut));

      // For now, just pass through
      let leftOut = leftSample;
      let rightOut = rightSample;

      // Apply to output
      if (output[0]) {
        output[0][i] = leftOut;
      }
      if (output[1]) {
        output[1][i] = rightOut;
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
   * Send metering data (includes gain reduction and ceiling)
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
        maxGainReduction: this.maxGainReduction,
        peakHold: this.peakHold
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
registerProcessor('limiter', LimiterProcessor);
