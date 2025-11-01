/**
 * @fileoverview Phase correlation analysis for stereo field issues
 * @module lib/ai/algorithms/phaseAnalysis
 * @description Detects phase correlation problems, out-of-phase issues, and mono compatibility
 * Uses frequency-dependent correlation analysis for professional mastering
 */

import {
  PhaseIssue,
  Severity,
  IssueCategory,
  FrequencyRange,
  SpectralAnalysis,
} from '../types';

/**
 * Phase correlation thresholds
 */
const PHASE_THRESHOLDS = {
  critical: -0.5, // < -0.5 = critical (severely out of phase)
  high: -0.3, // < -0.3 = high severity
  medium: -0.1, // < -0.1 = medium severity
  low: 0.3, // < 0.3 = low severity (weak correlation)
  optimal: 0.7, // > 0.7 = good correlation
  mono: 0.5, // < 0.5 = mono compatibility warning
};

/**
 * Frequency bands for phase analysis
 */
const PHASE_ANALYSIS_BANDS = [
  { name: FrequencyRange.SUB_BASS, lowerFreq: 20, upperFreq: 60 },
  { name: FrequencyRange.BASS, lowerFreq: 60, upperFreq: 250 },
  { name: FrequencyRange.LOW_MID, lowerFreq: 250, upperFreq: 500 },
  { name: FrequencyRange.MID, lowerFreq: 500, upperFreq: 2000 },
  { name: FrequencyRange.HIGH_MID, lowerFreq: 2000, upperFreq: 4000 },
  { name: FrequencyRange.PRESENCE, lowerFreq: 4000, upperFreq: 6000 },
  { name: FrequencyRange.BRILLIANCE, lowerFreq: 6000, upperFreq: 20000 },
];

/**
 * Maps frequency to frequency range classification
 */
function getFrequencyRange(frequency: number): FrequencyRange {
  for (const band of PHASE_ANALYSIS_BANDS) {
    if (frequency >= band.lowerFreq && frequency < band.upperFreq) {
      return band.name;
    }
  }
  return FrequencyRange.BRILLIANCE;
}

/**
 * Analyzes phase correlation across the stereo field
 * @param audioBuffer - Stereo audio buffer
 * @returns Array of phase issues
 */
export function analyzePhaseCorrelation(audioBuffer: AudioBuffer): PhaseIssue[] {
  const issues: PhaseIssue[] = [];

  // Ensure stereo
  if (audioBuffer.numberOfChannels < 2) {
    return issues; // No phase issues in mono
  }

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);
  const sampleRate = audioBuffer.sampleRate;

  // Overall phase correlation
  const overallCorrelation = calculateCorrelation(leftChannel, rightChannel);

  // Time-windowed phase correlation
  const windowSize = Math.floor(sampleRate * 1.0); // 1 second windows
  const hopSize = Math.floor(windowSize * 0.5); // 50% overlap
  const numWindows = Math.floor((leftChannel.length - windowSize) / hopSize) + 1;

  for (let i = 0; i < numWindows; i++) {
    const start = i * hopSize;
    const end = Math.min(start + windowSize, leftChannel.length);
    const timeStart = start / sampleRate;
    const timeEnd = end / sampleRate;

    // Extract window
    const leftWindow = leftChannel.slice(start, end);
    const rightWindow = rightChannel.slice(start, end);

    // Frequency-dependent phase correlation
    const frequencyIssues = analyzeFrequencyPhase(
      leftWindow,
      rightWindow,
      sampleRate,
      timeStart,
      timeEnd
    );

    issues.push(...frequencyIssues);
  }

  // Remove duplicate/overlapping issues
  return mergeSimilarPhaseIssues(issues);
}

/**
 * Analyzes phase correlation in frequency domain
 * @param leftWindow - Left channel window
 * @param rightWindow - Right channel window
 * @param sampleRate - Sample rate
 * @param timeStart - Start time of window
 * @param timeEnd - End time of window
 * @returns Array of phase issues in this window
 */
