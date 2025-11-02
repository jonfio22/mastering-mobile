/**
 * Professional True Peak Limiter AudioWorklet Processor
 *
 * Mastering-grade limiter with:
 * - 4x oversampling for true peak detection
 * - Lookahead for transparent limiting
 * - ITU-R BS.1770 loudness measurement
 * - Multiple limiting algorithms
 * - Adaptive release
 * - Inter-sample peak prevention
 * - Dithering for bit depth reduction
 *
 * @author Professional Audio DSP Implementation
 */

class ProfessionalLimiterProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate;
    this.bypass = false;

    // Limiter Parameters
    this.params = {
      threshold: -0.3,      // dB (typically -0.3 for streaming)
      release: 50,          // ms
      ceiling: -0.1,        // dB (true peak ceiling)

      // Advanced parameters
      algorithm: 'transparent', // 'transparent', 'aggressive', 'smooth'
      oversampling: 4,         // 2x, 4x, or 8x
      lookahead: 2,           // ms
      adaptiveRelease: true,  // Program-dependent release
      isr: true,              // Inter-sample peak reduction
      dithering: true,        // TPDF dithering
      targetLUFS: -14        // Target loudness for streaming
    };

    // Initialize from options
    if (options.processorOptions) {
      Object.assign(this.params, options.processorOptions);
    }

    // Oversampling setup
    this.oversampleFactor = this.params.oversampling;
    this.oversampledRate = this.sampleRate * this.oversampleFactor;

    // Polyphase FIR filters for oversampling
    this.upsampleFilterL = this.createPolyphaseFilter();
    this.upsampleFilterR = this.createPolyphaseFilter();
    this.downsampleFilterL = this.createPolyphaseFilter();
    this.downsampleFilterR = this.createPolyphaseFilter();

    // Oversampled buffers
    this.oversampledBufferL = new Float32Array(128 * this.oversampleFactor);
    this.oversampledBufferR = new Float32Array(128 * this.oversampleFactor);

    // Lookahead delay line
    this.lookaheadSamples = Math.floor(this.params.lookahead * this.oversampledRate / 1000);
    this.delayLineL = new Float32Array(this.lookaheadSamples);
    this.delayLineR = new Float32Array(this.lookaheadSamples);
    this.delayIndex = 0;

    // Peak detection
    this.peakHoldTime = 10; // ms
    this.peakHoldSamples = Math.floor(this.peakHoldTime * this.oversampledRate / 1000);
    this.peakHistory = new Float32Array(this.peakHoldSamples);
    this.peakHistoryIndex = 0;
    this.currentPeak = 0;

    // Envelope followers
    this.envelope = 1.0;
    this.releaseEnvelope = 1.0;
    this.attackCoeff = 0;
    this.releaseCoeff = 0;
    this.updateTimeConstants();

    // ITU-R BS.1770 K-weighting filters for loudness measurement
    this.kWeightingL = {
      shelf: this.createShelfFilter(),
      highpass: this.createHighpassFilter()
    };
    this.kWeightingR = {
      shelf: this.createShelfFilter(),
      highpass: this.createHighpassFilter()
    };

    // Loudness measurement
    this.momentaryWindow = 400; // 400ms window
    this.momentaryBufferL = new Float32Array(Math.floor(this.momentaryWindow * this.sampleRate / 1000));
    this.momentaryBufferR = new Float32Array(this.momentaryBufferL.length);
    this.momentaryIndex = 0;
    this.currentLUFS = -100;

    // Adaptive release
    this.transientMemory = new Float32Array(100);
    this.transientIndex = 0;
    this.adaptiveReleaseRatio = 1.0;

    // Dithering
    this.ditherNoiseL = 0;
    this.ditherNoiseR = 0;

    // Metering
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
    this.truePeak = 0;
    this.maxGainReduction = 0;

    // Message handler
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
  }

  /**
   * Create polyphase filter for oversampling
   * Uses Kaiser window FIR design
   */
  createPolyphaseFilter() {
    const filterLength = 64; // Per phase
    const phases = this.oversampleFactor;
    const filter = {
      coeffs: new Float32Array(filterLength * phases),
      state: new Float32Array(filterLength),
      stateIndex: 0
    };

    // Design Kaiser window FIR lowpass
    const cutoff = 0.45; // Normalized frequency
    const beta = 8.0; // Kaiser beta

    for (let p = 0; p < phases; p++) {
      for (let i = 0; i < filterLength; i++) {
        const n = i * phases + p - (filterLength * phases - 1) / 2;
        let h;

        if (n === 0) {
          h = 2 * cutoff;
        } else {
          h = Math.sin(2 * Math.PI * cutoff * n) / (Math.PI * n);
        }

        // Apply Kaiser window
        const w = this.kaiser(i * phases + p, filterLength * phases, beta);
        filter.coeffs[p * filterLength + i] = h * w;
      }
    }

    return filter;
  }

  /**
   * Kaiser window function
   */
  kaiser(n, length, beta) {
    const alpha = (length - 1) / 2;
    const numerator = this.besselI0(beta * Math.sqrt(1 - Math.pow((n - alpha) / alpha, 2)));
    const denominator = this.besselI0(beta);
    return numerator / denominator;
  }

  /**
   * Modified Bessel function of first kind, order 0
   */
  besselI0(x) {
    let sum = 1.0;
    let term = 1.0;
    let k = 1;

    while (Math.abs(term) > 1e-10) {
      term *= (x / (2 * k)) * (x / (2 * k));
      sum += term;
      k++;
    }

    return sum;
  }

  /**
   * Create K-weighting shelf filter
   */
  createShelfFilter() {
    return {
      x1: 0, x2: 0,
      y1: 0, y2: 0,
      // Pre-calculated for 4Hz shelf at -4.5dB
      b0: 1.53512485958697,
      b1: -2.69169618940638,
      b2: 1.19839281085285,
      a1: -1.69065929318241,
      a2: 0.73248077421585
    };
  }

  /**
   * Create K-weighting highpass filter
   */
  createHighpassFilter() {
    return {
      x1: 0, x2: 0,
      y1: 0, y2: 0,
      // Pre-calculated for 38Hz highpass
      b0: 0.98621192462708,
      b1: -1.97242384925416,
      b2: 0.98621192462708,
      a1: -1.97223372919527,
      a2: 0.97261396931306
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
   * Set parameter
   */
  setParameter(name, value) {
    if (this.params.hasOwnProperty(name)) {
      this.params[name] = value;

      switch(name) {
        case 'release':
          this.updateTimeConstants();
          break;
        case 'lookahead':
          this.updateLookahead();
          break;
        case 'oversampling':
          this.updateOversampling();
          break;
      }
    }
  }

  /**
   * Update time constants
   */
  updateTimeConstants() {
    // Ultra-fast attack for brick-wall limiting
    const attackMs = 0.05; // 50 microseconds
    const attackSec = attackMs / 1000;
    this.attackCoeff = 1.0 - Math.exp(-2.2 / (this.oversampledRate * attackSec));

    // Release time
    const releaseSec = this.params.release / 1000;
    this.releaseCoeff = Math.exp(-1 / (this.oversampledRate * releaseSec));
  }

  /**
   * Update lookahead buffer
   */
  updateLookahead() {
    const newSize = Math.floor(this.params.lookahead * this.oversampledRate / 1000);
    if (newSize !== this.lookaheadSamples) {
      this.lookaheadSamples = newSize;
      this.delayLineL = new Float32Array(this.lookaheadSamples);
      this.delayLineR = new Float32Array(this.lookaheadSamples);
      this.delayIndex = 0;
    }
  }

  /**
   * Update oversampling
   */
  updateOversampling() {
    this.oversampleFactor = this.params.oversampling;
    this.oversampledRate = this.sampleRate * this.oversampleFactor;

    // Recreate filters
    this.upsampleFilterL = this.createPolyphaseFilter();
    this.upsampleFilterR = this.createPolyphaseFilter();
    this.downsampleFilterL = this.createPolyphaseFilter();
    this.downsampleFilterR = this.createPolyphaseFilter();

    // Resize buffers
    this.oversampledBufferL = new Float32Array(128 * this.oversampleFactor);
    this.oversampledBufferR = new Float32Array(128 * this.oversampleFactor);

    // Update time constants for new rate
    this.updateTimeConstants();
    this.updateLookahead();
  }

  /**
   * Upsample signal
   */
  upsample(input, filter, output) {
    const inputLength = input.length;
    const factor = this.oversampleFactor;

    for (let i = 0; i < inputLength; i++) {
      // Insert sample and zeros
      for (let j = 0; j < factor; j++) {
        const outIdx = i * factor + j;
        if (j === 0) {
          output[outIdx] = this.processPolyphaseFilter(input[i] * factor, filter, 0);
        } else {
          output[outIdx] = this.processPolyphaseFilter(0, filter, j);
        }
      }
    }
  }

  /**
   * Downsample signal
   */
  downsample(input, filter, output) {
    const factor = this.oversampleFactor;
    const outputLength = output.length;

    for (let i = 0; i < outputLength; i++) {
      let sum = 0;
      for (let j = 0; j < factor; j++) {
        sum += this.processPolyphaseFilter(input[i * factor + j], filter, j);
      }
      output[i] = sum;
    }
  }

  /**
   * Process polyphase filter
   */
  processPolyphaseFilter(input, filter, phase) {
    const filterLength = filter.state.length;

    // Update state
    filter.state[filter.stateIndex] = input;

    // Compute output for this phase
    let output = 0;
    const phaseOffset = phase * filterLength;

    for (let i = 0; i < filterLength; i++) {
      const stateIdx = (filter.stateIndex - i + filterLength) % filterLength;
      output += filter.state[stateIdx] * filter.coeffs[phaseOffset + i];
    }

    // Only advance state index on first phase
    if (phase === 0) {
      filter.stateIndex = (filter.stateIndex + 1) % filterLength;
    }

    return output;
  }

  /**
   * Detect true peak with oversampling
   */
  detectTruePeak(samples) {
    let peak = 0;
    for (let i = 0; i < samples.length; i++) {
      peak = Math.max(peak, Math.abs(samples[i]));
    }
    return peak;
  }

  /**
   * Calculate gain reduction based on algorithm
   */
  calculateGainReduction(peak) {
    const thresholdLinear = this.dbToLinear(this.params.threshold);
    const ceilingLinear = this.dbToLinear(this.params.ceiling);

    if (peak <= thresholdLinear) {
      return 1.0;
    }

    let targetGain;

    switch (this.params.algorithm) {
      case 'aggressive':
        // Hard limiting - immediate reduction to ceiling
        targetGain = ceilingLinear / peak;
        break;

      case 'smooth':
        // Soft knee limiting with wider transition
        const softKnee = 2.0; // dB
        const kneeStart = this.dbToLinear(this.params.threshold - softKnee);
        const kneeEnd = this.dbToLinear(this.params.threshold + softKnee);

        if (peak < kneeStart) {
          targetGain = 1.0;
        } else if (peak > kneeEnd) {
          targetGain = ceilingLinear / peak;
        } else {
          // Smooth transition in knee region
          const t = (peak - kneeStart) / (kneeEnd - kneeStart);
          const smoothGain = 1.0 + (ceilingLinear / peak - 1.0) * t * t;
          targetGain = smoothGain;
        }
        break;

      case 'transparent':
      default:
        // Minimal processing for transparent sound
        const ratio = 1000; // Very high ratio for limiting
        const overThreshold = peak - thresholdLinear;
        const reduction = overThreshold * (1 - 1 / ratio);
        targetGain = thresholdLinear / (thresholdLinear + reduction);

        // Ensure we don't exceed ceiling
        const peakAfterGain = peak * targetGain;
        if (peakAfterGain > ceilingLinear) {
          targetGain = ceilingLinear / peak;
        }
        break;
    }

    return Math.max(targetGain, 0.001); // Minimum -60dB reduction
  }

  /**
   * Apply K-weighting filters for loudness measurement
   */
  applyKWeighting(sample, filters) {
    // Stage 1: Shelf filter
    let output = filters.shelf.b0 * sample +
                filters.shelf.b1 * filters.shelf.x1 +
                filters.shelf.b2 * filters.shelf.x2 -
                filters.shelf.a1 * filters.shelf.y1 -
                filters.shelf.a2 * filters.shelf.y2;

    filters.shelf.x2 = filters.shelf.x1;
    filters.shelf.x1 = sample;
    filters.shelf.y2 = filters.shelf.y1;
    filters.shelf.y1 = output;

    // Stage 2: Highpass filter
    const input2 = output;
    output = filters.highpass.b0 * input2 +
            filters.highpass.b1 * filters.highpass.x1 +
            filters.highpass.b2 * filters.highpass.x2 -
            filters.highpass.a1 * filters.highpass.y1 -
            filters.highpass.a2 * filters.highpass.y2;

    filters.highpass.x2 = filters.highpass.x1;
    filters.highpass.x1 = input2;
    filters.highpass.y2 = filters.highpass.y1;
    filters.highpass.y1 = output;

    return output;
  }

  /**
   * Calculate momentary loudness (LUFS)
   */
  calculateLoudness(leftSample, rightSample) {
    // Apply K-weighting
    const leftWeighted = this.applyKWeighting(leftSample, this.kWeightingL);
    const rightWeighted = this.applyKWeighting(rightSample, this.kWeightingR);

    // Store in momentary buffer
    this.momentaryBufferL[this.momentaryIndex] = leftWeighted * leftWeighted;
    this.momentaryBufferR[this.momentaryIndex] = rightWeighted * rightWeighted;
    this.momentaryIndex = (this.momentaryIndex + 1) % this.momentaryBufferL.length;

    // Calculate mean square
    let sumL = 0, sumR = 0;
    for (let i = 0; i < this.momentaryBufferL.length; i++) {
      sumL += this.momentaryBufferL[i];
      sumR += this.momentaryBufferR[i];
    }

    const meanSquare = (sumL + sumR) / (2 * this.momentaryBufferL.length);

    // Convert to LUFS
    if (meanSquare > 0) {
      this.currentLUFS = -0.691 + 10 * Math.log10(meanSquare);
    } else {
      this.currentLUFS = -100;
    }

    return this.currentLUFS;
  }

  /**
   * Generate TPDF dither noise
   */
  generateDither() {
    // Triangular PDF dither (sum of two uniform random values)
    const uniform1 = Math.random() - 0.5;
    const uniform2 = Math.random() - 0.5;
    const ditherLevel = 0.5 / 8388608; // 24-bit dither level
    return (uniform1 + uniform2) * ditherLevel;
  }

  /**
   * Reset state
   */
  reset() {
    // Clear delay lines
    this.delayLineL.fill(0);
    this.delayLineR.fill(0);
    this.delayIndex = 0;

    // Clear peak history
    this.peakHistory.fill(0);
    this.peakHistoryIndex = 0;
    this.currentPeak = 0;

    // Reset envelopes
    this.envelope = 1.0;
    this.releaseEnvelope = 1.0;

    // Clear filters
    this.upsampleFilterL.state.fill(0);
    this.upsampleFilterR.state.fill(0);
    this.downsampleFilterL.state.fill(0);
    this.downsampleFilterR.state.fill(0);

    // Clear K-weighting filters
    this.kWeightingL.shelf.x1 = this.kWeightingL.shelf.x2 = 0;
    this.kWeightingL.shelf.y1 = this.kWeightingL.shelf.y2 = 0;
    this.kWeightingL.highpass.x1 = this.kWeightingL.highpass.x2 = 0;
    this.kWeightingL.highpass.y1 = this.kWeightingL.highpass.y2 = 0;
    this.kWeightingR.shelf.x1 = this.kWeightingR.shelf.x2 = 0;
    this.kWeightingR.shelf.y1 = this.kWeightingR.shelf.y2 = 0;
    this.kWeightingR.highpass.x1 = this.kWeightingR.highpass.x2 = 0;
    this.kWeightingR.highpass.y1 = this.kWeightingR.highpass.y2 = 0;

    // Clear loudness buffers
    this.momentaryBufferL.fill(0);
    this.momentaryBufferR.fill(0);
    this.momentaryIndex = 0;

    // Clear adaptive release
    this.transientMemory.fill(0);
    this.transientIndex = 0;

    // Reset metering
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
    this.truePeak = 0;
    this.maxGainReduction = 0;
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

    // Get input channels
    const inputL = input[0] || new Float32Array(blockSize);
    const inputR = (isStereo && input[1]) ? input[1] : inputL;

    // Upsample to oversampled rate
    this.upsample(inputL, this.upsampleFilterL, this.oversampledBufferL);
    this.upsample(inputR, this.upsampleFilterR, this.oversampledBufferR);

    // Process at oversampled rate
    const oversampledLength = blockSize * this.oversampleFactor;

    for (let i = 0; i < oversampledLength; i++) {
      const leftIn = this.oversampledBufferL[i];
      const rightIn = this.oversampledBufferR[i];

      // Get delayed samples
      const leftDelayed = this.delayLineL[this.delayIndex];
      const rightDelayed = this.delayLineR[this.delayIndex];

      // Store current input in delay line
      this.delayLineL[this.delayIndex] = leftIn;
      this.delayLineR[this.delayIndex] = rightIn;

      // Detect true peak on current input
      const peak = Math.max(Math.abs(leftIn), Math.abs(rightIn));

      // Update peak history
      this.peakHistory[this.peakHistoryIndex] = peak;
      this.peakHistoryIndex = (this.peakHistoryIndex + 1) % this.peakHoldSamples;

      // Find maximum peak in history window
      let maxPeak = 0;
      for (let j = 0; j < this.peakHoldSamples; j++) {
        maxPeak = Math.max(maxPeak, this.peakHistory[j]);
      }

      // Calculate gain reduction
      const targetGain = this.calculateGainReduction(maxPeak);

      // Adaptive release
      if (this.params.adaptiveRelease) {
        // Detect transients
        this.transientMemory[this.transientIndex] = peak;
        this.transientIndex = (this.transientIndex + 1) % this.transientMemory.length;

        let variance = 0;
        let mean = 0;
        for (let j = 0; j < this.transientMemory.length; j++) {
          mean += this.transientMemory[j];
        }
        mean /= this.transientMemory.length;

        for (let j = 0; j < this.transientMemory.length; j++) {
          variance += Math.pow(this.transientMemory[j] - mean, 2);
        }
        variance /= this.transientMemory.length;

        // Adjust release based on transient content
        this.adaptiveReleaseRatio = 1.0 + Math.sqrt(variance) * 2.0;
        this.adaptiveReleaseRatio = Math.min(this.adaptiveReleaseRatio, 3.0);
      }

      // Apply envelope with adaptive release
      if (targetGain < this.envelope) {
        // Attack
        this.envelope = this.envelope + this.attackCoeff * (targetGain - this.envelope);
      } else {
        // Release with adaptive factor
        const adaptiveReleaseCoeff = 1 - (1 - this.releaseCoeff) / this.adaptiveReleaseRatio;
        this.envelope = this.envelope + (1 - adaptiveReleaseCoeff) * (targetGain - this.envelope);
      }

      // Apply limiting
      const leftLimited = leftDelayed * this.envelope;
      const rightLimited = rightDelayed * this.envelope;

      // Store limited samples back
      this.oversampledBufferL[i] = leftLimited;
      this.oversampledBufferR[i] = rightLimited;

      // Update delay index
      this.delayIndex = (this.delayIndex + 1) % this.lookaheadSamples;

      // Track gain reduction
      const gainReductionDb = -20 * Math.log10(this.envelope);
      this.maxGainReduction = Math.max(this.maxGainReduction, gainReductionDb);
    }

    // Downsample back to original rate
    const outputL = output[0] || new Float32Array(blockSize);
    const outputR = output[1] || new Float32Array(blockSize);

    this.downsample(this.oversampledBufferL, this.downsampleFilterL, outputL);
    this.downsample(this.oversampledBufferR, this.downsampleFilterR, outputR);

    // Apply dithering if enabled
    if (this.params.dithering) {
      for (let i = 0; i < blockSize; i++) {
        outputL[i] += this.generateDither();
        if (isStereo) {
          outputR[i] += this.generateDither();
        }
      }
    }

    // Calculate loudness
    if (blockSize > 0) {
      this.calculateLoudness(outputL[0], outputR[0]);
    }

    // Update metering
    this.updateMetering(output, blockSize);

    // Track true peak
    this.truePeak = Math.max(
      this.detectTruePeak(this.oversampledBufferL),
      this.detectTruePeak(this.oversampledBufferR)
    );

    return true;
  }

  /**
   * Update metering
   */
  updateMetering(channels, blockSize) {
    if (!channels || channels.length === 0) return;

    // Calculate peak and RMS
    let leftSum = 0, rightSum = 0;
    this.leftPeak = 0;
    this.rightPeak = 0;

    if (channels[0]) {
      for (let i = 0; i < blockSize; i++) {
        const sample = channels[0][i];
        this.leftPeak = Math.max(this.leftPeak, Math.abs(sample));
        leftSum += sample * sample;
      }
      this.leftRMS = Math.sqrt(leftSum / blockSize);
    }

    if (channels[1]) {
      for (let i = 0; i < blockSize; i++) {
        const sample = channels[1][i];
        this.rightPeak = Math.max(this.rightPeak, Math.abs(sample));
        rightSum += sample * sample;
      }
      this.rightRMS = Math.sqrt(rightSum / blockSize);
    } else {
      this.rightPeak = this.leftPeak;
      this.rightRMS = this.leftRMS;
    }
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
        rightRMSDB: this.linearToDb(this.rightRMS),
        truePeak: this.truePeak,
        truePeakDB: this.linearToDb(this.truePeak),
        gainReduction: this.maxGainReduction,
        envelope: this.envelope,
        lufs: this.currentLUFS,
        adaptiveReleaseRatio: this.adaptiveReleaseRatio
      }
    });

    // Reset max gain reduction
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
registerProcessor('professional-limiter', ProfessionalLimiterProcessor);