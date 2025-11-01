/**
 * @fileoverview Tonal balance analysis using reference curves
 * @module lib/ai/algorithms/tonalBalance
 * @description Analyzes frequency balance against professional reference curves
 * Implements ITU-R BS.1770 K-weighting and Fletcher-Munson equal loudness contours
 */

import {
  TonalIssue,
  Severity,
  IssueCategory,
  FrequencyRange,
  FrequencyBand,
  ReferenceCurve,
  CriticalBandEnergy,
} from '../types';

/**
 * Frequency bands for tonal balance analysis
 */
const TONAL_BALANCE_BANDS: FrequencyBand[] = [
  {
    name: FrequencyRange.SUB_BASS,
    lowerFreq: 20,
    upperFreq: 60,
    centerFreq: 40,
    expectedRange: { min: -30, max: -10, optimal: -18 },
  },
  {
    name: FrequencyRange.BASS,
    lowerFreq: 60,
    upperFreq: 250,
    centerFreq: 155,
    expectedRange: { min: -18, max: -6, optimal: -12 },
  },
  {
    name: FrequencyRange.LOW_MID,
    lowerFreq: 250,
    upperFreq: 500,
    centerFreq: 375,
    expectedRange: { min: -15, max: -3, optimal: -9 },
  },
  {
    name: FrequencyRange.MID,
    lowerFreq: 500,
    upperFreq: 2000,
    centerFreq: 1000,
    expectedRange: { min: -12, max: 0, optimal: -6 },
  },
  {
    name: FrequencyRange.HIGH_MID,
    lowerFreq: 2000,
    upperFreq: 4000,
    centerFreq: 2800,
    expectedRange: { min: -12, max: 0, optimal: -6 },
  },
  {
    name: FrequencyRange.PRESENCE,
    lowerFreq: 4000,
    upperFreq: 6000,
    centerFreq: 5000,
    expectedRange: { min: -15, max: -3, optimal: -9 },
  },
  {
    name: FrequencyRange.BRILLIANCE,
    lowerFreq: 6000,
    upperFreq: 20000,
    centerFreq: 10000,
    expectedRange: { min: -20, max: -8, optimal: -14 },
  },
];

/**
 * Severity thresholds for tonal imbalance (dB deviation)
 */
const TONAL_THRESHOLDS = {
  critical: 15, // >15 dB deviation
  high: 10, // >10 dB deviation
  medium: 6, // >6 dB deviation
  low: 3, // >3 dB deviation
};

/**
 * ITU-R BS.1770 K-weighting reference curve at 80 dB SPL
 * Frequencies and corresponding weights in dB
 */
const K_WEIGHTING_CURVE: ReferenceCurve = {
  name: 'ITU-R BS.1770 K-weighting',
  frequencies: [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
    1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
  ],
  levels: [
    -70, -60, -50, -40, -30, -23, -18, -14, -11, -8.5, -6.5, -5, -3.5, -2.5, -1.5, -0.5, 0, 0, 0,
    0.5, 1, 1.5, 2.5, 4, 5.5, 6.5, 7, 6.5, 5, 2, -2,
  ],
  description: 'K-weighting filter used for loudness measurement (ITU-R BS.1770-4)',
};

/**
 * Fletcher-Munson equal loudness contour at 80 phon
 */
const FLETCHER_MUNSON_80_PHON: ReferenceCurve = {
  name: 'Fletcher-Munson 80 phon',
  frequencies: [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250,
    1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000,
  ],
  levels: [
    -65, -55, -45, -35, -27, -20, -15, -11, -8, -6, -4.5, -3, -2, -1, -0.5, 0, 0, 0, 0, 1, 2, 3, 5,
    7, 8.5, 9, 9, 8, 6, 3, -1,
  ],
  description: 'Equal loudness contour at 80 phon (Fletcher-Munson)',
};

/**
 * Flat reference (0 dB at all frequencies)
 */
