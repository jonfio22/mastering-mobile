/**
 * @fileoverview Frequency masking detection using spectral analysis and critical bands
 * @module lib/ai/algorithms/frequencyMasking
 * @description Detects frequency masking issues where one frequency component obscures another
 * Based on psychoacoustic principles and critical band theory (Bark scale)
 */

import {
  MaskingIssue,
  Severity,
  IssueCategory,
  FrequencyRange,
  SpectralAnalysis,
  MaskingThreshold,
} from '../types';

/**
 * Critical band boundaries based on Bark scale (24 bands)
 * Each band represents a critical bandwidth in human hearing
 */
const CRITICAL_BANDS = [
  { bark: 0, centerFreq: 50, lowerFreq: 20, upperFreq: 100 },
  { bark: 1, centerFreq: 150, lowerFreq: 100, upperFreq: 200 },
  { bark: 2, centerFreq: 250, lowerFreq: 200, upperFreq: 300 },
  { bark: 3, centerFreq: 350, lowerFreq: 300, upperFreq: 400 },
  { bark: 4, centerFreq: 450, lowerFreq: 400, upperFreq: 510 },
  { bark: 5, centerFreq: 570, lowerFreq: 510, upperFreq: 630 },
  { bark: 6, centerFreq: 700, lowerFreq: 630, upperFreq: 770 },
  { bark: 7, centerFreq: 840, lowerFreq: 770, upperFreq: 920 },
  { bark: 8, centerFreq: 1000, lowerFreq: 920, upperFreq: 1080 },
  { bark: 9, centerFreq: 1170, lowerFreq: 1080, upperFreq: 1270 },
  { bark: 10, centerFreq: 1370, lowerFreq: 1270, upperFreq: 1480 },
  { bark: 11, centerFreq: 1600, lowerFreq: 1480, upperFreq: 1720 },
  { bark: 12, centerFreq: 1850, lowerFreq: 1720, upperFreq: 2000 },
  { bark: 13, centerFreq: 2150, lowerFreq: 2000, upperFreq: 2320 },
  { bark: 14, centerFreq: 2500, lowerFreq: 2320, upperFreq: 2700 },
  { bark: 15, centerFreq: 2900, lowerFreq: 2700, upperFreq: 3150 },
  { bark: 16, centerFreq: 3400, lowerFreq: 3150, upperFreq: 3700 },
  { bark: 17, centerFreq: 4000, lowerFreq: 3700, upperFreq: 4400 },
  { bark: 18, centerFreq: 4800, lowerFreq: 4400, upperFreq: 5300 },
  { bark: 19, centerFreq: 5800, lowerFreq: 5300, upperFreq: 6400 },
  { bark: 20, centerFreq: 7000, lowerFreq: 6400, upperFreq: 7700 },
  { bark: 21, centerFreq: 8500, lowerFreq: 7700, upperFreq: 9500 },
  { bark: 22, centerFreq: 10500, lowerFreq: 9500, upperFreq: 12000 },
  { bark: 23, centerFreq: 13500, lowerFreq: 12000, upperFreq: 15500 },
];

/**
 * Masking spread function parameters
 * These define how masking spreads across frequency
 */
const MASKING_SPREAD = {
  lowerSlope: -27, // dB per Bark below masker
  upperSlope: -12, // dB per Bark above masker
  selfMaskingOffset: 6, // dB reduction at masker frequency
};

/**
 * Thresholds for issue detection
 */
const MASKING_THRESHOLDS = {
  critical: 20, // >20 dB masking ratio = critical
  high: 15, // >15 dB = high severity
  medium: 10, // >10 dB = medium severity
  low: 6, // >6 dB = low severity
  minConfidence: 0.6, // Minimum confidence to report
};

/**
 * Converts frequency to Bark scale
 * @param frequency - Frequency in Hz
 * @returns Bark value
 */
function frequencyToBark(frequency: number): number {
  // Traunmüller formula
  return 26.81 * frequency / (1960 + frequency) - 0.53;
}

/**
 * Converts Bark scale to frequency
 * @param bark - Bark value
 * @returns Frequency in Hz
 */
function barkToFrequency(bark: number): number {
  return 1960 * (bark + 0.53) / (26.28 - bark);
}

/**
 * Finds the critical band index for a given frequency
 * @param frequency - Frequency in Hz
 * @returns Critical band object
 */
