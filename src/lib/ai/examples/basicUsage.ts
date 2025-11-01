/**
 * @fileoverview Basic usage examples for AI audio analysis
 * @module lib/ai/examples/basicUsage
 */

import { AIAnalysis, analyzeAudio, AnalysisResult } from '../aiAnalysis';
import { BaseAudioEngine } from '../../audio/BaseAudioEngine';

/**
 * Example 1: Basic analysis with default settings
 */
export async function basicAnalysisExample(audioFile: File): Promise<AnalysisResult> {
  // Create and initialize analyzer
  const analyzer = new AIAnalysis();
  await analyzer.initialize();

  // Load audio file using BaseAudioEngine
  const engine = new BaseAudioEngine();
  await engine.initialize();
  await engine.loadAudio(audioFile);

  const audioBuffer = engine.getAudioBuffer();
  if (!audioBuffer) {
    throw new Error('Failed to load audio');
  }

  // Analyze audio
  const result = await analyzer.analyzeAudio(audioBuffer);

  // Display results
  console.log('Analysis Complete!');
  console.log('Overall Quality Score:', result.critique.score.overall, '/100');
  console.log('Issues Found:', result.issues.length);
  console.log('Processing Time:', result.processingTime, 'ms');

  // Cleanup
  analyzer.cleanup();
  engine.cleanup();

  return result;
}

/**
 * Example 2: Analysis with custom configuration
 */
export async function customAnalysisExample(audioBuffer: AudioBuffer): Promise<AnalysisResult> {
  const analyzer = new AIAnalysis({
    fftSize: 8192,                    // Higher resolution
    confidenceThreshold: 0.7,         // Only report high-confidence issues
    minimumSeverity: 'medium' as any,        // Ignore low-severity issues
    referenceCurve: 'k-weighting',    // Use K-weighting reference
    enableMaskingDetection: true,     // Enable masking detection
    enablePhaseAnalysis: true,        // Enable phase analysis
    enableTonalBalance: true,         // Enable tonal balance
  });

  await analyzer.initialize();
  const result = await analyzer.analyzeAudio(audioBuffer);
  analyzer.cleanup();

  return result;
}

/**
 * Example 3: Quick analysis using convenience function
 */
export async function quickAnalysisExample(audioBuffer: AudioBuffer): Promise<void> {
  const result = await analyzeAudio(audioBuffer, {
    fftSize: 4096, // Faster analysis
    confidenceThreshold: 0.6,
  });

  // Display critical issues only
  console.log('Critical Issues:', result.issuesBySeverity.critical.length);
  result.issuesBySeverity.critical.forEach((issue, i) => {
    console.log(`${i + 1}. ${issue.description}`);
    console.log(`   Suggestion: ${issue.suggestion}`);
  });
}

/**
 * Example 4: Detailed results analysis
 */
export async function detailedResultsExample(audioBuffer: AudioBuffer): Promise<void> {
  const result = await analyzeAudio(audioBuffer);

  // Overall quality
  console.log('\n=== Overall Quality ===');
  console.log('Score:', result.critique.score.overall, '/100');
  console.log('Summary:', result.critique.summary);

  // Score breakdown
  console.log('\n=== Score Breakdown ===');
  console.log('Frequency Balance:', result.critique.score.breakdown.frequency, '/100');
  console.log('Dynamics:', result.critique.score.breakdown.dynamics, '/100');
  console.log('Stereo Field:', result.critique.score.breakdown.stereo, '/100');
  console.log('Clarity:', result.critique.score.breakdown.clarity, '/100');
  console.log('Loudness:', result.critique.score.breakdown.loudness, '/100');

  // Strengths
  console.log('\n=== Strengths ===');
  result.critique.strengths.forEach((strength) => {
    console.log('✓', strength);
  });

  // Improvements
  console.log('\n=== Improvements ===');
  result.critique.improvements.forEach((improvement) => {
    console.log('•', improvement);
  });

  // Phase correlation
  console.log('\n=== Phase Correlation ===');
  console.log('Overall:', (result.phaseCorrelation.overall * 100).toFixed(0), '%');
  result.phaseCorrelation.byFrequency.forEach(({ frequency, correlation }) => {
    console.log(`${frequency} Hz:`, (correlation * 100).toFixed(0), '%');
  });

  // Dynamic range
  console.log('\n=== Dynamic Range ===');
  console.log('Crest Factor:', result.dynamicRange.crestFactor, 'dB');
  console.log('Recommendation:', result.dynamicRange.recommendation);

  // Loudness
  console.log('\n=== Loudness ===');
  console.log('Integrated LUFS:', result.loudness.lufsIntegrated);
  console.log('True Peak:', result.loudness.truePeak, 'dBTP');
  console.log('Recommendation:', result.loudness.recommendation);

  // Estimated improvement
  console.log('\n=== Improvement Potential ===');
  console.log('Score Increase:', '+' + result.critique.estimatedImprovement.scoreIncrease, 'points');
  console.log(result.critique.estimatedImprovement.description);
}