const FLAT_REFERENCE: ReferenceCurve = {
  name: 'Flat reference',
  frequencies: [20, 100, 1000, 10000, 20000],
  levels: [0, 0, 0, 0, 0],
  description: 'Flat frequency response (0 dB at all frequencies)',
};

/**
 * Analyzes tonal balance of audio buffer
 * @param audioBuffer - Audio buffer to analyze
 * @param referenceCurve - Reference curve type
 * @returns Array of tonal balance issues
 */
export function analyzeTonalBalance(
  audioBuffer: AudioBuffer,
  referenceCurve: 'k-weighting' | 'fletcher-munson' | 'flat' = 'k-weighting'
): TonalIssue[] {
  const issues: TonalIssue[] = [];

  // Select reference curve
  const reference = selectReferenceCurve(referenceCurve);

  // Calculate critical band energies
  const bandEnergies = calculateCriticalBandEnergies(audioBuffer);

  // Compare against reference
  for (const band of TONAL_BALANCE_BANDS) {
    const bandEnergy = findBandEnergy(bandEnergies, band);
    const expectedLevel = interpolateReferenceLevel(reference, band.centerFreq);
    const deviation = bandEnergy - expectedLevel;
    const absDeviation = Math.abs(deviation);

    // Check if deviation exceeds threshold
    if (absDeviation > TONAL_THRESHOLDS.low) {
      const severity = determineTonalSeverity(absDeviation);
      const confidence = calculateTonalConfidence(absDeviation, bandEnergy);

      if (confidence >= 0.6) {
        issues.push(
          createTonalIssue(
            band.name,
            bandEnergy,
            expectedLevel,
            deviation,
            severity,
            confidence
          )
        );
      }
    }
  }

  return issues;
}

/**
 * Selects reference curve based on type
 */
function selectReferenceCurve(type: 'k-weighting' | 'fletcher-munson' | 'flat'): ReferenceCurve {
  switch (type) {
    case 'k-weighting':
      return K_WEIGHTING_CURVE;
    case 'fletcher-munson':
      return FLETCHER_MUNSON_80_PHON;
    case 'flat':
      return FLAT_REFERENCE;
    default:
      return K_WEIGHTING_CURVE;
  }
}

/**
 * Calculates energy in critical frequency bands
 * @param audioBuffer - Audio buffer
 * @returns Array of critical band energies
 */
export function calculateCriticalBandEnergies(audioBuffer: AudioBuffer): CriticalBandEnergy[] {
  const sampleRate = audioBuffer.sampleRate;
  const fftSize = 8192;
  const numChannels = audioBuffer.numberOfChannels;

  // Get channel data and mix to mono
  const monoData = new Float32Array(audioBuffer.length);
  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < audioBuffer.length; i++) {
      monoData[i] += channelData[i] / numChannels;
    }
  }

  // Compute average spectrum across entire file
  const spectrum = computeAverageSpectrum(monoData, fftSize, sampleRate);

  // Calculate energy in each band
  const bandEnergies: CriticalBandEnergy[] = [];

  for (let bandIdx = 0; bandIdx < TONAL_BALANCE_BANDS.length; bandIdx++) {
    const band = TONAL_BALANCE_BANDS[bandIdx];
    const energy = calculateBandEnergy(spectrum, band.lowerFreq, band.upperFreq, sampleRate, fftSize);
    const energyDb = 20 * Math.log10(Math.max(energy, 1e-10));

    bandEnergies.push({
      band: bandIdx,
      centerFrequency: band.centerFreq,
      lowerBound: band.lowerFreq,
      upperBound: band.upperFreq,
      energy: energyDb,
      deviation: 0, // Will be calculated against reference
    });
  }

  return bandEnergies;
}

/**
 * Computes average magnitude spectrum across audio
 * @param audioData - Audio time domain data
 * @param fftSize - FFT size
 * @param sampleRate - Sample rate
 * @returns Average magnitude spectrum
 */
