# AI-Powered Audio Analysis System

Professional audio analysis engine for mastering applications. Provides comprehensive analysis including frequency masking detection, phase correlation analysis, tonal balance assessment, and mix critique - all running client-side with no cloud dependency.

## Features

- **Frequency Masking Detection**: Identifies where one frequency component obscures another using psychoacoustic principles and critical band theory
- **Phase Correlation Analysis**: Detects phase issues, out-of-phase content, and mono compatibility problems
- **Tonal Balance Analysis**: Compares frequency distribution against professional reference curves (ITU-R BS.1770 K-weighting, Fletcher-Munson)
- **Dynamic Range Assessment**: Analyzes crest factor and compression characteristics
- **Mix Critique Generation**: Provides actionable suggestions with natural language feedback
- **Client-Side Processing**: All analysis runs locally - no network requests required

## Installation

The AI analysis module is already included in the project. No additional dependencies required beyond TensorFlow.js (already in package.json).

## Quick Start

```typescript
import { AIAnalysis } from '@/lib/ai/aiAnalysis';

// Create analyzer instance
const analyzer = new AIAnalysis({
  fftSize: 8192,
  enableMaskingDetection: true,
  enablePhaseAnalysis: true,
  enableTonalBalance: true,
});

// Initialize
await analyzer.initialize();

// Analyze audio buffer
const result = await analyzer.analyzeAudio(audioBuffer);

// Access results
console.log('Overall Score:', result.critique.score.overall);
console.log('Issues Found:', result.issues.length);
console.log('Critical Issues:', result.issuesBySeverity.critical.length);

// Display suggestions
result.critique.improvements.forEach(improvement => {
  console.log('-', improvement);
});

// Cleanup when done
analyzer.cleanup();
```

## Configuration Options

```typescript
interface AnalysisConfig {
  // FFT size for spectral analysis (default: 8192)
  fftSize?: number;

  // Hop size as fraction of FFT size (default: 0.25)
  hopSizeFraction?: number;

  // Enable frequency masking detection (default: true)
  enableMaskingDetection?: boolean;

  // Enable phase correlation analysis (default: true)
  enablePhaseAnalysis?: boolean;

  // Enable tonal balance analysis (default: true)
  enableTonalBalance?: boolean;

  // Enable dynamic range analysis (default: true)
  enableDynamicRange?: boolean;

  // Enable loudness analysis (default: true)
  enableLoudnessAnalysis?: boolean;

  // Minimum confidence threshold for reporting issues (default: 0.6)
  confidenceThreshold?: number;

  // Minimum severity for reporting (default: LOW)
  minimumSeverity?: Severity;

  // Reference curve for tonal balance (default: 'k-weighting')
  referenceCurve?: 'k-weighting' | 'fletcher-munson' | 'flat';

  // Genre hint for specialized analysis (default: 'auto')
  genreHint?: 'rock' | 'pop' | 'classical' | 'electronic' | 'jazz' | 'hip-hop' | 'auto';
}
```

## Analysis Result Structure

```typescript
interface AnalysisResult {
  timestamp: number;              // When analysis was performed
  duration: number;               // Audio duration analyzed
  issues: AudioIssue[];          // All detected issues
  issuesBySeverity: {            // Issues grouped by severity
    critical: AudioIssue[];
    high: AudioIssue[];
    medium: AudioIssue[];
    low: AudioIssue[];
  };
  critique: MixCritique;         // Overall mix assessment
  spectralAnalysis: SpectralAnalysis;
  criticalBands: CriticalBandEnergy[];
  phaseCorrelation: {
    overall: number;             // -1 to 1
    byFrequency: Array<{
      frequency: number;
      correlation: number;
    }>;
  };
  dynamicRange: {
    crestFactor: number;         // dB
    peakToRMS: number;           // dB
    recommendation: string;
  };
  loudness: {
    lufsIntegrated: number;      // LUFS
    lufsMomentaryMax: number;    // LUFS
    truePeak: number;            // dBTP
    recommendation: string;
  };
  processingTime: number;        // ms
}
```

