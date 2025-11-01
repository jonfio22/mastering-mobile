/**
 * @fileoverview Core AI-powered audio analysis engine
 * @module lib/ai/aiAnalysis
 * @description Professional audio analysis system for mastering applications
 * Provides comprehensive analysis including frequency masking, phase correlation,
 * tonal balance, and mix critique - all running client-side
 */

import {
  AnalysisResult,
  AnalysisConfig,
  AudioIssue,
  Severity,
  IssueCategory,
} from './types';

import {
  performSpectralAnalysis,
  detectFrequencyMasking,
} from './algorithms/frequencyMasking';

import {
  analyzePhaseCorrelation,
  calculateOverallPhaseCorrelation,
} from './algorithms/phaseAnalysis';

import {
  analyzeTonalBalance,
  calculateCriticalBandEnergies,
  analyzeDynamicRange,
} from './algorithms/tonalBalance';

import {
  generateMixCritique,
} from './algorithms/mixCritique';

/**
 * Default configuration for AI analysis
 */
const DEFAULT_CONFIG: Required<AnalysisConfig> = {
  fftSize: 8192,
  hopSizeFraction: 0.25,
  enableMaskingDetection: true,
  enablePhaseAnalysis: true,
  enableTonalBalance: true,
  enableDynamicRange: true,
  enableLoudnessAnalysis: true,
  confidenceThreshold: 0.6,
  minimumSeverity: Severity.LOW,
  referenceCurve: 'k-weighting',
  genreHint: 'auto',
};

/**
 * AI-powered audio analysis engine
 *
 * @example
 * ```typescript
 * const analyzer = new AIAnalysis({
 *   fftSize: 8192,
 *   enableMaskingDetection: true,
 *   enablePhaseAnalysis: true,
 * });
 *
 * await analyzer.initialize();
 * const result = await analyzer.analyzeAudio(audioBuffer);
 * console.log('Issues found:', result.issues.length);
 * console.log('Overall score:', result.critique.score.overall);
 * ```
 */
export class AIAnalysis {
  private config: Required<AnalysisConfig>;
  private initialized: boolean = false;

  /**
   * Creates a new AIAnalysis instance
   * @param config - Analysis configuration options
   */
  constructor(config?: Partial<AnalysisConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Initializes the analysis engine
   * In a full ML implementation, this would load TensorFlow.js models
   * For now, this validates configuration and prepares the engine
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('AIAnalysis already initialized');
      return;
    }

    // Validate configuration
    this.validateConfig();

    // In a full TensorFlow.js implementation, we would:
    // 1. Load pre-trained models for audio classification
    // 2. Warm up the models with dummy data
    // 3. Check for GPU acceleration availability
    // Example:
    // this.model = await tf.loadLayersModel('path/to/model.json');

