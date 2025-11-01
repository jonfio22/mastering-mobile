/**
 * @fileoverview Mix critique generation from analysis results
 * @module lib/ai/algorithms/mixCritique
 * @description Generates professional mix critique with actionable suggestions
 */

import {
  AudioIssue,
  MixCritique,
  QualityScore,
  Severity,
  IssueCategory,
  MaskingIssue,
  PhaseIssue,
  TonalIssue,
} from '../types';

/**
 * Generates comprehensive mix critique from detected issues
 * @param issues - All detected audio issues
 * @param dynamicRange - Dynamic range analysis
 * @param loudness - Loudness analysis
 * @param phaseCorrelation - Phase correlation data
 * @returns Mix critique with suggestions
 */
export function generateMixCritique(
  issues: AudioIssue[],
  dynamicRange: { crestFactor: number; peakToRMS: number; recommendation: string },
  loudness: { lufsIntegrated: number; lufsMomentaryMax: number; truePeak: number; recommendation: string },
  phaseCorrelation: { overall: number }
): MixCritique {
  // Calculate quality scores
  const score = calculateQualityScore(issues, dynamicRange, loudness, phaseCorrelation);

  // Identify strengths and improvements
  const strengths = identifyStrengths(score, issues, dynamicRange, phaseCorrelation);
  const improvements = identifyImprovements(issues, dynamicRange, loudness);

  // Get priority issues (highest severity and confidence)
  const priorityIssues = getPriorityIssues(issues);

  // Generate summary
  const summary = generateSummary(score, issues.length);

  // Estimate improvement potential
  const estimatedImprovement = estimateImprovement(score, issues);

  return {
    summary,
    score,
    strengths,
    improvements,
    priorityIssues,
    estimatedImprovement,
  };
}

/**
 * Calculates quality score breakdown
 */
function calculateQualityScore(
  issues: AudioIssue[],
  dynamicRange: { crestFactor: number },
  loudness: { lufsIntegrated: number; truePeak: number },
  phaseCorrelation: { overall: number }
): QualityScore {
  // Frequency balance score (based on tonal issues)
  const tonalIssues = issues.filter((i) => i.category === IssueCategory.TONAL_BALANCE);
  const frequencyScore = calculateFrequencyScore(tonalIssues);

  // Dynamics score (based on dynamic range)
  const dynamicsScore = calculateDynamicsScore(dynamicRange.crestFactor);

  // Stereo field score (based on phase correlation)
  const stereoScore = calculateStereoScore(phaseCorrelation.overall, issues);

  // Clarity score (based on masking issues)
  const maskingIssues = issues.filter((i) => i.category === IssueCategory.FREQUENCY_MASKING);
  const clarityScore = calculateClarityScore(maskingIssues);

  // Loudness score (based on LUFS and true peak)
  const loudnessScore = calculateLoudnessScore(loudness.lufsIntegrated, loudness.truePeak);

  // Overall score (weighted average)
  const overall = Math.round(
    frequencyScore * 0.25 +
    dynamicsScore * 0.20 +
    stereoScore * 0.20 +
    clarityScore * 0.20 +
    loudnessScore * 0.15
  );

  return {
    overall,
    breakdown: {
      frequency: Math.round(frequencyScore),
      dynamics: Math.round(dynamicsScore),
      stereo: Math.round(stereoScore),
      clarity: Math.round(clarityScore),
      loudness: Math.round(loudnessScore),
    },
  };
}

/**
 * Calculates frequency balance score
 */
function calculateFrequencyScore(tonalIssues: AudioIssue[]): number {
  if (tonalIssues.length === 0) return 100;

  let totalDeduction = 0;

  for (const issue of tonalIssues) {
    const tonalIssue = issue as TonalIssue;
    const severityWeight = getSeverityWeight(tonalIssue.severity);
    totalDeduction += severityWeight * tonalIssue.deviation * 0.5;
  }

  return Math.max(0, 100 - totalDeduction);
}

/**
 * Calculates dynamics score
 */