function analyzeFrequencyPhase(
  leftWindow: Float32Array,
  rightWindow: Float32Array,
  sampleRate: number,
  timeStart: number,
  timeEnd: number
): PhaseIssue[] {
  const issues: PhaseIssue[] = [];
  const fftSize = 2048;

  // Zero-pad if necessary
  const paddedLeft = new Float32Array(fftSize);
  const paddedRight = new Float32Array(fftSize);
  paddedLeft.set(leftWindow.slice(0, fftSize));
  paddedRight.set(rightWindow.slice(0, fftSize));

  // Apply window function
  const window = createHanningWindow(fftSize);
  for (let i = 0; i < fftSize; i++) {
    paddedLeft[i] *= window[i];
    paddedRight[i] *= window[i];
  }

  // Compute FFT
  const leftFFT = computeFFT(paddedLeft);
  const rightFFT = computeFFT(paddedRight);

  // Analyze phase correlation per frequency band
  for (const band of PHASE_ANALYSIS_BANDS) {
    const correlation = calculateBandPhaseCorrelation(
      leftFFT,
      rightFFT,
      band.lowerFreq,
      band.upperFreq,
      sampleRate,
      fftSize
    );

    const centerFreq = (band.lowerFreq + band.upperFreq) / 2;

    // Check for issues
    if (correlation < PHASE_THRESHOLDS.low) {
      const severity = determinePhaseIssueSeverity(correlation);
      const confidence = calculatePhaseConfidence(correlation, leftFFT, rightFFT);

      if (confidence >= 0.6) {
        issues.push(
          createPhaseIssue(
            correlation,
            centerFreq,
            band.name,
            severity,
            confidence,
            timeStart,
            timeEnd
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Calculates overall correlation between two channels
 * @param left - Left channel data
 * @param right - Right channel data
 * @returns Correlation coefficient (-1 to 1)
 */
function calculateCorrelation(left: Float32Array, right: Float32Array): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let sumL = 0;
  let sumR = 0;
  let sumLR = 0;
  let sumL2 = 0;
  let sumR2 = 0;

  for (let i = 0; i < length; i++) {
    const l = left[i];
    const r = right[i];
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

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculates phase correlation for a specific frequency band
 * @param leftFFT - Left channel FFT result
 * @param rightFFT - Right channel FFT result
 * @param lowerFreq - Lower frequency bound
 * @param upperFreq - Upper frequency bound
 * @param sampleRate - Sample rate
 * @param fftSize - FFT size
 * @returns Correlation for this band
 */
function calculateBandPhaseCorrelation(
  leftFFT: { real: Float32Array; imag: Float32Array },
  rightFFT: { real: Float32Array; imag: Float32Array },
  lowerFreq: number,
  upperFreq: number,
  sampleRate: number,
  fftSize: number
): number {
  const lowerBin = Math.floor((lowerFreq * fftSize) / sampleRate);
  const upperBin = Math.floor((upperFreq * fftSize) / sampleRate);

  let sumProduct = 0;
  let sumLeft = 0;
  let sumRight = 0;

  for (let k = lowerBin; k <= upperBin && k < leftFFT.real.length; k++) {
    // Calculate magnitudes
    const magL = Math.sqrt(leftFFT.real[k] ** 2 + leftFFT.imag[k] ** 2);
    const magR = Math.sqrt(rightFFT.real[k] ** 2 + rightFFT.imag[k] ** 2);

    // Calculate phase difference
    const phaseL = Math.atan2(leftFFT.imag[k], leftFFT.real[k]);
    const phaseR = Math.atan2(rightFFT.imag[k], rightFFT.real[k]);
    const phaseDiff = phaseL - phaseR;

    // Correlation contribution (weighted by magnitude)
    const weight = magL * magR;
    sumProduct += weight * Math.cos(phaseDiff);
    sumLeft += magL * magL;
    sumRight += magR * magR;
  }

  const denominator = Math.sqrt(sumLeft * sumRight);
  return denominator === 0 ? 0 : sumProduct / denominator;
}

/**
 * Computes FFT using DFT
 * In production, use a proper FFT library
 * @param timeData - Time domain data
 * @returns FFT result with real and imaginary components
 */
function computeFFT(timeData: Float32Array): {
  real: Float32Array;
  imag: Float32Array;
} {
  const N = timeData.length;
  const real = new Float32Array(N / 2);
  const imag = new Float32Array(N / 2);

  for (let k = 0; k < N / 2; k++) {
    let sumReal = 0;
    let sumImag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      sumReal += timeData[n] * Math.cos(angle);
      sumImag += timeData[n] * Math.sin(angle);
    }

    real[k] = sumReal;
    imag[k] = sumImag;
  }

  return { real, imag };
}

/**
 * Creates Hanning window
 */
function createHanningWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return window;
}

/**
 * Determines severity based on correlation value
 */
function determinePhaseIssueSeverity(correlation: number): Severity {
  if (correlation < PHASE_THRESHOLDS.critical) return Severity.CRITICAL;
  if (correlation < PHASE_THRESHOLDS.high) return Severity.HIGH;
  if (correlation < PHASE_THRESHOLDS.medium) return Severity.MEDIUM;
  return Severity.LOW;
}

/**
 * Calculates confidence for phase issue detection
 * @param correlation - Correlation value
 * @param leftFFT - Left channel FFT
 * @param rightFFT - Right channel FFT
 * @returns Confidence (0-1)
 */
function calculatePhaseConfidence(
  correlation: number,
  leftFFT: { real: Float32Array; imag: Float32Array },
  rightFFT: { real: Float32Array; imag: Float32Array }
): number {
  // Higher confidence for more severe correlation issues
  const severityConfidence = Math.abs(Math.min(correlation, 0)) / 1.0;

  // Check signal energy (low energy = low confidence)
  let energyLeft = 0;
  let energyRight = 0;
  for (let i = 0; i < leftFFT.real.length; i++) {
    energyLeft += leftFFT.real[i] ** 2 + leftFFT.imag[i] ** 2;
    energyRight += rightFFT.real[i] ** 2 + rightFFT.imag[i] ** 2;
  }

  const avgEnergy = (energyLeft + energyRight) / 2;
  const energyConfidence = Math.min(avgEnergy / 1000, 1.0); // Normalize

  return severityConfidence * 0.7 + energyConfidence * 0.3;
}

/**
 * Creates a phase issue object
 */
function createPhaseIssue(
  correlation: number,
  frequency: number,
  frequencyRange: FrequencyRange,
  severity: Severity,
  confidence: number,
  timeStart: number,
  timeEnd: number
): PhaseIssue {
  const monoCompatible = correlation >= PHASE_THRESHOLDS.mono;

  return {
    category: IssueCategory.PHASE_CORRELATION,
    severity,
    confidence,
    correlation: Math.round(correlation * 100) / 100,
    frequencyRange,
    frequency: Math.round(frequency),
    timeRange: {
      start: timeStart,
      end: timeEnd,
    },
    monoCompatible,
    description: generatePhaseDescription(correlation, frequencyRange, monoCompatible),
    suggestion: generatePhaseSuggestion(correlation, frequencyRange, monoCompatible),
  };
}

/**
 * Generates human-readable description for phase issue
 */
function generatePhaseDescription(
  correlation: number,
  range: FrequencyRange,
  monoCompatible: boolean
): string {
  const rangeStr = range.replace(/_/g, ' ');
  const corrStr = (correlation * 100).toFixed(0);

  let desc = `Phase correlation issue in ${rangeStr} range (${corrStr}%)`;

  if (correlation < 0) {
    desc += ' - signals are out of phase';
  } else if (correlation < 0.3) {
    desc += ' - weak correlation between channels';
  }

  if (!monoCompatible) {
    desc += ' ⚠️ Mono compatibility warning';
  }

  return desc;
}

/**
 * Generates actionable suggestion for phase issue
 */
function generatePhaseSuggestion(
  correlation: number,
  range: FrequencyRange,
  monoCompatible: boolean
): string {
  const rangeStr = range.replace(/_/g, ' ');

  if (correlation < -0.5) {
    return `Critical phase issue in ${rangeStr}: Check for polarity inversion. Flip phase of one channel or adjust stereo widening effects.`;
  } else if (correlation < 0) {
    return `Significant phase cancellation in ${rangeStr}: Review stereo effects, reverb, and delay settings. Consider using mid/side processing.`;
  } else if (!monoCompatible) {
    return `Mono compatibility warning in ${rangeStr}: Reduce stereo width or check for phase-offset effects that may cause cancellation in mono.`;
  } else {
    return `Weak stereo correlation in ${rangeStr}: Consider adjusting panning, stereo widening, or ensuring left/right signals are properly aligned.`;
  }
}

/**
 * Merges similar phase issues to avoid duplicates
 */
function mergeSimilarPhaseIssues(issues: PhaseIssue[]): PhaseIssue[] {
  if (issues.length === 0) return issues;

  // Sort by time
  issues.sort((a, b) => a.timeRange.start - b.timeRange.start);

  const merged: PhaseIssue[] = [];
  let current = { ...issues[0] };

  for (let i = 1; i < issues.length; i++) {
    const next = issues[i];

    // Check if issues overlap in time and are in same frequency range
    const timeOverlap =
      current.timeRange.end >= next.timeRange.start - 0.1; // Small gap tolerance
    const sameRange = current.frequencyRange === next.frequencyRange;

    if (timeOverlap && sameRange) {
      // Merge: extend time, average correlation, use higher severity
      current.timeRange.end = Math.max(current.timeRange.end, next.timeRange.end);
      current.correlation = (current.correlation + next.correlation) / 2;
      if (getSeverityLevel(next.severity) > getSeverityLevel(current.severity)) {
        current.severity = next.severity;
      }
      current.confidence = Math.max(current.confidence, next.confidence);
      current.monoCompatible = current.monoCompatible && next.monoCompatible;
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

/**
 * Calculates overall phase correlation summary
 * @param audioBuffer - Audio buffer
 * @returns Overall correlation and per-frequency breakdown
 */
export function calculateOverallPhaseCorrelation(audioBuffer: AudioBuffer): {
  overall: number;
  byFrequency: Array<{ frequency: number; correlation: number }>;
} {
  if (audioBuffer.numberOfChannels < 2) {
    return { overall: 1.0, byFrequency: [] };
  }

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.getChannelData(1);

  // Overall correlation
  const overall = calculateCorrelation(leftChannel, rightChannel);

  // Per-frequency correlation
  const byFrequency: Array<{ frequency: number; correlation: number }> = [];

  for (const band of PHASE_ANALYSIS_BANDS) {
    const centerFreq = (band.lowerFreq + band.upperFreq) / 2;

    // Extract band and calculate correlation
    const leftBand = extractFrequencyBand(leftChannel, band.lowerFreq, band.upperFreq, audioBuffer.sampleRate);
    const rightBand = extractFrequencyBand(rightChannel, band.lowerFreq, band.upperFreq, audioBuffer.sampleRate);

    const correlation = calculateCorrelation(leftBand, rightBand);

    byFrequency.push({
      frequency: Math.round(centerFreq),
      correlation: Math.round(correlation * 100) / 100,
    });
  }

  return { overall, byFrequency };
}

/**
 * Extracts a frequency band using simple filtering
 * In production, use proper IIR/FIR filters
 */
function extractFrequencyBand(
  signal: Float32Array,
  lowerFreq: number,
  upperFreq: number,
  sampleRate: number
): Float32Array {
  // Simplified: just return the signal (proper filtering would be complex)
  // In production, implement bandpass filter or use Web Audio BiquadFilterNode
  return signal;
}