    this.initialized = true;
    console.info('AIAnalysis engine initialized', {
      fftSize: this.config.fftSize,
      referenceCurve: this.config.referenceCurve,
    });
  }

  /**
   * Performs comprehensive AI analysis on audio buffer
   * @param audioBuffer - Audio buffer to analyze
   * @returns Complete analysis result
   * @throws {Error} If engine not initialized or analysis fails
   */
  async analyzeAudio(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('AIAnalysis not initialized. Call initialize() first.');
    }

    const startTime = performance.now();

    try {
      // Step 1: Perform spectral analysis
      console.info('Performing spectral analysis...');
      const spectralAnalysis = performSpectralAnalysis(
        audioBuffer,
        this.config.fftSize,
        this.config.hopSizeFraction
      );

      // Step 2: Detect frequency masking
      const maskingIssues = this.config.enableMaskingDetection
        ? await this.detectFrequencyMasking(spectralAnalysis)
        : [];

      // Step 3: Analyze phase correlation
      const phaseIssues = this.config.enablePhaseAnalysis
        ? await this.analyzePhaseCorrelation(audioBuffer)
        : [];

      // Step 4: Analyze tonal balance
      const tonalIssues = this.config.enableTonalBalance
        ? await this.detectTonalImbalance(audioBuffer)
        : [];

      // Step 5: Combine all issues
      const allIssues = [...maskingIssues, ...phaseIssues, ...tonalIssues];

      // Filter by minimum severity and confidence
      const filteredIssues = this.filterIssues(allIssues);

      // Step 6: Calculate additional metrics
      const phaseCorrelation = this.config.enablePhaseAnalysis
        ? calculateOverallPhaseCorrelation(audioBuffer)
        : { overall: 1.0, byFrequency: [] };

      const dynamicRange = this.config.enableDynamicRange
        ? analyzeDynamicRange(audioBuffer)
        : { crestFactor: 0, peakToRMS: 0, recommendation: '' };

      const loudness = this.config.enableLoudnessAnalysis
        ? await this.analyzeLoudness(audioBuffer)
        : {
            lufsIntegrated: -14,
            lufsMomentaryMax: -10,
            truePeak: -1,
            recommendation: '',
          };

      // Step 7: Calculate critical band energies
      const criticalBands = calculateCriticalBandEnergies(audioBuffer);

      // Step 8: Generate mix critique
      const critique = generateMixCritique(
        filteredIssues,
        dynamicRange,
        loudness,
        phaseCorrelation
      );

      // Step 9: Group issues by severity
      const issuesBySeverity = this.groupIssuesBySeverity(filteredIssues);

      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      console.info(
        `Analysis complete: ${filteredIssues.length} issues found in ${processingTime}ms`
      );

      return {
        timestamp: Date.now(),
        duration: audioBuffer.duration,
        issues: filteredIssues,
        issuesBySeverity,
        critique,
        spectralAnalysis,
        criticalBands,
        phaseCorrelation,
        dynamicRange,
        loudness,
        processingTime,
      };
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Audio analysis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Detects frequency masking issues
   * @param spectralAnalysis - Spectral analysis data
   * @returns Array of masking issues
   */
  async detectFrequencyMasking(
    spectralAnalysis: ReturnType<typeof performSpectralAnalysis>
  ): Promise<AudioIssue[]> {
    console.info('Detecting frequency masking...');
    return detectFrequencyMasking(spectralAnalysis, this.config.confidenceThreshold);
  }

  /**
   * Analyzes phase correlation
   * @param audioBuffer - Audio buffer
   * @returns Array of phase issues
   */
  async analyzePhaseCorrelation(audioBuffer: AudioBuffer): Promise<AudioIssue[]> {
    console.info('Analyzing phase correlation...');
    return analyzePhaseCorrelation(audioBuffer);
  }

  /**
   * Detects tonal imbalances
   * @param audioBuffer - Audio buffer
   * @returns Array of tonal issues
   */
  async detectTonalImbalance(audioBuffer: AudioBuffer): Promise<AudioIssue[]> {
    console.info('Analyzing tonal balance...');
    return analyzeTonalBalance(audioBuffer, this.config.referenceCurve);
  }

  /**
   * Generates overall mix critique
   * @param audioBuffer - Audio buffer
   * @returns Mix critique with suggestions
   */
  async generateMixCritique(audioBuffer: AudioBuffer): Promise<ReturnType<typeof generateMixCritique>> {
    // This is already called in analyzeAudio, but exposed as public method
    const result = await this.analyzeAudio(audioBuffer);
    return result.critique;
  }

  /**
   * Analyzes loudness (LUFS)
   * Simplified implementation - full LUFS requires K-weighting filter
   * @param audioBuffer - Audio buffer
   * @returns Loudness analysis
   */
  private async analyzeLoudness(audioBuffer: AudioBuffer): Promise<{
    lufsIntegrated: number;
    lufsMomentaryMax: number;
    truePeak: number;
    recommendation: string;
  }> {
    // Simplified LUFS estimation
    // In production, implement full ITU-R BS.1770-4 K-weighting
    const numChannels = audioBuffer.numberOfChannels;
    let totalRMS = 0;
    let maxPeak = 0;

    for (let ch = 0; ch < numChannels; ch++) {
      const channelData = audioBuffer.getChannelData(ch);

      // Calculate RMS
      let sumSquares = 0;
      for (let i = 0; i < channelData.length; i++) {
        sumSquares += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sumSquares / channelData.length);
      totalRMS += rms;

      // Find peak
      for (let i = 0; i < channelData.length; i++) {
        maxPeak = Math.max(maxPeak, Math.abs(channelData[i]));
      }
    }

    const avgRMS = totalRMS / numChannels;
    const rmsDb = 20 * Math.log10(avgRMS);

    // Approximate LUFS (actual LUFS requires K-weighting)
    const lufsIntegrated = rmsDb - 0.691; // Rough approximation
    const lufsMomentaryMax = lufsIntegrated + 3; // Estimate
    const truePeak = 20 * Math.log10(maxPeak);

    let recommendation = '';
    if (lufsIntegrated < -23) {
      recommendation = 'Very quiet - consider increasing overall level';
    } else if (lufsIntegrated < -16) {
      recommendation = 'Good loudness for streaming platforms (Spotify, Apple Music)';
    } else if (lufsIntegrated < -9) {
      recommendation = 'Moderate loudness - suitable for most platforms';
    } else {
      recommendation = 'Very loud - may cause distortion or platform normalization';
    }

    if (truePeak > -1) {
      recommendation += ' ⚠️ True peak exceeds -1 dBTP - clipping risk';
    }

    return {
      lufsIntegrated: Math.round(lufsIntegrated * 10) / 10,
      lufsMomentaryMax: Math.round(lufsMomentaryMax * 10) / 10,
      truePeak: Math.round(truePeak * 10) / 10,
      recommendation,
    };
  }

  /**
   * Filters issues by minimum severity and confidence
   * @param issues - All detected issues
   * @returns Filtered issues
   */
  private filterIssues(issues: AudioIssue[]): AudioIssue[] {
    return issues.filter((issue) => {
      // Check confidence threshold
      if (issue.confidence < this.config.confidenceThreshold) {
        return false;
      }

      // Check minimum severity
      const severityLevel = this.getSeverityLevel(issue.severity);
      const minSeverityLevel = this.getSeverityLevel(this.config.minimumSeverity);

      return severityLevel >= minSeverityLevel;
    });
  }

  /**
   * Groups issues by severity
   * @param issues - All issues
   * @returns Issues grouped by severity
   */
  private groupIssuesBySeverity(issues: AudioIssue[]): {
    critical: AudioIssue[];
    high: AudioIssue[];
    medium: AudioIssue[];
    low: AudioIssue[];
  } {
    return {
      critical: issues.filter((i) => i.severity === Severity.CRITICAL),
      high: issues.filter((i) => i.severity === Severity.HIGH),
      medium: issues.filter((i) => i.severity === Severity.MEDIUM),
      low: issues.filter((i) => i.severity === Severity.LOW),
    };
  }

  /**
   * Gets numeric severity level
   */
  private getSeverityLevel(severity: Severity): number {
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
   * Validates configuration
   */
  private validateConfig(): void {
    // Validate FFT size (must be power of 2)
    if (!this.isPowerOfTwo(this.config.fftSize)) {
      throw new Error(`FFT size must be a power of 2, got ${this.config.fftSize}`);
    }

    // Validate hop size fraction
    if (
      this.config.hopSizeFraction <= 0 ||
      this.config.hopSizeFraction > 1
    ) {
      throw new Error(
        `Hop size fraction must be between 0 and 1, got ${this.config.hopSizeFraction}`
      );
    }

    // Validate confidence threshold
    if (
      this.config.confidenceThreshold < 0 ||
      this.config.confidenceThreshold > 1
    ) {
      throw new Error(
        `Confidence threshold must be between 0 and 1, got ${this.config.confidenceThreshold}`
      );
    }
  }

  /**
   * Checks if number is power of 2
   */
  private isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
  }

  /**
   * Cleans up resources
   * In a TensorFlow.js implementation, this would dispose models
   */
  cleanup(): void {
    // In TensorFlow.js implementation:
    // if (this.model) {
    //   this.model.dispose();
    // }

    this.initialized = false;
    console.info('AIAnalysis engine cleaned up');
  }
}

/**
 * Convenience function to perform quick analysis
 * @param audioBuffer - Audio buffer to analyze
 * @param config - Optional configuration
 * @returns Analysis result
 */
export async function analyzeAudio(
  audioBuffer: AudioBuffer,
  config?: Partial<AnalysisConfig>
): Promise<AnalysisResult> {
  const analyzer = new AIAnalysis(config);
  await analyzer.initialize();
  const result = await analyzer.analyzeAudio(audioBuffer);
  analyzer.cleanup();
  return result;
}

// Export types and algorithms for advanced use
export * from './types';
export { performSpectralAnalysis, detectFrequencyMasking } from './algorithms/frequencyMasking';
export { analyzePhaseCorrelation, calculateOverallPhaseCorrelation } from './algorithms/phaseAnalysis';
export { analyzeTonalBalance, calculateCriticalBandEnergies, analyzeDynamicRange } from './algorithms/tonalBalance';
export { generateMixCritique } from './algorithms/mixCritique';

export default AIAnalysis;
