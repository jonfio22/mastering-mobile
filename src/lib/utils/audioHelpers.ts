/**
 * @fileoverview Professional audio utility functions for mastering applications
 * @module utils/audioHelpers
 * @description Provides utilities for sample rate conversion, bit depth handling,
 * format validation, dBFS conversions, and audio analysis
 */

import {
  SampleRate,
  BitDepth,
  AudioFormat,
  AudioFileValidation,
  AudioEngineError,
  AudioErrorType,
} from '../types/audio';

/**
 * Supported sample rates for professional audio work
 */
export const SUPPORTED_SAMPLE_RATES = [44100, 48000, 88200, 96000, 176400, 192000];

/**
 * Supported bit depths for audio processing
 */
export const SUPPORTED_BIT_DEPTHS = [16, 24, 32];

/**
 * Supported audio file formats with their MIME types
 */
export const AUDIO_MIME_TYPES: Record<string, AudioFormat> = {
  'audio/wav': AudioFormat.WAV,
  'audio/wave': AudioFormat.WAV,
  'audio/x-wav': AudioFormat.WAV,
  'audio/aiff': AudioFormat.AIFF,
  'audio/x-aiff': AudioFormat.AIFF,
  'audio/flac': AudioFormat.FLAC,
  'audio/x-flac': AudioFormat.FLAC,
  'audio/mpeg': AudioFormat.MP3,
  'audio/mp3': AudioFormat.MP3,
  'audio/aac': AudioFormat.AAC,
  'audio/ogg': AudioFormat.OGG,
  'audio/vorbis': AudioFormat.OGG,
};

/**
 * Audio file extensions mapped to formats
 */
export const AUDIO_EXTENSIONS: Record<string, AudioFormat> = {
  'wav': AudioFormat.WAV,
  'wave': AudioFormat.WAV,
  'aif': AudioFormat.AIFF,
  'aiff': AudioFormat.AIFF,
  'aifc': AudioFormat.AIFF,
  'flac': AudioFormat.FLAC,
  'mp3': AudioFormat.MP3,
  'aac': AudioFormat.AAC,
  'm4a': AudioFormat.AAC,
  'ogg': AudioFormat.OGG,
  'oga': AudioFormat.OGG,
};

/**
 * Minimum amplitude to be considered as signal (not silence)
 * -60 dBFS threshold
 */
const SILENCE_THRESHOLD = 0.001; // -60 dBFS

/**
 * Clipping threshold (0 dBFS)
 */
const CLIPPING_THRESHOLD = 1.0;

/**
 * Sample rate validation and conversion utilities
 */
export const SampleRateUtils = {
  /**
   * Validates if a sample rate is supported
   * @param sampleRate - Sample rate to validate
   * @returns True if sample rate is supported
   */
  isSupported(sampleRate: number): boolean {
    return SUPPORTED_SAMPLE_RATES.includes(sampleRate);
  },

  /**
   * Gets the nearest supported sample rate
   * @param sampleRate - Target sample rate
   * @returns Nearest supported sample rate
   */
  getNearestSupported(sampleRate: number): SampleRate {
    if (this.isSupported(sampleRate)) {
      return sampleRate as SampleRate;
    }

    let nearest = SUPPORTED_SAMPLE_RATES[0];
    let minDiff = Math.abs(sampleRate - nearest);

    for (const supported of SUPPORTED_SAMPLE_RATES) {
      const diff = Math.abs(sampleRate - supported);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = supported;
      }
    }

    return nearest as SampleRate;
  },

  /**
   * Validates sample rate or throws error
   * @param sampleRate - Sample rate to validate
   * @throws {Error} If sample rate is not supported
   */
  validate(sampleRate: number): void {
    if (!this.isSupported(sampleRate)) {
      throw new Error(
        `Unsupported sample rate: ${sampleRate}. Supported rates: ${SUPPORTED_SAMPLE_RATES.join(', ')}`
      );
    }
  },

  /**
   * Checks if sample rate conversion is needed
   * @param sourceSR - Source sample rate
   * @param targetSR - Target sample rate
   * @returns True if conversion is needed
   */
  needsConversion(sourceSR: number, targetSR: number): boolean {
    return sourceSR !== targetSR;
  },
};

/**
 * Bit depth utilities
 */
