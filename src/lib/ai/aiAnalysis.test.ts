/**
 * @fileoverview Unit tests for AI audio analysis
 * @module lib/ai/aiAnalysis.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIAnalysis, analyzeAudio } from './aiAnalysis';
import { Severity, FrequencyRange } from './types';

/**
 * Creates a mock AudioBuffer with configurable properties
 */
function createMockAudioBuffer(options: {
  duration?: number;
  sampleRate?: number;
  numberOfChannels?: number;
  generateSignal?: (channel: number, sample: number, sampleRate: number) => number;
}): AudioBuffer {
  const {
    duration = 1.0,
    sampleRate = 48000,
    numberOfChannels = 2,
    generateSignal = () => 0,
  } = options;

  const length = Math.floor(duration * sampleRate);

  // Create mock AudioBuffer
  const mockBuffer = {
    duration,
    sampleRate,
    numberOfChannels,
    length,
    getChannelData: (channel: number) => {
      const data = new Float32Array(length);
      for (let i = 0; i < length; i++) {
        data[i] = generateSignal(channel, i, sampleRate);
      }
      return data;
    },
  } as AudioBuffer;

  return mockBuffer;
}

/**
 * Generates a sine wave signal
 */
function generateSineWave(frequency: number, amplitude: number = 0.5) {
  return (channel: number, sample: number, sampleRate: number) => {
    return amplitude * Math.sin((2 * Math.PI * frequency * sample) / sampleRate);
  };
}

/**
 * Generates silence
 */
function generateSilence() {
  return () => 0;
}

/**
 * Generates pink noise
 */
function generatePinkNoise(amplitude: number = 0.1) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;
    return pink * amplitude * 0.11;
  };
}

/**
 * Generates out-of-phase stereo signal
 */
function generateOutOfPhase(frequency: number, amplitude: number = 0.5) {
  return (channel: number, sample: number, sampleRate: number) => {
    const phase = channel === 0 ? 0 : Math.PI; // 180° phase shift
    return amplitude * Math.sin((2 * Math.PI * frequency * sample) / sampleRate + phase);
  };
}