## Issue Types

### Frequency Masking Issue

Detected when one frequency component obscures another:

```typescript
{
  category: 'frequency_masking',
  severity: 'high',
  confidence: 0.85,
  frequencyRange: 'mid',
  frequencies: {
    masking: 1200,    // Hz
    masked: 1250      // Hz
  },
  maskingRatio: 12.5,  // dB
  timeRange: { start: 1.5, end: 2.0 },
  description: "Frequency masking detected in mid range: 1200 Hz is masking 1250 Hz by 12.5 dB",
  suggestion: "Consider reducing energy around 1200 Hz or boosting 1250 Hz to improve clarity"
}
```

### Phase Correlation Issue

Detected when stereo channels have phase problems:

```typescript
{
  category: 'phase_correlation',
  severity: 'critical',
  confidence: 0.92,
  correlation: -0.6,        // -1 to 1
  frequencyRange: 'bass',
  frequency: 100,           // Hz
  timeRange: { start: 0.5, end: 1.5 },
  monoCompatible: false,
  description: "Phase correlation issue in bass range (-60%) - signals are out of phase ⚠️ Mono compatibility warning",
  suggestion: "Critical phase issue in bass: Check for polarity inversion. Flip phase of one channel or adjust stereo widening effects."
}
```

### Tonal Balance Issue

Detected when frequency balance deviates from reference:

```typescript
{
  category: 'tonal_balance',
  severity: 'medium',
  confidence: 0.78,
  frequencyRange: 'bass',
  deviation: 8.5,           // dB
  energyLevel: -10.2,       // dBFS
  expectedLevel: -18.7,     // dBFS
  type: 'excessive',
  description: "Bass range is 8.5 dB too loud compared to reference curve",
  suggestion: "Apply 8.5 dB cut in bass range using EQ to improve tonal balance"
}
```

## Mix Critique

The critique provides a holistic assessment:

```typescript
{
  summary: "Good mix quality (82/100). 8 issue(s) detected. Solid foundation with some areas for improvement before mastering.",
  score: {
    overall: 82,
    breakdown: {
      frequency: 75,   // Frequency balance
      dynamics: 85,    // Dynamic range
      stereo: 80,      // Stereo field quality
      clarity: 78,     // Mix clarity
      loudness: 88     // Loudness optimization
    }
  },
  strengths: [
    "Well-balanced frequency response across the spectrum",
    "Excellent dynamic range - natural and punchy",
    "Strong stereo correlation with excellent mono compatibility"
  ],
  improvements: [
    "Tonal balance could be improved with subtle EQ adjustments in 3 range(s)",
    "2 frequency masking issue(s) detected - consider EQ cuts to improve clarity",
    "Good dynamic range for modern mastering"
  ],
  priorityIssues: [/* Top 5 issues by severity */],
  estimatedImprovement: {
    scoreIncrease: 12,
    description: "Addressing these issues could increase your mix quality score by approximately 12 points, noticeably improving your master."
  }
}
```

## Integration Example

### React Component

