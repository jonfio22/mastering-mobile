/**
 * @fileoverview AI Feedback Panel Component
 * @module components/mastering/AIFeedbackPanel
 * @description Real-time AI analysis and feedback display for the monitor page
 */

import React, { useState, useEffect } from 'react';
import { AIAnalysis } from '@/lib/ai/aiAnalysis';
import { AudioIssue, Severity, IssueCategory } from '@/lib/ai/types';

interface AIFeedbackPanelProps {
  audioBuffer: AudioBuffer | null;
  autoAnalyze?: boolean;
  className?: string;
}

/**
 * Severity Badge Component
 */
function SeverityBadge({ severity }: { severity: Severity }) {
  const colors = {
    [Severity.CRITICAL]: 'bg-red-500/20 text-red-400 border-red-500/50',
    [Severity.HIGH]: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    [Severity.MEDIUM]: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    [Severity.LOW]: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  };

  const labels = {
    [Severity.CRITICAL]: '🔴 Critical',
    [Severity.HIGH]: '🟠 High',
    [Severity.MEDIUM]: '🟡 Medium',
    [Severity.LOW]: '🔵 Low',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${colors[severity]}`}>
      {labels[severity]}
    </span>
  );
}

/**
 * Issue Category Icon
 */
function getCategoryIcon(category: IssueCategory): string {
  const icons: { [key in IssueCategory]?: string } = {
    [IssueCategory.FREQUENCY_MASKING]: '🎛️',
    [IssueCategory.PHASE_CORRELATION]: '🌊',
    [IssueCategory.TONAL_BALANCE]: '⚖️',
    [IssueCategory.DYNAMIC_RANGE]: '📊',
    [IssueCategory.STEREO_FIELD]: '🎧',
    [IssueCategory.CLIPPING]: '⚠️',
    [IssueCategory.DC_OFFSET]: '🔧',
  };
  return icons[category] || '🎵';
}

/**
 * Issue Item Component
 */
interface IssueItemProps {
  issue: AudioIssue;
  onQuickFix?: (issue: AudioIssue) => void;
}

function IssueItem({ issue, onQuickFix }: IssueItemProps) {
  const [expanded, setExpanded] = useState(false);

  // Get issue-specific details
  const getIssueTitle = (issue: AudioIssue): string => {
    if (issue.category === IssueCategory.FREQUENCY_MASKING) {
      return `Frequency Masking at ${issue.frequencyRange}`;
    } else if (issue.category === IssueCategory.PHASE_CORRELATION) {
      return `Phase Issue at ${issue.frequency} Hz`;
    } else if (issue.category === IssueCategory.TONAL_BALANCE) {
      return `Tonal Imbalance in ${issue.frequencyRange}`;
    }
    return 'Audio Issue';
  };

  return (
    <div className="p-3 bg-gray-800/40 border border-gray-700/30 rounded-lg hover:border-gray-600/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getCategoryIcon(issue.category)}</span>
            <span className="text-sm font-semibold text-gray-200">{getIssueTitle(issue)}</span>
            <SeverityBadge severity={issue.severity} />
          </div>

          <p className="text-xs text-gray-400 mb-2">{issue.description}</p>

          {expanded && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              {issue.suggestion && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-emerald-400 mb-1">💡 Suggestion:</div>
                  <p className="text-xs text-gray-300">{issue.suggestion}</p>
                </div>
              )}

              {issue.category === IssueCategory.FREQUENCY_MASKING && 'frequencies' in issue && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-emerald-400 mb-1">📍 Frequencies Involved:</div>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                      Masking: {issue.frequencies.masking < 1000 ? `${issue.frequencies.masking} Hz` : `${(issue.frequencies.masking / 1000).toFixed(1)} kHz`}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-700/50 rounded text-xs text-gray-300">
                      Masked: {issue.frequencies.masked < 1000 ? `${issue.frequencies.masked} Hz` : `${(issue.frequencies.masked / 1000).toFixed(1)} kHz`}
                    </span>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Confidence: {(issue.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs text-gray-300 transition-colors"
          >
            {expanded ? '▲' : '▼'}
          </button>

          {onQuickFix && (
            <button
              onClick={() => onQuickFix(issue)}
              className="px-2 py-1 bg-emerald-600/50 hover:bg-emerald-500/50 rounded text-xs text-emerald-200 transition-colors"
              title="Apply quick fix"
            >
              ⚡
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Overall Score Display
 */
interface ScoreDisplayProps {
  score: number;
  label: string;
}

function ScoreDisplay({ score, label }: ScoreDisplayProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex-1">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <div
            className={`h-full ${getBarColor(score)} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-sm font-bold ${getColor(score)}`}>
          {score}
        </span>
      </div>
    </div>
  );
}

/**
 * AI Feedback Panel Component
 */
export default function AIFeedbackPanel({ audioBuffer, autoAnalyze = false, className = '' }: AIFeedbackPanelProps) {
  const [analyzer] = useState(() => new AIAnalysis());
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');

  // Initialize analyzer
  useEffect(() => {
    analyzer.initialize().catch(err => {
      console.error('Failed to initialize AI analyzer:', err);
      setError('Failed to initialize AI analyzer');
    });
  }, [analyzer]);

  // Auto-analyze when audio buffer changes
  useEffect(() => {
    if (autoAnalyze && audioBuffer && !analyzing) {
      handleAnalyze();
    }
  }, [audioBuffer, autoAnalyze]);

  const handleAnalyze = async () => {
    if (!audioBuffer) {
      setError('No audio loaded');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzer.analyzeAudio(audioBuffer);
      setAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleQuickFix = (issue: AudioIssue) => {
    // TODO: Implement quick fix application
    console.log('Quick fix for issue:', issue);
    // This would apply the suggested parameter changes automatically
  };

  // Filter issues by severity
  const filteredIssues = analysisResult?.issues.filter((issue: AudioIssue) => {
    if (filterSeverity === 'all') return true;
    return issue.severity === filterSeverity;
  }) || [];

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-emerald-400 tracking-wide uppercase">
            AI Assistant
          </h3>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={!audioBuffer || analyzing}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            analyzing
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600/50 hover:bg-emerald-500/50 text-emerald-200'
          }`}
        >
          {analyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-600/50 rounded text-red-400 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {analyzing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-2">⚙️</div>
            <div className="text-sm text-gray-400">Analyzing audio...</div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {!analyzing && analysisResult && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Overall Scores */}
          <div className="mb-4 p-4 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-xl border border-gray-700/30">
            <div className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wide">
              Overall Quality
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ScoreDisplay score={analysisResult.critique.score.overall} label="Overall" />
              <ScoreDisplay score={analysisResult.critique.score.tonalBalance} label="Tonal Balance" />
              <ScoreDisplay score={analysisResult.critique.score.dynamicRange} label="Dynamics" />
              <ScoreDisplay score={analysisResult.critique.score.stereoImaging} label="Stereo" />
            </div>
          </div>

          {/* Summary */}
          {analysisResult.critique.summary && (
            <div className="mb-4 p-3 bg-gray-800/40 border border-gray-700/30 rounded-lg">
              <div className="text-xs font-semibold text-emerald-400 mb-2">📝 Summary</div>
              <p className="text-xs text-gray-300">{analysisResult.critique.summary}</p>
            </div>
          )}

          {/* Severity Filter */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-gray-400">Filter:</span>
            <div className="flex gap-1">
              {['all', Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev as Severity | 'all')}
                  className={`px-2 py-1 rounded text-xs transition-colors ${
                    filterSeverity === sev
                      ? 'bg-emerald-600/50 text-emerald-200'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50'
                  }`}
                >
                  {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Issues List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                {analysisResult.issues.length === 0
                  ? '✨ No issues detected! Your audio sounds great.'
                  : '🔍 No issues match the current filter.'}
              </div>
            ) : (
              filteredIssues.map((issue: AudioIssue, idx: number) => (
                <IssueItem
                  key={idx}
                  issue={issue}
                  onQuickFix={handleQuickFix}
                />
              ))
            )}
          </div>

          {/* Processing Time */}
          <div className="mt-3 text-xs text-gray-500 text-center">
            Analysis completed in {analysisResult.processingTime}ms
          </div>
        </div>
      )}

      {/* Empty State */}
      {!analyzing && !analysisResult && !error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500 text-sm max-w-xs">
            <div className="text-4xl mb-2">🎵</div>
            <p>Load audio and click &quot;Analyze&quot; to get AI-powered feedback on your mix.</p>
          </div>
        </div>
      )}
    </div>
  );
}
