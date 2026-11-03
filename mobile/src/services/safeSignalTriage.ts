/**
 * safeSignalTriage.ts
 * Triage layer for child-submitted SafeSignal reports.
 *
 * Combines output from the safety classifier and the content filter to
 * produce a risk level and recommended actions for parent review.
 */

import { classifyContent, ClassificationResult } from './safetyClassifier';
import { filterContent, FilterResult } from './filterEngine';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SafeSignalInput {
  /** Broad category selected by the child when submitting the report. */
  category: string;
  /** Free-text description of the concern. */
  description: string;
  /** Optional verbatim text the child wants reviewed (e.g. a message). */
  submittedText?: string;
}

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TriageResult {
  riskLevel: RiskLevel;
  classificationResult: ClassificationResult;
  filterResult?: FilterResult;
  recommendedActions: string[];
  requiresImmediateAttention: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive the risk level from classification and filter results.
 *
 * HIGH when any of the following are true:
 *  - Classification is GROOMING_INDICATORS or THREAT with certainty CERTAIN or LIKELY
 *  - Rule T002 (self-harm encouragement) was matched
 *  - Submitted category is 'Threats'
 *
 * MEDIUM when any of the following are true:
 *  - Classification is BULLYING or INAPPROPRIATE_REQUEST
 *  - Classification is GROOMING_INDICATORS with certainty POSSIBLE or UNCERTAIN
 *  - Submitted category is 'Cyberbullying' or 'Suspicious Message'
 *
 * LOW otherwise (SAFE or UNKNOWN classifications).
 */
function deriveRiskLevel(
  input: SafeSignalInput,
  classification: ClassificationResult,
): RiskLevel {
  const { classification: label, uncertaintyLevel, ruleIds } = classification;

  // ── HIGH conditions ───────────────────────────────────────────────────────
  if (input.category === 'Threats') return 'HIGH';

  if (ruleIds.includes('T002')) return 'HIGH';

  if (
    (label === 'GROOMING_INDICATORS' || label === 'THREAT') &&
    (uncertaintyLevel === 'CERTAIN' || uncertaintyLevel === 'LIKELY')
  ) {
    return 'HIGH';
  }

  // ── MEDIUM conditions ─────────────────────────────────────────────────────
  if (input.category === 'Cyberbullying' || input.category === 'Suspicious Message') {
    return 'MEDIUM';
  }

  if (label === 'BULLYING' || label === 'INAPPROPRIATE_REQUEST') return 'MEDIUM';

  if (
    label === 'GROOMING_INDICATORS' &&
    (uncertaintyLevel === 'POSSIBLE' || uncertaintyLevel === 'UNCERTAIN')
  ) {
    return 'MEDIUM';
  }

  // ── LOW (SAFE / UNKNOWN) ──────────────────────────────────────────────────
  return 'LOW';
}

/**
 * Build a deduplicated list of recommended actions from all sources.
 */
function buildRecommendedActions(
  riskLevel: RiskLevel,
  classificationResult: ClassificationResult,
  filterResult?: FilterResult,
): string[] {
  const actions: string[] = [];

  // Always include the classifier's recommended action when not SAFE
  if (classificationResult.classification !== 'SAFE') {
    actions.push(classificationResult.recommendedAction);
  }

  // Supplement with filter-level guidance when the filter blocked content
  if (filterResult && filterResult.decision === 'BLOCK') {
    actions.push(
      `Content filter blocked material in category "${filterResult.category}": ${filterResult.explanation}`,
    );
  }

  // Risk-level specific guidance
  if (riskLevel === 'HIGH') {
    actions.push('Notify parent or guardian immediately.');
    actions.push('Preserve all relevant messages and content as evidence.');
    if (classificationResult.ruleIds.includes('T002')) {
      actions.push(
        'Child welfare concern detected. Consider contacting child safety services or emergency services if there is immediate risk.',
      );
    }
  } else if (riskLevel === 'MEDIUM') {
    actions.push('Review with parent or guardian within 24 hours.');
    actions.push('Monitor for escalation.');
  } else {
    actions.push('No immediate action required. Log for record-keeping.');
  }

  // Deduplicate while preserving order
  return actions.filter((a, i, arr) => arr.indexOf(a) === i);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Triage a child-submitted SafeSignal report.
 *
 * Runs the submitted text through both the safety classifier and content
 * filter, then combines the results into a single `TriageResult` with a
 * risk level and recommended actions.
 */
export function triageSignal(input: SafeSignalInput): TriageResult {
  // Combine description and optional submitted text for analysis
  const textToAnalyze = [input.description, input.submittedText ?? '']
    .join(' ')
    .trim();

  // Run safety classification
  const classificationResult = classifyContent(textToAnalyze);

  // Run content filter if there is text to analyze (optional supplementary signal)
  const filterResult: FilterResult | undefined =
    textToAnalyze.length > 0
      ? filterContent({ submittedText: textToAnalyze })
      : undefined;

  const riskLevel = deriveRiskLevel(input, classificationResult);
  const recommendedActions = buildRecommendedActions(
    riskLevel,
    classificationResult,
    filterResult,
  );

  return {
    riskLevel,
    classificationResult,
    filterResult,
    recommendedActions,
    requiresImmediateAttention: riskLevel === 'HIGH',
  };
}