export const BitDepthUtils = {
  /**
   * Validates if a bit depth is supported
   * @param bitDepth - Bit depth to validate
   * @returns True if bit depth is supported
   */
  isSupported(bitDepth: number): boolean {
    return SUPPORTED_BIT_DEPTHS.includes(bitDepth);
  },

  /**
   * Gets the maximum amplitude for a given bit depth
   * @param bitDepth - Bit depth
   * @returns Maximum amplitude value
   */
  getMaxAmplitude(bitDepth: BitDepth): number {
    return Math.pow(2, bitDepth - 1) - 1;
  },

  /**
   * Converts normalized float value to integer sample
   * @param value - Normalized value (-1.0 to 1.0)
   * @param bitDepth - Target bit depth
   * @returns Integer sample value
   */
  floatToInt(value: number, bitDepth: BitDepth): number {
    const max = this.getMaxAmplitude(bitDepth);
    return Math.max(-max - 1, Math.min(max, Math.round(value * max)));
  },

  /**
   * Converts integer sample to normalized float value
   * @param value - Integer sample value
   * @param bitDepth - Source bit depth
   * @returns Normalized float value
   */
  intToFloat(value: number, bitDepth: BitDepth): number {
    const max = this.getMaxAmplitude(bitDepth);
    return value / max;
  },

  /**
   * Calculates dynamic range for bit depth (in dB)
   * @param bitDepth - Bit depth
   * @returns Dynamic range in dB
   */
  getDynamicRange(bitDepth: BitDepth): number {
    return bitDepth * 6.02 + 1.76; // Theoretical SNR formula
  },
};

/**
 * Audio format validation utilities
 */
export const AudioFormatUtils = {
  /**
   * Validates an audio file
   * @param file - File to validate
   * @returns Validation result
   */
  validateFile(file: File): AudioFileValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size (warn if > 500MB)
    if (file.size > 500 * 1024 * 1024) {
      warnings.push('File size exceeds 500MB, processing may be slow');
    }

    // Check file size (error if > 2GB)
    if (file.size > 2 * 1024 * 1024 * 1024) {
      errors.push('File size exceeds 2GB limit');
    }

    // Detect format from MIME type
    let format = AUDIO_MIME_TYPES[file.type];

    // If MIME type not recognized, try extension
    if (!format) {
      const extension = this.getFileExtension(file.name);
      format = AUDIO_EXTENSIONS[extension];

      if (!format) {
        errors.push(`Unsupported audio format: ${file.type || extension}`);
      } else {
        warnings.push('Format detected from file extension, MIME type not recognized');
      }
    }

    return {
      isValid: errors.length === 0,
      format,
      fileSize: file.size,
      mimeType: file.type,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },

  /**
   * Gets file extension from filename
   * @param filename - Filename
   * @returns File extension (lowercase, without dot)
   */
  getFileExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  },

  /**
   * Checks if format is lossless
   * @param format - Audio format
   * @returns True if lossless
   */
  isLossless(format: AudioFormat): boolean {
    return [AudioFormat.WAV, AudioFormat.AIFF, AudioFormat.FLAC].includes(format);
  },

  /**
   * Gets recommended bit depth for format
   * @param format - Audio format
   * @returns Recommended bit depth
   */
  getRecommendedBitDepth(format: AudioFormat): BitDepth {
    switch (format) {
      case AudioFormat.WAV:
      case AudioFormat.AIFF:
      case AudioFormat.FLAC:
        return BitDepth.BIT_24;
      case AudioFormat.MP3:
      case AudioFormat.AAC:
      case AudioFormat.OGG:
        return BitDepth.BIT_16;
      default:
        return BitDepth.BIT_24;
    }
  },
};

/**
 * dBFS (Decibels relative to Full Scale) conversion utilities
 */
export const dBFSUtils = {
  /**
   * Converts linear amplitude to dBFS
   * @param amplitude - Linear amplitude (0.0 to 1.0)
   * @returns dBFS value (-Infinity to 0)
   */
  linearToDb(amplitude: number): number {
    if (amplitude <= 0) {
      return -Infinity;
    }
    return 20 * Math.log10(amplitude);
  },

  /**
   * Converts dBFS to linear amplitude
   * @param db - dBFS value
   * @returns Linear amplitude (0.0 to 1.0)
   */
  dbToLinear(db: number): number {
    if (db === -Infinity) {
      return 0;
    }
    return Math.pow(10, db / 20);
  },

  /**
   * Converts gain in dB to linear multiplier
   * @param gainDb - Gain in dB
   * @returns Linear gain multiplier
   */
  gainToLinear(gainDb: number): number {
    return Math.pow(10, gainDb / 20);
  },

  /**
   * Converts linear gain to dB
   * @param gain - Linear gain multiplier
   * @returns Gain in dB
   */
  linearToGain(gain: number): number {
    if (gain <= 0) {
      return -Infinity;
    }
    return 20 * Math.log10(gain);
  },

  /**
   * Clamps dBFS value to valid range
   * @param db - dBFS value
   * @param min - Minimum dBFS (default: -96)
   * @param max - Maximum dBFS (default: 0)
   * @returns Clamped dBFS value
   */
  clamp(db: number, min = -96, max = 0): number {
    if (db === -Infinity) {
      return min;
    }
    return Math.max(min, Math.min(max, db));
  },
};