```typescript
import { useState } from 'react';
import { AIAnalysis, AnalysisResult } from '@/lib/ai/aiAnalysis';

export function AudioAnalysisPanel({ audioBuffer }: { audioBuffer: AudioBuffer }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setIsAnalyzing(true);

    const analyzer = new AIAnalysis({
      fftSize: 8192,
      confidenceThreshold: 0.7,
      referenceCurve: 'k-weighting',
    });

    await analyzer.initialize();
    const analysisResult = await analyzer.analyzeAudio(audioBuffer);
    analyzer.cleanup();

    setResult(analysisResult);
    setIsAnalyzing(false);
  };

  return (
    <div>
      <button onClick={runAnalysis} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analyzing...' : 'Analyze Audio'}
      </button>

      {result && (
        <div>
          <h2>Quality Score: {result.critique.score.overall}/100</h2>

          <h3>Strengths</h3>
          <ul>
            {result.critique.strengths.map((strength, i) => (
              <li key={i}>{strength}</li>
            ))}
          </ul>

          <h3>Improvements</h3>
          <ul>
            {result.critique.improvements.map((improvement, i) => (
              <li key={i}>{improvement}</li>
            ))}
          </ul>

          <h3>Critical Issues ({result.issuesBySeverity.critical.length})</h3>
          {result.issuesBySeverity.critical.map((issue, i) => (
            <div key={i}>
              <p><strong>{issue.description}</strong></p>
              <p>Suggestion: {issue.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Integration with BaseAudioEngine

```typescript
import { BaseAudioEngine } from '@/lib/audio/BaseAudioEngine';
import { AIAnalysis } from '@/lib/ai/aiAnalysis';

async function analyzeLoadedAudio() {
  // Get audio buffer from engine
  const engine = new BaseAudioEngine(48000);
  await engine.initialize();
  await engine.loadAudio(audioFile);

  const audioBuffer = engine.getAudioBuffer();
  if (!audioBuffer) {
    throw new Error('No audio loaded');
  }

  // Analyze
  const analyzer = new AIAnalysis();
  await analyzer.initialize();
  const result = await analyzer.analyzeAudio(audioBuffer);

  // Display results
  console.log('Analysis complete:', {
    score: result.critique.score.overall,
    issues: result.issues.length,
    processingTime: result.processingTime,
  });

  // Cleanup
  analyzer.cleanup();
  engine.cleanup();
}
```

## Performance Considerations

- **FFT Size**: Larger FFT provides better frequency resolution but slower processing
  - 2048: Fast, suitable for real-time
  - 4096: Balanced
  - 8192: High detail (recommended for mastering)
  - 16384: Very high detail (slow)

- **Processing Time**: For a 3-minute track with FFT size 8192:
  - Expected: 1-3 seconds
  - Acceptable: < 5 seconds

- **Memory**: Analysis creates temporary buffers. Always call `cleanup()` when done.

## Algorithm Details

### Frequency Masking

Uses **Bark scale critical bands** (24 bands from 20 Hz to 15.5 kHz) and psychoacoustic masking models:

- Masking spread: -27 dB/Bark below masker, -12 dB/Bark above
- Self-masking offset: 6 dB
- Severity thresholds: 6/10/15/20 dB for low/medium/high/critical

### Phase Correlation

Calculates frequency-dependent correlation:

- Overall correlation: Pearson correlation coefficient
- Per-band analysis: FFT-based phase difference measurement
- Mono compatibility threshold: correlation < 0.5

### Tonal Balance

Compares against professional reference curves:

- **K-weighting** (ITU-R BS.1770-4): Standard for loudness measurement
- **Fletcher-Munson** (80 phon): Equal loudness contour
- **Flat**: Linear reference

### Dynamic Range

Measures compression characteristics:

- Crest factor = 20 log₁₀(peak / RMS)
- Optimal range: 8-12 dB for modern mastering
- < 6 dB indicates over-compression
- > 15 dB suggests natural dynamics

## Roadmap

Future enhancements planned:

1. **TensorFlow.js Integration**: Train models to recognize common mastering problems
2. **Genre-Specific Analysis**: Specialized reference curves per genre
3. **Transient Detection**: Analyze attack/decay characteristics
4. **Harmonic Analysis**: Detect distortion and harmonic content
5. **Stereo Width Measurement**: Quantify stereo field width
6. **Reference Track Comparison**: A/B comparison with professional masters

## Contributing

When adding new analysis features:

1. Add types to `types.ts`
2. Implement algorithm in `algorithms/`
3. Add tests to `aiAnalysis.test.ts`
4. Update this README
5. Run `npm run typecheck` and `npm run test`

## License

Part of the Mastering Mobile application.