function findCriticalBand(frequency: number) {
  for (let i = 0; i < CRITICAL_BANDS.length; i++) {
    const band = CRITICAL_BANDS[i];
    if (frequency >= band.lowerFreq && frequency < band.upperFreq) {
      return band;
    }
  }
  // Return highest band if frequency is above range
  return CRITICAL_BANDS[CRITICAL_BANDS.length - 1];
}

/**
 * Maps frequency to frequency range classification
 * @param frequency - Frequency in Hz
 * @returns Frequency range enum
 */
function getFrequencyRange(frequency: number): FrequencyRange {
  if (frequency < 60) return FrequencyRange.SUB_BASS;
  if (frequency < 250) return FrequencyRange.BASS;
  if (frequency < 500) return FrequencyRange.LOW_MID;
  if (frequency < 2000) return FrequencyRange.MID;
  if (frequency < 4000) return FrequencyRange.HIGH_MID;
  if (frequency < 6000) return FrequencyRange.PRESENCE;
  return FrequencyRange.BRILLIANCE;
}

/**
 * Calculates masking threshold for a frequency bin
 * @param maskerBark - Bark value of masking frequency
 * @param maskerLevel - Level of masker in dB
 * @param targetBark - Bark value of target frequency
 * @returns Masking threshold in dB
 */
function calculateMaskingThreshold(
  maskerBark: number,
  maskerLevel: number,
  targetBark: number
): number {
  const barkDiff = targetBark - maskerBark;

  if (Math.abs(barkDiff) < 0.1) {
    // Same critical band - self masking
    return maskerLevel - MASKING_SPREAD.selfMaskingOffset;
  } else if (barkDiff < 0) {
    // Target is below masker - use lower slope
    return maskerLevel + MASKING_SPREAD.lowerSlope * Math.abs(barkDiff);
  } else {
    // Target is above masker - use upper slope
    return maskerLevel + MASKING_SPREAD.upperSlope * barkDiff;
  }
}

/**
 * Performs FFT analysis on audio buffer
 * @param audioBuffer - Audio buffer to analyze
 * @param fftSize - FFT size (power of 2)
 * @param hopSizeFraction - Hop size as fraction of FFT size
 * @returns Spectral analysis data
 */
export function performSpectralAnalysis(
  audioBuffer: AudioBuffer,
  fftSize: number = 8192,
  hopSizeFraction: number = 0.25
): SpectralAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const hopSize = Math.floor(fftSize * hopSizeFraction);
  const numChannels = audioBuffer.numberOfChannels;

  // Get channel data
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(audioBuffer.getChannelData(ch));
  }

  // Calculate number of frames
  const numFrames = Math.floor((channelData[0].length - fftSize) / hopSize) + 1;

  // Storage for results
  const magnitudes: Float32Array[] = [];
  const timeStamps: number[] = [];

  // Create frequency bins
  const numBins = fftSize / 2;
  const frequencies: number[] = [];
  for (let i = 0; i < numBins; i++) {
    frequencies.push((i * sampleRate) / fftSize);
  }

  // Hanning window for FFT
  const window = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  // Process each frame
  for (let frame = 0; frame < numFrames; frame++) {
    const startSample = frame * hopSize;
    const timeStamp = startSample / sampleRate;
    timeStamps.push(timeStamp);

    // Sum across all channels for mono analysis
    const frameData = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += channelData[ch][startSample + i] || 0;
      }
      frameData[i] = (sum / numChannels) * window[i];
    }

    // Perform FFT (using built-in or simple DFT)
    const magnitude = performFFT(frameData);
    magnitudes.push(magnitude);
  }

  return {
    magnitudes,
    frequencies,
    timeStamps,
    fftSize,
    hopSize,
    sampleRate,
  };
}

/**
 * Simplified FFT implementation using DFT
 * In production, this should use a proper FFT library or Web Audio AnalyserNode
 * @param timeData - Time domain data
 * @returns Magnitude spectrum in dB
 */
function performFFT(timeData: Float32Array): Float32Array {
  const N = timeData.length;
  const magnitude = new Float32Array(N / 2);

  // Simplified DFT (this should be replaced with proper FFT for performance)
  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      real += timeData[n] * Math.cos(angle);
      imag += timeData[n] * Math.sin(angle);
    }

    // Convert to magnitude in dB
    const mag = Math.sqrt(real * real + imag * imag) / N;
    magnitude[k] = mag > 0 ? 20 * Math.log10(mag) : -120;
  }

  return magnitude;
}

/**
 * Detects frequency masking issues in spectral analysis
 * @param spectralAnalysis - Spectral analysis data
 * @param confidenceThreshold - Minimum confidence to report (0-1)
 * @returns Array of masking issues
 */