function computeAverageSpectrum(
  audioData: Float32Array,
  fftSize: number,
  sampleRate: number
): Float32Array {
  const hopSize = fftSize / 2;
  const numFrames = Math.floor((audioData.length - fftSize) / hopSize) + 1;
  const spectrum = new Float32Array(fftSize / 2);
  const window = createHanningWindow(fftSize);

  let frameCount = 0;

  for (let frame = 0; frame < numFrames; frame++) {
    const startSample = frame * hopSize;

    // Extract and window frame
    const frameData = new Float32Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      frameData[i] = (audioData[startSample + i] || 0) * window[i];
    }

    // Compute magnitude spectrum
    const frameMagnitude = computeMagnitudeSpectrum(frameData);

    // Accumulate
    for (let i = 0; i < spectrum.length; i++) {
      spectrum[i] += frameMagnitude[i];
    }

    frameCount++;
  }

  // Average
  for (let i = 0; i < spectrum.length; i++) {
    spectrum[i] /= frameCount;
  }

  return spectrum;
}

/**
 * Computes magnitude spectrum using DFT
 */
function computeMagnitudeSpectrum(timeData: Float32Array): Float32Array {
  const N = timeData.length;
  const magnitude = new Float32Array(N / 2);

  for (let k = 0; k < N / 2; k++) {
    let real = 0;
    let imag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      real += timeData[n] * Math.cos(angle);
      imag += timeData[n] * Math.sin(angle);
    }

    magnitude[k] = Math.sqrt(real * real + imag * imag) / N;
  }

  return magnitude;
}

/**
 * Calculates energy in a frequency band
 */
