/**
 * Professional Mastering Compressor AudioWorklet Processor
 *
 * High-quality compressor with:
 * - RMS and Peak detection modes
 * - Lookahead buffer for transparent compression
 * - Sidechain high-pass filter
 * - Program-dependent release
 * - Soft knee with adjustable width
 * - Feed-forward and feedback modes
 * - Mix control (parallel compression)
 *
 * @author Professional Audio DSP Implementation
 */

class ProfessionalCompressorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();

    this.sampleRate = sampleRate;
    this.bypass = false;

    // Compressor Parameters
    this.params = {
      threshold: -12,       // dB
      ratio: 4,            // x:1
      attack: 10,          // ms
      release: 100,        // ms
      knee: 2,             // dB (soft knee width)
      makeupGain: 0,       // dB (auto-calculated by default)
      mix: 100,            // % (100 = full compression, 0 = dry)

      // Advanced parameters
      detectionMode: 'rms',     // 'peak' or 'rms'
      lookahead: 5,            // ms
      sidechainHPF: 0,         // Hz (0 = disabled)
      autoMakeup: true,        // Auto makeup gain
      programDependent: true,  // Program-dependent release
      feedbackMode: false      // Feedback vs feed-forward
    };

    // Initialize from options
    if (options.processorOptions) {
      Object.assign(this.params, options.processorOptions);
    }

    // Lookahead buffer (for smooth, transparent compression)
    this.lookaheadSamples = Math.floor(this.params.lookahead * this.sampleRate / 1000);
    this.lookaheadBufferL = new Float32Array(this.lookaheadSamples);
    this.lookaheadBufferR = new Float32Array(this.lookaheadSamples);
    this.lookaheadIndex = 0;

    // RMS detection window
    this.rmsWindowMs = 10; // 10ms RMS window (adjustable)
    this.rmsWindowSize = Math.floor(this.rmsWindowMs * this.sampleRate / 1000);
    this.rmsBuffer = new Float32Array(this.rmsWindowSize);
    this.rmsIndex = 0;
    this.rmsSum = 0;

    // Sidechain high-pass filter (prevents bass pumping)
    this.sidechainHPF = {
      x1: 0, x2: 0,
      y1: 0, y2: 0,
      b0: 1, b1: 0, b2: 0,
      a1: 0, a2: 0
    };
    this.updateSidechainFilter();

    // Envelope followers
    this.envelope = 1.0;              // Current gain envelope
    this.targetGain = 1.0;            // Target gain
    this.gainReduction = 0;           // Current GR in dB
    this.maxGainReduction = 0;        // Peak GR for metering

    // Program-dependent release
    this.releaseEnvelope = 0;         // Envelope for release time modulation
    this.peakMemory = new Float32Array(48); // 1ms of peak history at 48kHz
    this.peakMemoryIndex = 0;

    // Attack/release coefficients
    this.attackCoeff = 0;
    this.releaseCoeff = 0;
    this.updateTimeConstants();

    // Auto-makeup gain calculation
    this.autoMakeupGain = 1.0;
    if (this.params.autoMakeup) {
      this.calculateAutoMakeup();
    }

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
   * Set parameter and update related values
   */
  setParameter(name, value) {
    if (this.params.hasOwnProperty(name)) {
      this.params[name] = value;

      // Update dependent parameters
      switch(name) {
        case 'attack':
        case 'release':
          this.updateTimeConstants();
          break;

        case 'lookahead':
          this.updateLookahead();
          break;

        case 'sidechainHPF':
          this.updateSidechainFilter();
          break;

        case 'threshold':
        case 'ratio':
          if (this.params.autoMakeup) {
            this.calculateAutoMakeup();
          }
          break;

        case 'autoMakeup':
          if (value) {
            this.calculateAutoMakeup();
          }
          break;
      }
    }
  }

  /**
   * Update time constants for attack and release
   */
  updateTimeConstants() {
    // Convert ms to seconds
    const attackSec = this.params.attack / 1000;
    const releaseSec = this.params.release / 1000;

    // Use different calculation for very fast times
    if (this.params.attack < 1) {
      // For ultra-fast attack, use linear coefficient
      this.attackCoeff = 1.0 - Math.exp(-2.2 / (this.sampleRate * attackSec));
    } else {
      // Standard exponential
      this.attackCoeff = Math.exp(-1 / (this.sampleRate * attackSec));
    }

    this.releaseCoeff = Math.exp(-1 / (this.sampleRate * releaseSec));
  }

  /**
   * Update lookahead buffer size
   */
  updateLookahead() {
    const newSize = Math.floor(this.params.lookahead * this.sampleRate / 1000);

    if (newSize !== this.lookaheadSamples) {
      this.lookaheadSamples = newSize;
      this.lookaheadBufferL = new Float32Array(this.lookaheadSamples);
      this.lookaheadBufferR = new Float32Array(this.lookaheadSamples);
      this.lookaheadIndex = 0;
    }
  }

  /**
   * Update sidechain high-pass filter
   * Prevents bass frequencies from triggering compression
   */
  updateSidechainFilter() {
    const freq = this.params.sidechainHPF;

    if (freq <= 0) {
      // Disabled - set to all-pass
      this.sidechainHPF.b0 = 1;
      this.sidechainHPF.b1 = 0;
      this.sidechainHPF.b2 = 0;
      this.sidechainHPF.a1 = 0;
      this.sidechainHPF.a2 = 0;
      return;
    }

    // 2nd-order Butterworth high-pass
    const w = 2 * Math.PI * freq / this.sampleRate;
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const alpha = sinw / Math.sqrt(2); // Q = 0.707 for Butterworth

    const a0 = 1 + alpha;
    this.sidechainHPF.b0 = (1 + cosw) / 2 / a0;
    this.sidechainHPF.b1 = -(1 + cosw) / a0;
    this.sidechainHPF.b2 = (1 + cosw) / 2 / a0;
    this.sidechainHPF.a1 = -2 * cosw / a0;
    this.sidechainHPF.a2 = (1 - alpha) / a0;
  }

  /**
   * Process sidechain filter
   */
  processSidechainFilter(input) {
    const output = this.sidechainHPF.b0 * input +
                  this.sidechainHPF.b1 * this.sidechainHPF.x1 +
                  this.sidechainHPF.b2 * this.sidechainHPF.x2 -
                  this.sidechainHPF.a1 * this.sidechainHPF.y1 -
                  this.sidechainHPF.a2 * this.sidechainHPF.y2;

    this.sidechainHPF.x2 = this.sidechainHPF.x1;
    this.sidechainHPF.x1 = input;
    this.sidechainHPF.y2 = this.sidechainHPF.y1;
    this.sidechainHPF.y1 = output;

    return output;
  }

  /**
   * Calculate auto-makeup gain
   * Estimates the average gain reduction and compensates
   */
  calculateAutoMakeup() {
    // Estimate average gain reduction at -18dB input
    const referenceLevel = -18; // dB
    const overThreshold = referenceLevel - this.params.threshold;

    if (overThreshold > 0) {
      // Calculate gain reduction
      const gainReduction = overThreshold * (1 - 1 / this.params.ratio);
      this.autoMakeupGain = Math.pow(10, gainReduction * 0.5 / 20); // 50% compensation
    } else {
      this.autoMakeupGain = 1.0;
    }
  }

  /**
   * Detect signal level (RMS or Peak)
   */
  detectLevel(leftSample, rightSample) {
    // Get max of stereo channels
    const stereoMax = Math.max(Math.abs(leftSample), Math.abs(rightSample));

    // Apply sidechain filter if enabled
    let detectionSignal = stereoMax;
    if (this.params.sidechainHPF > 0) {
      detectionSignal = Math.abs(this.processSidechainFilter(stereoMax));
    }

    if (this.params.detectionMode === 'rms') {
      // RMS detection with moving average
      const squared = detectionSignal * detectionSignal;

      // Update RMS sum
      this.rmsSum -= this.rmsBuffer[this.rmsIndex];
      this.rmsSum += squared;
      this.rmsBuffer[this.rmsIndex] = squared;
      this.rmsIndex = (this.rmsIndex + 1) % this.rmsWindowSize;

      // Calculate RMS
      return Math.sqrt(this.rmsSum / this.rmsWindowSize);
    } else {
      // Peak detection
      return detectionSignal;
    }
  }

  /**
   * Calculate gain reduction with soft knee
   * Professional soft-knee characteristic for smooth compression
   */
  computeGainReduction(inputLevel) {
    if (inputLevel < 1e-10) {
      return 1.0;
    }

    const inputDb = 20 * Math.log10(inputLevel);
    const threshold = this.params.threshold;
    const ratio = this.params.ratio;
    const knee = this.params.knee;

    // Soft knee calculation
    if (knee > 0) {
      // Check if we're in the knee region
      if (inputDb > threshold - knee && inputDb < threshold + knee) {
        // Quadratic interpolation in knee region
        const kneeRange = 2 * knee;
        const x = (inputDb - threshold + knee) / kneeRange;

        // Smooth transition using quadratic curve
        const kneeRatio = 1 + (ratio - 1) * x * x;
        const kneeFactor = (inputDb - threshold) / kneeRatio;
        const outputDb = threshold + kneeFactor;

        return Math.pow(10, (outputDb - inputDb) / 20);
      }
    }

    // Outside knee region - standard compression
    if (inputDb <= threshold) {
      return 1.0; // No compression
    }

    // Above threshold - apply ratio
    const gainReductionDb = (inputDb - threshold) * (1 - 1 / ratio);
    return Math.pow(10, -gainReductionDb / 20);
  }

  /**
   * Smooth envelope with program-dependent release
   */
  smoothEnvelope(targetGain) {
    let actualReleaseCoeff = this.releaseCoeff;

    // Program-dependent release
    if (this.params.programDependent) {
      // Analyze recent peak activity
      let peakVariance = 0;
      for (let i = 0; i < this.peakMemory.length; i++) {
        peakVariance += Math.abs(this.peakMemory[i] - this.releaseEnvelope);
      }
      peakVariance /= this.peakMemory.length;

      // Faster release for transient material, slower for sustained
      const adaptiveFactor = 1 + peakVariance * 10;
      actualReleaseCoeff = 1 - (1 - this.releaseCoeff) * Math.min(adaptiveFactor, 3);
    }

    // Smooth attack/release
    if (targetGain < this.envelope) {
      // Attack
      if (this.params.attack < 1) {
        // Ultra-fast attack for limiting behavior
        this.envelope = targetGain;
      } else {
        this.envelope = this.attackCoeff * this.envelope + (1 - this.attackCoeff) * targetGain;
      }
    } else {
      // Release
      this.envelope = actualReleaseCoeff * this.envelope + (1 - actualReleaseCoeff) * targetGain;
    }

    return this.envelope;
  }

  /**
   * Reset state
   */
  reset() {
    this.envelope = 1.0;
    this.targetGain = 1.0;
    this.gainReduction = 0;
    this.maxGainReduction = 0;

    // Clear buffers
    this.lookaheadBufferL.fill(0);
    this.lookaheadBufferR.fill(0);
    this.lookaheadIndex = 0;

    this.rmsBuffer.fill(0);
    this.rmsSum = 0;
    this.rmsIndex = 0;

    this.peakMemory.fill(0);
    this.peakMemoryIndex = 0;

    // Clear filter states
    this.sidechainHPF.x1 = 0;
    this.sidechainHPF.x2 = 0;
    this.sidechainHPF.y1 = 0;
    this.sidechainHPF.y2 = 0;

    // Clear metering
    this.leftPeak = 0;
    this.rightPeak = 0;
    this.leftRMS = 0;
    this.rightRMS = 0;
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

    // Process parameters
    const makeupGain = this.params.autoMakeup ?
      this.autoMakeupGain * this.dbToLinear(this.params.makeupGain) :
      this.dbToLinear(this.params.makeupGain);
    const mixWet = this.params.mix / 100;
    const mixDry = 1 - mixWet;

    // Process block
    for (let i = 0; i < blockSize; i++) {
      // Get input samples
      const leftIn = input[0] ? input[0][i] : 0;
      const rightIn = (isStereo && input[1]) ? input[1][i] : leftIn;

      // Get delayed samples from lookahead buffer
      const leftDelayed = this.lookaheadBufferL[this.lookaheadIndex];
      const rightDelayed = this.lookaheadBufferR[this.lookaheadIndex];

      // Store current input in lookahead buffer
      this.lookaheadBufferL[this.lookaheadIndex] = leftIn;
      this.lookaheadBufferR[this.lookaheadIndex] = rightIn;

      // Detect level (on current input for lookahead to work)
      let detectionLevel;
      if (this.params.feedbackMode && i > 0) {
        // Feedback mode - detect on previous output
        detectionLevel = this.detectLevel(
          output[0][i-1] || 0,
          output[1] ? output[1][i-1] : output[0][i-1]
        );
      } else {
        // Feed-forward mode
        detectionLevel = this.detectLevel(leftIn, rightIn);
      }

      // Update peak memory for program-dependent release
      this.peakMemory[this.peakMemoryIndex] = detectionLevel;
      this.peakMemoryIndex = (this.peakMemoryIndex + 1) % this.peakMemory.length;
      this.releaseEnvelope = this.releaseEnvelope * 0.9 + detectionLevel * 0.1;

      // Calculate gain reduction
      const targetGain = this.computeGainReduction(detectionLevel);

      // Smooth with envelope
      const gain = this.smoothEnvelope(targetGain);

      // Track gain reduction
      const gainReductionDb = 20 * Math.log10(gain);
      this.gainReduction = -gainReductionDb;
      this.maxGainReduction = Math.max(this.maxGainReduction, this.gainReduction);

      // Apply compression to delayed signal
      const leftCompressed = leftDelayed * gain * makeupGain;
      const rightCompressed = rightDelayed * gain * makeupGain;

      // Mix dry and wet
      const leftOut = leftDelayed * mixDry + leftCompressed * mixWet;
      const rightOut = rightDelayed * mixDry + rightCompressed * mixWet;

      // Output
      if (output[0]) {
        output[0][i] = leftOut;
      }
      if (output[1]) {
        output[1][i] = rightOut;
      }

      // Update lookahead index
      this.lookaheadIndex = (this.lookaheadIndex + 1) % this.lookaheadSamples;
    }

    this.updateMetering(output, blockSize);
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
        gainReduction: this.gainReduction,
        maxGainReduction: this.maxGainReduction,
        envelope: this.envelope
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
registerProcessor('professional-compressor', ProfessionalCompressorProcessor);