export function detectFrequencyMasking(
  spectralAnalysis: SpectralAnalysis,
  confidenceThreshold: number = 0.6
): MaskingIssue[] {
  const issues: MaskingIssue[] = [];
  const { magnitudes, frequencies, timeStamps, sampleRate } = spectralAnalysis;

  // Analyze each time frame
  for (let frameIdx = 0; frameIdx < magnitudes.length; frameIdx++) {
    const magnitude = magnitudes[frameIdx];
    const timeStamp = timeStamps[frameIdx];

    // Find peaks in spectrum (potential maskers)
    const peaks = findSpectralPeaks(magnitude, frequencies);

    // For each peak, calculate masking threshold
    for (const peak of peaks) {
      const maskerFreq = peak.frequency;
      const maskerLevel = peak.level;
      const maskerBark = frequencyToBark(maskerFreq);

      // Check all frequency bins for masked content
      for (let i = 0; i < frequencies.length; i++) {
        const targetFreq = frequencies[i];
        const targetLevel = magnitude[i];
        const targetBark = frequencyToBark(targetFreq);

        // Skip if same frequency or target is very quiet
        if (Math.abs(targetFreq - maskerFreq) < 10 || targetLevel < -80) {
          continue;
        }

        // Calculate masking threshold
        const threshold = calculateMaskingThreshold(maskerBark, maskerLevel, targetBark);

        // Check if target is masked
        const maskingRatio = threshold - targetLevel;

        if (maskingRatio > MASKING_THRESHOLDS.low) {
          // Potential masking issue found
          const severity = determineSeverity(maskingRatio);
          const confidence = calculateConfidence(maskingRatio, peak.prominence);

          if (confidence >= confidenceThreshold) {
            const issue = createMaskingIssue(
              maskerFreq,
              targetFreq,
              maskingRatio,
              severity,
              confidence,
              timeStamp,
              frameIdx,
              timeStamps
            );

            // Check if we already have a similar issue (avoid duplicates)
            if (!hasSimilarIssue(issues, issue)) {
              issues.push(issue);
            }
          }
        }
      }
    }
  }

  // Merge overlapping issues in time
  return mergeTemporalIssues(issues);
}

/**
 * Finds spectral peaks (potential maskers)
 * @param magnitude - Magnitude spectrum
 * @param frequencies - Frequency bins
 * @returns Array of peaks
 */
function findSpectralPeaks(
  magnitude: Float32Array,
  frequencies: number[]
): Array<{ frequency: number; level: number; prominence: number }> {
  const peaks: Array<{ frequency: number; level: number; prominence: number }> = [];
  const minPeakLevel = -60; // dBFS minimum to consider
  const minProminence = 6; // dB above surrounding bins

  for (let i = 2; i < magnitude.length - 2; i++) {
    const level = magnitude[i];

    if (level < minPeakLevel) continue;

    // Check if this is a local maximum
    if (
      level > magnitude[i - 1] &&
      level > magnitude[i + 1] &&
      level > magnitude[i - 2] &&
      level > magnitude[i + 2]
    ) {
      // Calculate prominence
      const surrounding = [
        magnitude[i - 2],
        magnitude[i - 1],
        magnitude[i + 1],
        magnitude[i + 2],
      ];
      const avgSurrounding = surrounding.reduce((a, b) => a + b, 0) / surrounding.length;
      const prominence = level - avgSurrounding;

      if (prominence >= minProminence) {
        peaks.push({
          frequency: frequencies[i],
          level,
          prominence,
        });
      }
    }
  }

  return peaks;
}

/**
 * Determines severity based on masking ratio
 * @param maskingRatio - Masking ratio in dB
 * @returns Severity level
 */
function determineSeverity(maskingRatio: number): Severity {
  if (maskingRatio >= MASKING_THRESHOLDS.critical) return Severity.CRITICAL;
  if (maskingRatio >= MASKING_THRESHOLDS.high) return Severity.HIGH;
  if (maskingRatio >= MASKING_THRESHOLDS.medium) return Severity.MEDIUM;
  return Severity.LOW;
}

/**
 * Calculates confidence score for masking detection
 * @param maskingRatio - Masking ratio in dB
 * @param prominence - Peak prominence
 * @returns Confidence (0-1)
 */