function calculateBandEnergy(
  spectrum: Float32Array,
  lowerFreq: number,
  upperFreq: number,
  sampleRate: number,
  fftSize: number
): number {
  const lowerBin = Math.floor((lowerFreq * fftSize) / sampleRate);
  const upperBin = Math.floor((upperFreq * fftSize) / sampleRate);

  let energy = 0;
  for (let i = lowerBin; i <= upperBin && i < spectrum.length; i++) {
    energy += spectrum[i] * spectrum[i];
  }

  return Math.sqrt(energy / (upperBin - lowerBin + 1));
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
 * Finds energy for a specific frequency band
 */
function findBandEnergy(bandEnergies: CriticalBandEnergy[], band: FrequencyBand): number {
  for (const be of bandEnergies) {
    if (Math.abs(be.centerFrequency - band.centerFreq) < 10) {
      return be.energy;
    }
  }
  return -96; // Default very quiet
}

/**
 * Interpolates reference level at a specific frequency
 */
function interpolateReferenceLevel(reference: ReferenceCurve, frequency: number): number {
  const { frequencies, levels } = reference;

  // Find surrounding points
  let lowerIdx = 0;
  let upperIdx = frequencies.length - 1;

  for (let i = 0; i < frequencies.length - 1; i++) {
    if (frequency >= frequencies[i] && frequency <= frequencies[i + 1]) {
      lowerIdx = i;
      upperIdx = i + 1;
      break;
    }
  }

  // Linear interpolation in log frequency domain
  const logFreq = Math.log10(frequency);
  const logLower = Math.log10(frequencies[lowerIdx]);
  const logUpper = Math.log10(frequencies[upperIdx]);

  const t = (logFreq - logLower) / (logUpper - logLower);
  return levels[lowerIdx] + t * (levels[upperIdx] - levels[lowerIdx]);
}

/**
 * Determines severity based on deviation
 */
function determineTonalSeverity(deviation: number): Severity {
  if (deviation >= TONAL_THRESHOLDS.critical) return Severity.CRITICAL;
  if (deviation >= TONAL_THRESHOLDS.high) return Severity.HIGH;
  if (deviation >= TONAL_THRESHOLDS.medium) return Severity.MEDIUM;
  return Severity.LOW;
}

/**
 * Calculates confidence for tonal issue
 */
function calculateTonalConfidence(deviation: number, energy: number): number {
  // Higher deviation = higher confidence
  const deviationConfidence = Math.min(deviation / TONAL_THRESHOLDS.critical, 1);

  // Very quiet bands have lower confidence
  const energyConfidence = energy > -60 ? 1.0 : Math.max(0.5, (energy + 96) / 36);

  return deviationConfidence * 0.7 + energyConfidence * 0.3;
}

/**
 * Creates a tonal issue object
 */
function createTonalIssue(
  frequencyRange: FrequencyRange,
  energyLevel: number,
  expectedLevel: number,
  deviation: number,
  severity: Severity,
  confidence: number
): TonalIssue {
  const type = deviation > 0 ? 'excessive' : 'deficient';

  return {
    category: IssueCategory.TONAL_BALANCE,
    severity,
    confidence,
    frequencyRange,
    deviation: Math.round(Math.abs(deviation) * 10) / 10,
    energyLevel: Math.round(energyLevel * 10) / 10,
    expectedLevel: Math.round(expectedLevel * 10) / 10,
    type,
    description: generateTonalDescription(frequencyRange, deviation, type),
    suggestion: generateTonalSuggestion(frequencyRange, deviation, type),
  };
}

/**
 * Generates human-readable description
 */
function generateTonalDescription(
  range: FrequencyRange,
  deviation: number,
  type: 'excessive' | 'deficient'
): string {
  const rangeStr = range.replace(/_/g, ' ');
  const absDeviation = Math.abs(deviation).toFixed(1);

  if (type === 'excessive') {
    return `${rangeStr} range is ${absDeviation} dB too loud compared to reference curve`;
  } else {
    return `${rangeStr} range is ${absDeviation} dB too quiet compared to reference curve`;
  }
}

/**
 * Generates actionable suggestion
 */
function generateTonalSuggestion(
  range: FrequencyRange,
  deviation: number,
  type: 'excessive' | 'deficient'
): string {
  const rangeStr = range.replace(/_/g, ' ');
  const absDeviation = Math.abs(deviation).toFixed(1);

  if (type === 'excessive') {
    return `Apply ${absDeviation} dB cut in ${rangeStr} range using EQ to improve tonal balance`;
  } else {
    return `Apply ${absDeviation} dB boost in ${rangeStr} range using EQ to improve tonal balance`;
  }
}

/**
 * Analyzes dynamic range
 * @param audioBuffer - Audio buffer
 * @returns Dynamic range analysis
 */
export function analyzeDynamicRange(audioBuffer: AudioBuffer): {
  crestFactor: number;
  peakToRMS: number;
  recommendation: string;
} {
  const numChannels = audioBuffer.numberOfChannels;
  let totalPeak = 0;
  let totalRMS = 0;

  for (let ch = 0; ch < numChannels; ch++) {
    const channelData = audioBuffer.getChannelData(ch);

    // Calculate peak
    let peak = 0;
    for (let i = 0; i < channelData.length; i++) {
      peak = Math.max(peak, Math.abs(channelData[i]));
    }

    // Calculate RMS
    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / channelData.length);

    totalPeak += peak;
    totalRMS += rms;
  }

  const avgPeak = totalPeak / numChannels;
  const avgRMS = totalRMS / numChannels;

  const crestFactor = 20 * Math.log10(avgPeak / avgRMS);
  const peakToRMS = crestFactor;

  let recommendation = '';
  if (crestFactor < 6) {
    recommendation = 'Very low dynamic range - mix may sound over-compressed or limited';
  } else if (crestFactor < 10) {
    recommendation = 'Good dynamic range for modern mastering';
  } else if (crestFactor < 15) {
    recommendation = 'Natural dynamic range - suitable for classical or jazz';
  } else {
    recommendation = 'Very high dynamic range - may benefit from gentle compression';
  }

  return {
    crestFactor: Math.round(crestFactor * 10) / 10,
    peakToRMS: Math.round(peakToRMS * 10) / 10,
    recommendation,
  };
}