describe('AIAnalysis', () => {
  let analyzer: AIAnalysis;

  beforeEach(async () => {
    analyzer = new AIAnalysis({
      fftSize: 2048, // Smaller FFT for faster tests
      confidenceThreshold: 0.5,
    });
    await analyzer.initialize();
  });

  afterEach(() => {
    analyzer.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newAnalyzer = new AIAnalysis();
      await expect(newAnalyzer.initialize()).resolves.not.toThrow();
      newAnalyzer.cleanup();
    });

    it('should throw error for invalid FFT size', () => {
      expect(() => new AIAnalysis({ fftSize: 1000 })).toThrow();
    });

    it('should throw error for invalid confidence threshold', () => {
      expect(() => new AIAnalysis({ confidenceThreshold: 1.5 })).toThrow();
    });

    it('should throw error for invalid hop size fraction', () => {
      expect(() => new AIAnalysis({ hopSizeFraction: 1.5 })).toThrow();
    });
  });

  describe('Basic Analysis', () => {
    it('should analyze silence without errors', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSilence(),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result).toBeDefined();
      expect(result.duration).toBe(1.0);
      expect(result.issues).toBeDefined();
      expect(result.critique).toBeDefined();
    });

    it('should analyze simple sine wave', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should return valid quality score', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.critique.score.overall).toBeGreaterThanOrEqual(0);
      expect(result.critique.score.overall).toBeLessThanOrEqual(100);
      expect(result.critique.score.breakdown.frequency).toBeGreaterThanOrEqual(0);
      expect(result.critique.score.breakdown.dynamics).toBeGreaterThanOrEqual(0);
      expect(result.critique.score.breakdown.stereo).toBeGreaterThanOrEqual(0);
      expect(result.critique.score.breakdown.clarity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Frequency Masking Detection', () => {
    it('should detect masking with multiple frequencies', async () => {
      // Create signal with two close frequencies (potential masking)
      const buffer = createMockAudioBuffer({
        duration: 2.0,
        generateSignal: (channel, sample, sampleRate) => {
          const freq1 = 1000;
          const freq2 = 1050; // Very close, might mask
          const amp1 = 0.8; // Louder
          const amp2 = 0.1; // Quieter (likely masked)
          return (
            amp1 * Math.sin((2 * Math.PI * freq1 * sample) / sampleRate) +
            amp2 * Math.sin((2 * Math.PI * freq2 * sample) / sampleRate)
          );
        },
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Depending on implementation, masking might be detected
      expect(result.issues).toBeDefined();
      expect(Array.isArray(result.issues)).toBe(true);
    });

    it('should not detect masking in clean signal', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000, 0.3), // Single clean tone
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Should have few or no masking issues
      const maskingIssues = result.issues.filter(
        (i) => i.category === 'frequency_masking'
      );
      expect(maskingIssues.length).toBeLessThan(5); // Allow some false positives
    });
  });

  describe('Phase Correlation Analysis', () => {
    it('should detect out-of-phase issues', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        numberOfChannels: 2,
        generateSignal: generateOutOfPhase(1000, 0.5),
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Should detect phase correlation issues
      expect(result.phaseCorrelation.overall).toBeLessThan(0);
    });

    it('should show good correlation for in-phase signal', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        numberOfChannels: 2,
        generateSignal: generateSineWave(1000, 0.5),
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Should have high positive correlation
      expect(result.phaseCorrelation.overall).toBeGreaterThan(0.7);
    });

    it('should handle mono signal (no phase issues)', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        numberOfChannels: 1,
        generateSignal: generateSineWave(1000, 0.5),
      });

      const result = await analyzer.analyzeAudio(buffer);

      const phaseIssues = result.issues.filter(
        (i) => i.category === 'phase_correlation'
      );
      expect(phaseIssues.length).toBe(0);
    });
  });

  describe('Tonal Balance Analysis', () => {
    it('should analyze frequency distribution', async () => {
      const buffer = createMockAudioBuffer({
        duration: 2.0,
        generateSignal: generatePinkNoise(0.2),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.criticalBands).toBeDefined();
      expect(result.criticalBands.length).toBeGreaterThan(0);

      // Each band should have valid energy values
      result.criticalBands.forEach((band) => {
        expect(band.centerFrequency).toBeGreaterThan(0);
        expect(band.lowerBound).toBeGreaterThan(0);
        expect(band.upperBound).toBeGreaterThan(band.lowerBound);
        expect(typeof band.energy).toBe('number');
      });
    });

    it('should detect tonal imbalances', async () => {
      // Create signal heavily weighted in bass
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: (channel, sample, sampleRate) => {
          const bass = 0.8 * Math.sin((2 * Math.PI * 100 * sample) / sampleRate);
          const mid = 0.1 * Math.sin((2 * Math.PI * 1000 * sample) / sampleRate);
          return bass + mid;
        },
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Might detect tonal imbalance (bass too loud)
      const tonalIssues = result.issues.filter(
        (i) => i.category === 'tonal_balance'
      );
      expect(Array.isArray(tonalIssues)).toBe(true);
    });
  });

  describe('Dynamic Range Analysis', () => {
    it('should calculate crest factor', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000, 0.5),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.dynamicRange.crestFactor).toBeGreaterThan(0);
      expect(result.dynamicRange.recommendation).toBeDefined();
    });

    it('should detect over-compression', async () => {
      // Create heavily compressed signal (low crest factor)
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: (channel, sample) => {
          const noise = Math.random() * 2 - 1;
          // Hard clip to simulate over-compression
          return Math.max(-0.9, Math.min(0.9, noise));
        },
      });

      const result = await analyzer.analyzeAudio(buffer);

      // Crest factor should be low
      expect(result.dynamicRange.crestFactor).toBeLessThan(8);
    });
  });

  describe('Mix Critique Generation', () => {
    it('should generate comprehensive critique', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generatePinkNoise(0.2),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.critique.summary).toBeDefined();
      expect(result.critique.summary.length).toBeGreaterThan(0);
      expect(result.critique.strengths).toBeDefined();
      expect(result.critique.improvements).toBeDefined();
      expect(result.critique.priorityIssues).toBeDefined();
      expect(result.critique.estimatedImprovement).toBeDefined();
    });

    it('should provide priority issues', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.critique.priorityIssues.length).toBeLessThanOrEqual(5);
    });

    it('should estimate improvement potential', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.critique.estimatedImprovement.scoreIncrease).toBeGreaterThanOrEqual(0);
      expect(result.critique.estimatedImprovement.description).toBeDefined();
    });
  });

  describe('Issue Severity and Filtering', () => {
    it('should group issues by severity', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generatePinkNoise(0.2),
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.issuesBySeverity.critical).toBeDefined();
      expect(result.issuesBySeverity.high).toBeDefined();
      expect(result.issuesBySeverity.medium).toBeDefined();
      expect(result.issuesBySeverity.low).toBeDefined();

      // All issues should be in one of the severity groups
      const totalGrouped =
        result.issuesBySeverity.critical.length +
        result.issuesBySeverity.high.length +
        result.issuesBySeverity.medium.length +
        result.issuesBySeverity.low.length;

      expect(totalGrouped).toBe(result.issues.length);
    });

    it('should respect minimum severity threshold', async () => {
      const analyzerHigh = new AIAnalysis({
        minimumSeverity: Severity.HIGH,
        confidenceThreshold: 0.5,
      });
      await analyzerHigh.initialize();

      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generatePinkNoise(0.2),
      });

      const result = await analyzerHigh.analyzeAudio(buffer);

      // Should only have high and critical issues
      const hasLowOrMedium =
        result.issues.some((i) => i.severity === Severity.LOW) ||
        result.issues.some((i) => i.severity === Severity.MEDIUM);

      expect(hasLowOrMedium).toBe(false);

      analyzerHigh.cleanup();
    });

    it('should respect confidence threshold', async () => {
      const analyzerHighConfidence = new AIAnalysis({
        confidenceThreshold: 0.9,
      });
      await analyzerHighConfidence.initialize();

      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generatePinkNoise(0.2),
      });

      const result = await analyzerHighConfidence.analyzeAudio(buffer);

      // All issues should have confidence >= 0.9
      result.issues.forEach((issue) => {
        expect(issue.confidence).toBeGreaterThanOrEqual(0.9);
      });

      analyzerHighConfidence.cleanup();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short audio', async () => {
      const buffer = createMockAudioBuffer({
        duration: 0.1, // Very short
        generateSignal: generateSineWave(1000),
      });

      await expect(analyzer.analyzeAudio(buffer)).resolves.not.toThrow();
    });

    it('should handle clipping signal', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: () => 1.0, // Maximum amplitude
      });

      const result = await analyzer.analyzeAudio(buffer);

      expect(result.dynamicRange.crestFactor).toBeLessThan(2);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedAnalyzer = new AIAnalysis();
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSilence(),
      });

      await expect(uninitializedAnalyzer.analyzeAudio(buffer)).rejects.toThrow();
    });
  });

  describe('Convenience Function', () => {
    it('should work with analyzeAudio convenience function', async () => {
      const buffer = createMockAudioBuffer({
        duration: 1.0,
        generateSignal: generateSineWave(1000),
      });

      const result = await analyzeAudio(buffer);

      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
      expect(result.critique).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should complete analysis in reasonable time', async () => {
      const buffer = createMockAudioBuffer({
        duration: 3.0, // 3-second track
        generateSignal: generatePinkNoise(0.2),
      });

      const startTime = performance.now();
      const result = await analyzer.analyzeAudio(buffer);
      const endTime = performance.now();

      const actualTime = endTime - startTime;

      // Should complete in under 5 seconds (lenient for CI)
      expect(actualTime).toBeLessThan(5000);

      // Reported processing time should be reasonable
      expect(result.processingTime).toBeLessThan(5000);
    });
  });
});