function calculateConfidence(maskingRatio: number, prominence: number): number {
  // Higher masking ratio and prominence = higher confidence
  const ratioConfidence = Math.min(maskingRatio / MASKING_THRESHOLDS.critical, 1);
  const prominenceConfidence = Math.min(prominence / 12, 1);
  return (ratioConfidence * 0.7 + prominenceConfidence * 0.3);
}

/**
 * Creates a masking issue object
 */
function createMaskingIssue(
  maskerFreq: number,
  maskedFreq: number,
  maskingRatio: number,
  severity: Severity,
  confidence: number,
  timeStamp: number,
  frameIdx: number,
  timeStamps: number[]
): MaskingIssue {
  const frequencyRange = getFrequencyRange(maskedFreq);

  // Calculate time range (current frame ± 0.1s)
  const frameDuration = frameIdx < timeStamps.length - 1
    ? timeStamps[frameIdx + 1] - timeStamps[frameIdx]
    : 0.1;

  return {
    category: IssueCategory.FREQUENCY_MASKING,
    severity,
    confidence,
    frequencyRange,
    frequencies: {
      masking: Math.round(maskerFreq),
      masked: Math.round(maskedFreq),
    },
    maskingRatio: Math.round(maskingRatio * 10) / 10,
    timeRange: {
      start: Math.max(0, timeStamp - 0.05),
      end: timeStamp + frameDuration + 0.05,
    },
    description: generateDescription(maskerFreq, maskedFreq, maskingRatio, frequencyRange),
    suggestion: generateSuggestion(maskerFreq, maskedFreq, frequencyRange),
  };
}

/**
 * Generates human-readable description
 */
function generateDescription(
  maskerFreq: number,
  maskedFreq: number,
  maskingRatio: number,
  range: FrequencyRange
): string {
  const maskerStr = `${Math.round(maskerFreq)} Hz`;
  const maskedStr = `${Math.round(maskedFreq)} Hz`;
  const rangeStr = range.replace(/_/g, ' ');

  return `Frequency masking detected in ${rangeStr} range: ${maskerStr} is masking ${maskedStr} by ${maskingRatio.toFixed(1)} dB`;
}

/**
 * Generates actionable suggestion
 */
function generateSuggestion(
  maskerFreq: number,
  maskedFreq: number,
  range: FrequencyRange
): string {
  const maskerStr = `${Math.round(maskerFreq)} Hz`;
  const maskedStr = `${Math.round(maskedFreq)} Hz`;

  if (maskerFreq < maskedFreq) {
    return `Consider reducing energy around ${maskerStr} or boosting ${maskedStr} to improve clarity`;
  } else {
    return `Consider reducing energy around ${maskerStr} to reveal content at ${maskedStr}`;
  }
}

/**
 * Checks if a similar issue already exists
 */
function hasSimilarIssue(issues: MaskingIssue[], newIssue: MaskingIssue): boolean {
  return issues.some(
    (issue) =>
      Math.abs(issue.frequencies.masking - newIssue.frequencies.masking) < 50 &&
      Math.abs(issue.frequencies.masked - newIssue.frequencies.masked) < 50 &&
      Math.abs(issue.timeRange.start - newIssue.timeRange.start) < 1.0
  );
}

/**
 * Merges overlapping issues in time
 */
function mergeTemporalIssues(issues: MaskingIssue[]): MaskingIssue[] {
  if (issues.length === 0) return issues;

  // Sort by time
  issues.sort((a, b) => a.timeRange.start - b.timeRange.start);

  const merged: MaskingIssue[] = [];
  let current = { ...issues[0] };

  for (let i = 1; i < issues.length; i++) {
    const next = issues[i];

    // Check if issues overlap in time and frequency
    const timeOverlap = current.timeRange.end >= next.timeRange.start;
    const freqSimilar =
      Math.abs(current.frequencies.masking - next.frequencies.masking) < 100 &&
      Math.abs(current.frequencies.masked - next.frequencies.masked) < 100;

    if (timeOverlap && freqSimilar) {
      // Merge: extend time range, use higher severity
      current.timeRange.end = Math.max(current.timeRange.end, next.timeRange.end);
      if (getSeverityLevel(next.severity) > getSeverityLevel(current.severity)) {
        current.severity = next.severity;
      }
      current.confidence = Math.max(current.confidence, next.confidence);
    } else {
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Gets numeric severity level for comparison
 */
function getSeverityLevel(severity: Severity): number {
  switch (severity) {
    case Severity.LOW:
      return 1;
    case Severity.MEDIUM:
      return 2;
    case Severity.HIGH:
      return 3;
    case Severity.CRITICAL:
      return 4;
    default:
      return 0;
  }
}