/**
 * Example 5: Issue categorization
 */
export async function issueCategoryExample(audioBuffer: AudioBuffer): Promise<void> {
  const result = await analyzeAudio(audioBuffer);

  // Group issues by category
  const maskingIssues = result.issues.filter((i) => i.category === 'frequency_masking');
  const phaseIssues = result.issues.filter((i) => i.category === 'phase_correlation');
  const tonalIssues = result.issues.filter((i) => i.category === 'tonal_balance');

  console.log('\n=== Issues by Category ===');
  console.log('Frequency Masking:', maskingIssues.length);
  console.log('Phase Correlation:', phaseIssues.length);
  console.log('Tonal Balance:', tonalIssues.length);

  // Display masking issues
  if (maskingIssues.length > 0) {
    console.log('\n--- Frequency Masking Issues ---');
    maskingIssues.forEach((issue, i) => {
      const maskingIssue = issue as any; // Type assertion for example
      console.log(`${i + 1}. ${issue.description}`);
      console.log(`   Masking: ${maskingIssue.frequencies.masking} Hz`);
      console.log(`   Masked: ${maskingIssue.frequencies.masked} Hz`);
      console.log(`   Ratio: ${maskingIssue.maskingRatio} dB`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  }

  // Display phase issues
  if (phaseIssues.length > 0) {
    console.log('\n--- Phase Correlation Issues ---');
    phaseIssues.forEach((issue, i) => {
      const phaseIssue = issue as any;
      console.log(`${i + 1}. ${issue.description}`);
      console.log(`   Correlation: ${(phaseIssue.correlation * 100).toFixed(0)}%`);
      console.log(`   Mono Compatible: ${phaseIssue.monoCompatible ? 'Yes' : 'No'}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  }

  // Display tonal issues
  if (tonalIssues.length > 0) {
    console.log('\n--- Tonal Balance Issues ---');
    tonalIssues.forEach((issue, i) => {
      const tonalIssue = issue as any;
      console.log(`${i + 1}. ${issue.description}`);
      console.log(`   Range: ${tonalIssue.frequencyRange}`);
      console.log(`   Deviation: ${tonalIssue.deviation} dB ${tonalIssue.type}`);
      console.log(`   Suggestion: ${issue.suggestion}`);
    });
  }
}

/**
 * Example 6: Priority issues workflow
 */
export async function priorityIssuesExample(audioBuffer: AudioBuffer): Promise<void> {
  const result = await analyzeAudio(audioBuffer);

  console.log('\n=== Top Priority Issues ===');
  console.log('Address these issues first for maximum improvement:\n');

  result.critique.priorityIssues.forEach((issue, i) => {
    console.log(`${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description}`);
    console.log(`   Confidence: ${(issue.confidence * 100).toFixed(0)}%`);
    console.log(`   Action: ${issue.suggestion}`);
    console.log('');
  });

  console.log(`Fixing these ${result.critique.priorityIssues.length} issues could improve your score by ${result.critique.estimatedImprovement.scoreIncrease} points.`);
}

/**
 * Example 7: Real-time analysis progress (React component)
 */
export async function reactComponentExample() {
  // This would be used in a React component like:
  /*
  const [analysisProgress, setAnalysisProgress] = useState({
    isAnalyzing: false,
    result: null,
    error: null,
  });

  const handleAnalyze = async (audioBuffer: AudioBuffer) => {
    setAnalysisProgress({ isAnalyzing: true, result: null, error: null });

    try {
      const analyzer = new AIAnalysis();
      await analyzer.initialize();

      const result = await analyzer.analyzeAudio(audioBuffer);

      setAnalysisProgress({
        isAnalyzing: false,
        result,
        error: null,
      });

      analyzer.cleanup();
    } catch (error) {
      setAnalysisProgress({
        isAnalyzing: false,
        result: null,
        error: error as Error,
      });
    }
  };
  */

  console.log('See React component example in comments');
}

/**
 * Example 8: Batch analysis for multiple files
 */
export async function batchAnalysisExample(audioFiles: File[]): Promise<AnalysisResult[]> {
  const results: AnalysisResult[] = [];
  const analyzer = new AIAnalysis();
  await analyzer.initialize();

  const engine = new BaseAudioEngine();
  await engine.initialize();

  for (const file of audioFiles) {
    console.log(`Analyzing ${file.name}...`);

    await engine.loadAudio(file);
    const audioBuffer = engine.getAudioBuffer();

    if (audioBuffer) {
      const result = await analyzer.analyzeAudio(audioBuffer);
      results.push(result);

      console.log(`✓ ${file.name}: Score ${result.critique.score.overall}/100`);
    }
  }

  analyzer.cleanup();
  engine.cleanup();

  return results;
}