/**
 * Audio analysis utilities
 */
export const AnalysisUtils = {
  /**
   * Calculates RMS (Root Mean Square) level of audio buffer
   * @param buffer - Audio buffer channel data
   * @param startSample - Start sample index (default: 0)
   * @param numSamples - Number of samples to analyze (default: all)
   * @returns RMS value (linear amplitude)
   */
  calculateRMS(
    buffer: Float32Array,
    startSample = 0,
    numSamples?: number
  ): number {
    const end = numSamples
      ? Math.min(startSample + numSamples, buffer.length)
      : buffer.length;
    const length = end - startSample;

    if (length <= 0) {
      return 0;
    }

    let sum = 0;
    for (let i = startSample; i < end; i++) {
      sum += buffer[i] * buffer[i];
    }

    return Math.sqrt(sum / length);
  },

  /**
   * Finds peak amplitude in audio buffer
   * @param buffer - Audio buffer channel data
   * @param startSample - Start sample index (default: 0)
   * @param numSamples - Number of samples to analyze (default: all)
   * @returns Peak amplitude (linear, absolute value)
   */
  findPeak(
    buffer: Float32Array,
    startSample = 0,
    numSamples?: number
  ): number {
    const end = numSamples
      ? Math.min(startSample + numSamples, buffer.length)
      : buffer.length;

    let peak = 0;
    for (let i = startSample; i < end; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > peak) {
        peak = abs;
      }
    }

    return peak;
  },

  /**
   * Detects clipping samples in buffer
   * @param buffer - Audio buffer channel data
   * @param threshold - Clipping threshold (default: 1.0)
   * @returns Number of clipped samples
   */
  detectClipping(buffer: Float32Array, threshold = CLIPPING_THRESHOLD): number {
    let count = 0;
    for (let i = 0; i < buffer.length; i++) {
      if (Math.abs(buffer[i]) >= threshold) {
        count++;
      }
    }
    return count;
  },

  /**
   * Detects silence regions in audio buffer
   * @param buffer - Audio buffer channel data
   * @param sampleRate - Sample rate
   * @param threshold - Silence threshold (default: -60 dBFS)
   * @param minDuration - Minimum silence duration in seconds (default: 0.1)
   * @returns Array of silence regions with start and end times in seconds
   */
  detectSilence(
    buffer: Float32Array,
    sampleRate: number,
    threshold = SILENCE_THRESHOLD,
    minDuration = 0.1
  ): Array<{ start: number; end: number }> {
    const minSamples = Math.floor(minDuration * sampleRate);
    const regions: Array<{ start: number; end: number }> = [];
    let silenceStart = -1;

    for (let i = 0; i < buffer.length; i++) {
      const isSilent = Math.abs(buffer[i]) < threshold;

      if (isSilent && silenceStart === -1) {
        silenceStart = i;
      } else if (!isSilent && silenceStart !== -1) {
        const duration = i - silenceStart;
        if (duration >= minSamples) {
          regions.push({
            start: silenceStart / sampleRate,
            end: i / sampleRate,
          });
        }
        silenceStart = -1;
      }
    }

    // Handle silence at end of file
    if (silenceStart !== -1) {
      const duration = buffer.length - silenceStart;
      if (duration >= minSamples) {
        regions.push({
          start: silenceStart / sampleRate,
          end: buffer.length / sampleRate,
        });
      }
    }

    return regions;
  },

  /**
   * Calculates DC offset (average sample value)
   * @param buffer - Audio buffer channel data
   * @returns DC offset value
   */
  calculateDCOffset(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum / buffer.length;
  },

  /**
   * Calculates stereo correlation between left and right channels
   * @param leftBuffer - Left channel data
   * @param rightBuffer - Right channel data
   * @returns Correlation coefficient (-1 to 1)
   * -1: completely out of phase, 0: uncorrelated, 1: identical
   */
  calculateStereoCorrelation(
    leftBuffer: Float32Array,
    rightBuffer: Float32Array
  ): number {
    const length = Math.min(leftBuffer.length, rightBuffer.length);
    if (length === 0) {
      return 0;
    }

    let sumL = 0;
    let sumR = 0;
    let sumLR = 0;
    let sumL2 = 0;
    let sumR2 = 0;

    for (let i = 0; i < length; i++) {
      const l = leftBuffer[i];
      const r = rightBuffer[i];
      sumL += l;
      sumR += r;
      sumLR += l * r;
      sumL2 += l * l;
      sumR2 += r * r;
    }

    const meanL = sumL / length;
    const meanR = sumR / length;

    const numerator = sumLR / length - meanL * meanR;
    const denominator = Math.sqrt(
      (sumL2 / length - meanL * meanL) * (sumR2 / length - meanR * meanR)
    );

    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  },

  /**
   * Calculates crest factor (peak to RMS ratio) in dB
   * @param buffer - Audio buffer channel data
   * @returns Crest factor in dB
   */
  calculateCrestFactor(buffer: Float32Array): number {
    const peak = this.findPeak(buffer);
    const rms = this.calculateRMS(buffer);

    if (rms === 0) {
      return 0;
    }

    return dBFSUtils.linearToDb(peak / rms);
  },
};