function calculateDynamicsScore(crestFactor: number): number {
  // Optimal crest factor: 8-12 dB
  if (crestFactor >= 8 && crestFactor <= 12) return 100;

  // Penalize deviation from optimal range
  let score = 100;
  if (crestFactor < 8) {
    // Over-compressed
    score -= (8 - crestFactor) * 8;
  } else if (crestFactor > 12) {
    // Under-compressed (less of an issue)
    score -= (crestFactor - 12) * 3;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates stereo field score
 */
function calculateStereoScore(overallCorrelation: number, issues: AudioIssue[]): number {
  const phaseIssues = issues.filter((i) => i.category === IssueCategory.PHASE_CORRELATION);

  // Base score from overall correlation
  let score = 100;

  if (overallCorrelation < 0) {
    // Out of phase
    score = 30 - overallCorrelation * 30;
  } else if (overallCorrelation < 0.5) {
    // Weak correlation
    score = 60 + overallCorrelation * 40;
  } else {
    // Good correlation
    score = 80 + (overallCorrelation - 0.5) * 40;
  }

  // Deduct for specific phase issues
  for (const issue of phaseIssues) {
    const severityWeight = getSeverityWeight(issue.severity);
    score -= severityWeight * 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculates clarity score
 */
function calculateClarityScore(maskingIssues: AudioIssue[]): number {
  if (maskingIssues.length === 0) return 100;

  let totalDeduction = 0;

  for (const issue of maskingIssues) {
    const maskingIssue = issue as MaskingIssue;
    const severityWeight = getSeverityWeight(maskingIssue.severity);
    totalDeduction += severityWeight * maskingIssue.maskingRatio * 0.3;
  }

  return Math.max(0, 100 - totalDeduction);
}

/**
 * Calculates loudness score
 */
function calculateLoudnessScore(lufsIntegrated: number, truePeak: number): number {
  let score = 100;

  // Check LUFS (optimal: -14 to -9 LUFS for streaming)
  if (lufsIntegrated < -23) {
    // Too quiet
    score -= (Math.abs(lufsIntegrated) - 23) * 2;
  } else if (lufsIntegrated > -6) {
    // Too loud
    score -= (lufsIntegrated + 6) * 3;
  }

  // Check true peak (should be below -1 dBTP)
  if (truePeak > -1) {
    score -= (truePeak + 1) * 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Gets severity weight for scoring
 */
function getSeverityWeight(severity: Severity): number {
  switch (severity) {
    case Severity.CRITICAL:
      return 4.0;
    case Severity.HIGH:
      return 3.0;
    case Severity.MEDIUM:
      return 2.0;
    case Severity.LOW:
      return 1.0;
    default:
      return 0.5;
  }
}

/**
 * Identifies mix strengths
 */
function identifyStrengths(
  score: QualityScore,
  issues: AudioIssue[],
  dynamicRange: { crestFactor: number },
  phaseCorrelation: { overall: number }
): string[] {
  const strengths: string[] = [];

  // Check each category
  if (score.breakdown.frequency >= 80) {
    strengths.push('Well-balanced frequency response across the spectrum');
  }

  if (score.breakdown.dynamics >= 80) {
    if (dynamicRange.crestFactor >= 8 && dynamicRange.crestFactor <= 12) {
      strengths.push('Excellent dynamic range - natural and punchy');
    } else if (dynamicRange.crestFactor > 12) {
      strengths.push('Great dynamic range preservation - suitable for audiophile releases');
    }
  }

  if (score.breakdown.stereo >= 80) {
    if (phaseCorrelation.overall >= 0.7) {
      strengths.push('Strong stereo correlation with excellent mono compatibility');
    } else {
      strengths.push('Good stereo imaging and spatial characteristics');
    }
  }

  if (score.breakdown.clarity >= 80) {
    strengths.push('Clear mix with minimal frequency masking');
  }

  if (score.breakdown.loudness >= 80) {
    strengths.push('Well-optimized loudness for modern streaming platforms');
  }

  // Overall strengths
  if (score.overall >= 90) {
    strengths.unshift('Outstanding mix quality - professional mastering grade');
  } else if (score.overall >= 80) {
    strengths.unshift('High-quality mix with solid technical foundation');
  }

  // If no specific strengths, provide general encouragement
  if (strengths.length === 0) {
    strengths.push('Mix shows potential with targeted improvements');
  }

  return strengths;
}

/**
 * Identifies areas for improvement
 */
function identifyImprovements(
  issues: AudioIssue[],
  dynamicRange: { crestFactor: number; recommendation: string },
  loudness: { recommendation: string }
): string[] {
  const improvements: string[] = [];

  // Group issues by category
  const issuesByCategory = groupIssuesByCategory(issues);

  // Tonal balance improvements
  if (issuesByCategory[IssueCategory.TONAL_BALANCE]?.length > 0) {
    const tonalIssues = issuesByCategory[IssueCategory.TONAL_BALANCE];
    const criticalTonal = tonalIssues.filter((i) => i.severity === Severity.CRITICAL);

    if (criticalTonal.length > 0) {
      improvements.push(
        `Critical tonal imbalances detected in ${criticalTonal.length} frequency range(s) - significant EQ adjustments recommended`
      );
    } else {
      improvements.push(
        `Tonal balance could be improved with subtle EQ adjustments in ${tonalIssues.length} range(s)`
      );
    }
  }

  // Frequency masking improvements
  if (issuesByCategory[IssueCategory.FREQUENCY_MASKING]?.length > 0) {
    const maskingIssues = issuesByCategory[IssueCategory.FREQUENCY_MASKING];
    improvements.push(
      `${maskingIssues.length} frequency masking issue(s) detected - consider EQ cuts to improve clarity and separation`
    );
  }

  // Phase correlation improvements
  if (issuesByCategory[IssueCategory.PHASE_CORRELATION]?.length > 0) {
    const phaseIssues = issuesByCategory[IssueCategory.PHASE_CORRELATION];
    const monoIncompatible = phaseIssues.filter((i) => !(i as PhaseIssue).monoCompatible);

    if (monoIncompatible.length > 0) {
      improvements.push(
        `Mono compatibility issues detected - review stereo widening and phase relationships`
      );
    } else {
      improvements.push(`Phase correlation could be improved in ${phaseIssues.length} frequency range(s)`);
    }
  }

  // Dynamic range improvements
  if (dynamicRange.crestFactor < 6) {
    improvements.push('Dynamic range is very limited - consider reducing compression/limiting');
  } else if (dynamicRange.crestFactor > 18) {
    improvements.push('Very wide dynamic range - consider gentle compression for consistency');
  }

  // Loudness improvements
  improvements.push(dynamicRange.recommendation);
  improvements.push(loudness.recommendation);

  return improvements.filter((improvement, index, self) => self.indexOf(improvement) === index);
}

/**
 * Groups issues by category
 */
function groupIssuesByCategory(issues: AudioIssue[]): Record<IssueCategory, AudioIssue[]> {
  const grouped: Record<string, AudioIssue[]> = {};

  for (const issue of issues) {
    if (!grouped[issue.category]) {
      grouped[issue.category] = [];
    }
    grouped[issue.category].push(issue);
  }

  return grouped as Record<IssueCategory, AudioIssue[]>;
}

/**
 * Gets priority issues (top 5 by severity and confidence)
 */
function getPriorityIssues(issues: AudioIssue[]): AudioIssue[] {
  // Sort by severity first, then confidence
  const sorted = [...issues].sort((a, b) => {
    const severityDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
    if (severityDiff !== 0) return severityDiff;
    return b.confidence - a.confidence;
  });

  // Return top 5
  return sorted.slice(0, 5);
}

/**
 * Generates summary based on overall score
 */
function generateSummary(score: QualityScore, issueCount: number): string {
  const { overall } = score;

  if (overall >= 90) {
    return `Excellent mix quality (${overall}/100). ${issueCount === 0 ? 'No significant issues detected' : `${issueCount} minor optimization(s) available`}. Ready for mastering or requires minimal adjustments.`;
  } else if (overall >= 80) {
    return `Good mix quality (${overall}/100). ${issueCount} issue(s) detected. Solid foundation with some areas for improvement before mastering.`;
  } else if (overall >= 70) {
    return `Moderate mix quality (${overall}/100). ${issueCount} issue(s) detected. Several improvements recommended before mastering.`;
  } else if (overall >= 60) {
    return `Fair mix quality (${overall}/100). ${issueCount} issue(s) detected. Significant improvements needed for professional mastering.`;
  } else {
    return `Mix quality needs improvement (${overall}/100). ${issueCount} issue(s) detected. Major revisions recommended before mastering.`;
  }
}

/**
 * Estimates potential improvement
 */
function estimateImprovement(score: QualityScore, issues: AudioIssue[]): {
  scoreIncrease: number;
  description: string;
} {
  // Calculate potential gain from fixing issues
  let potentialGain = 0;

  for (const issue of issues) {
    const severityWeight = getSeverityWeight(issue.severity);
    potentialGain += severityWeight * issue.confidence * 2;
  }

  // Cap at realistic improvement (can't exceed 100)
  const scoreIncrease = Math.min(potentialGain, 100 - score.overall);

  let description = '';
  if (scoreIncrease >= 20) {
    description = `Addressing these issues could increase your mix quality score by approximately ${Math.round(scoreIncrease)} points, resulting in a professional-grade master.`;
  } else if (scoreIncrease >= 10) {
    description = `Addressing these issues could increase your mix quality score by approximately ${Math.round(scoreIncrease)} points, noticeably improving your master.`;
  } else if (scoreIncrease >= 5) {
    description = `Addressing these issues could increase your mix quality score by approximately ${Math.round(scoreIncrease)} points, providing subtle refinements.`;
  } else {
    description = `Mix is already well-optimized. Minor adjustments may provide ${Math.round(scoreIncrease)} point improvement.`;
  }

  return {
    scoreIncrease: Math.round(scoreIncrease),
    description,
  };
}