/**
 * LUFS (Loudness Units relative to Full Scale) preparation utilities
 * Note: Full LUFS implementation requires K-weighting filter, which will be
 * implemented in AudioWorklet for proper performance
 */
export const LUFSUtils = {
  /**
   * Creates K-weighting filter coefficients for LUFS measurement
   * These coefficients implement the ITU-R BS.1770-4 standard
   * @param sampleRate - Sample rate
   * @returns Filter coefficients { b: feedforward, a: feedback }
   */
  getKWeightingCoefficients(sampleRate: number): {
    stage1: { b: number[]; a: number[] };
    stage2: { b: number[]; a: number[] };
  } {
    // Pre-calculated coefficients for common sample rates
    // Stage 1: High-shelf filter at 1500 Hz
    // Stage 2: High-pass filter at 38 Hz

    // These are approximations - actual implementation should be in AudioWorklet
    const nyquist = sampleRate / 2;

    return {
      stage1: {
        b: [1.53512485958697, -2.69169618940638, 1.19839281085285],
        a: [1.0, -1.69065929318241, 0.73248077421585],
      },
      stage2: {
        b: [1.0, -2.0, 1.0],
        a: [1.0, -1.99004745483398, 0.99007225036621],
      },
    };
  },

  /**
   * Calculates gating block size for LUFS measurement
   * @param sampleRate - Sample rate
   * @param blockType - Block type ('momentary' or 'short-term')
   * @returns Block size in samples
   */
  getGatingBlockSize(
    sampleRate: number,
    blockType: 'momentary' | 'short-term'
  ): number {
    // Momentary: 400ms, Short-term: 3s
    const duration = blockType === 'momentary' ? 0.4 : 3.0;
    return Math.floor(sampleRate * duration);
  },

  /**
   * Calculates overlap for LUFS gating blocks
   * @param sampleRate - Sample rate
   * @param blockType - Block type ('momentary' or 'short-term')
   * @returns Overlap size in samples (75% overlap)
   */
  getGatingBlockOverlap(
    sampleRate: number,
    blockType: 'momentary' | 'short-term'
  ): number {
    return Math.floor(this.getGatingBlockSize(sampleRate, blockType) * 0.75);
  },
};

/**
 * Error handling utilities
 */
export const ErrorUtils = {
  /**
   * Creates an AudioEngineError
   * @param type - Error type
   * @param message - Error message
   * @param originalError - Original error object
   * @param context - Additional context
   * @returns AudioEngineError object
   */
  createError(
    type: AudioErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): AudioEngineError {
    return {
      type,
      message,
      originalError,
      timestamp: Date.now(),
      context,
    };
  },

  /**
   * Formats error for user display
   * @param error - AudioEngineError
   * @returns User-friendly error message
   */
  formatErrorMessage(error: AudioEngineError): string {
    const timestamp = new Date(error.timestamp).toLocaleTimeString();
    let message = `[${timestamp}] ${error.message}`;

    if (error.originalError) {
      message += `\nDetails: ${error.originalError.message}`;
    }

    return message;
  },
};

/**
 * Performance utilities
 */
export const PerformanceUtils = {
  /**
   * Calculates optimal buffer size based on sample rate and latency
   * @param sampleRate - Sample rate
   * @param targetLatencyMs - Target latency in milliseconds
   * @returns Buffer size (power of 2)
   */
  calculateBufferSize(sampleRate: number, targetLatencyMs: number): number {
    const samplesNeeded = (sampleRate * targetLatencyMs) / 1000;
    // Round up to nearest power of 2
    return Math.pow(2, Math.ceil(Math.log2(samplesNeeded)));
  },

  /**
   * Estimates processing latency
   * @param bufferSize - Buffer size
   * @param sampleRate - Sample rate
   * @returns Estimated latency in milliseconds
   */
  estimateLatency(bufferSize: number, sampleRate: number): number {
    return (bufferSize / sampleRate) * 1000;
  },
};
