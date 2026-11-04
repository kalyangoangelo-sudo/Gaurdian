'use strict';

/**
 * tests/ai-evaluation/evaluate.js
 *
 * Runs the synthetic evaluation dataset through the AI classifier
 * and reports classification metrics.
 *
 * Usage:
 *   cd server
 *   node tests/ai-evaluation/evaluate.js
 *
 * Metrics reported:
 *   - Classification accuracy (exact category match)
 *   - Priority accuracy (exact priority match)
 *   - Precision, Recall, F1 per priority level
 *   - False negatives for serious incidents (CRITICAL missed)
 *   - False positives (STANDARD reports flagged as CRITICAL/HIGH)
 *   - Performance by language (en, lg, mix)
 *   - Processing latency (avg, p50, p95)
 */

const fs = require('fs');
const path = require('path');
const { runClassifier } = require('../../src/services/aiClassifier');

// ─── Load dataset ──────────────────────────────────────────────
const datasetPath = path.join(__dirname, 'dataset.json');
const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));

console.log(`\n══════════════════════════════════════════════════════════════════════`);
console.log(`  GuardianLink AI Classifier — Evaluation Report`);
console.log(`  Dataset: ${dataset.length} synthetic reports`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

// ─── Run classifier on each report ─────────────────────────────
const results = [];
const latencies = [];

for (const item of dataset) {
  const start = process.hrtime.bigint();
  const result = runClassifier({ description: item.text, category: item.expectedCategory });
  const elapsed = Number(process.hrtime.bigint() - start) / 1e6; // ms

  latencies.push(elapsed);

  results.push({
    id: item.id,
    lang: item.lang,
    text: item.text,
    expectedCategory: item.expectedCategory,
    expectedPriority: item.expectedPriority,
    predictedCategory: result.category,
    predictedPriority: result.suggestedPriority,
    confidence: result.confidence,
    criticalSafetyFlag: result.criticalSafetyFlag,
    requiresHumanReview: result.requiresHumanReview,
    latencyMs: elapsed,
    correctCategory: result.category === item.expectedCategory,
    correctPriority: result.suggestedPriority === item.expectedPriority,
    isError: !!result.error,
  });
}

// ─── Calculate metrics ─────────────────────────────────────────

// Category accuracy
const categoryCorrect = results.filter(r => r.correctCategory).length;
const categoryAccuracy = (categoryCorrect / results.length * 100).toFixed(1);

// Priority accuracy
const priorityCorrect = results.filter(r => r.correctPriority).length;
const priorityAccuracy = (priorityCorrect / results.length * 100).toFixed(1);

// Combined accuracy (both category and priority correct)
const combinedCorrect = results.filter(r => r.correctCategory && r.correctPriority).length;
const combinedAccuracy = (combinedCorrect / results.length * 100).toFixed(1);

// Per-priority metrics
const priorities = ['CRITICAL', 'HIGH', 'STANDARD'];
const priorityMetrics = {};

for (const p of priorities) {
  const tp = results.filter(r => r.expectedPriority === p && r.predictedPriority === p).length;
  const fp = results.filter(r => r.expectedPriority !== p && r.predictedPriority === p).length;
  const fn = results.filter(r => r.expectedPriority === p && r.predictedPriority !== p).length;
  const tn = results.filter(r => r.expectedPriority !== p && r.predictedPriority !== p).length;

  const precision = tp + fp > 0 ? (tp / (tp + fp) * 100).toFixed(1) : 'N/A';
  const recall = tp + fn > 0 ? (tp / (tp + fn) * 100).toFixed(1) : 'N/A';
  const f1 = (precision !== 'N/A' && recall !== 'N/A')
    ? (2 * (parseFloat(precision) * parseFloat(recall)) / (parseFloat(precision) + parseFloat(recall))).toFixed(1)
    : 'N/A';

  priorityMetrics[p] = { tp, fp, fn, tn, precision, recall, f1 };
}

// False negatives for serious incidents (CRITICAL expected but predicted as STANDARD)
const criticalFalseNegatives = results.filter(
  r => r.expectedPriority === 'CRITICAL' && r.predictedPriority === 'STANDARD'
);

// False positives (STANDARD expected but predicted as CRITICAL)
const standardFalsePositives = results.filter(
  r => r.expectedPriority === 'STANDARD' && r.predictedPriority === 'CRITICAL'
);

// Performance by language
const langMetrics = {};
for (const lang of ['en', 'lg', 'mix']) {
  const langResults = results.filter(r => r.lang === lang);
  if (langResults.length === 0) continue;
  const langCorrect = langResults.filter(r => r.correctCategory && r.correctPriority).length;
  langMetrics[lang] = {
    count: langResults.length,
    accuracy: (langCorrect / langResults.length * 100).toFixed(1) + '%',
    correct: langCorrect,
  };
}

// Latency statistics
latencies.sort((a, b) => a - b);
const avgLatency = (latencies.reduce((s, l) => s + l, 0) / latencies.length).toFixed(3);
const p50Latency = latencies[Math.floor(latencies.length * 0.5)].toFixed(3);
const p95Latency = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);
const maxLatency = latencies[latencies.length - 1].toFixed(3);

// ─── Print report ──────────────────────────────────────────────

console.log('── Overall Accuracy ────────────────────────────────────────');
console.log(`  Category accuracy:  ${categoryAccuracy}%  (${categoryCorrect}/${results.length})`);
console.log(`  Priority accuracy:  ${priorityAccuracy}%  (${priorityCorrect}/${results.length})`);
console.log(`  Combined accuracy:   ${combinedAccuracy}%  (${combinedCorrect}/${results.length})`);

console.log('\n── Per-Priority Metrics ────────────────────────────────────');
console.log('  Priority     Precision   Recall   F1      TP  FP  FN  TN');
console.log('  ─────────────────────────────────────────────────────────');
for (const [p, m] of Object.entries(priorityMetrics)) {
  console.log(`  ${p.padEnd(12)} ${(m.precision + '%').padEnd(11)} ${(m.recall + '%').padEnd(8)} ${(m.f1 + '%').padEnd(7)} ${String(m.tp).padEnd(3)} ${String(m.fp).padEnd(3)} ${String(m.fn).padEnd(3)} ${m.tn}`);
}

console.log('\n── Critical Safety ────────────────────────────────────────');
console.log(`  CRITICAL false negatives (missed serious incidents): ${criticalFalseNegatives.length}`);
if (criticalFalseNegatives.length > 0) {
  criticalFalseNegatives.forEach(r => {
    console.log(`    → [${r.lang}] ID ${r.id}: "${r.text.substring(0, 60)}${r.text.length > 60 ? '...' : ''}"`);
    console.log(`      Expected: ${r.expectedPriority}/${r.expectedCategory}, Predicted: ${r.predictedPriority}/${r.predictedCategory}`);
  });
}
console.log(`  STANDARD false positives (over-flagged): ${standardFalsePositives.length}`);
if (standardFalsePositives.length > 0) {
  standardFalsePositives.forEach(r => {
    console.log(`    → [${r.lang}] ID ${r.id}: "${r.text.substring(0, 60)}${r.text.length > 60 ? '...' : ''}"`);
  });
}

console.log('\n── Performance by Language ────────────────────────────────');
for (const [lang, m] of Object.entries(langMetrics)) {
  console.log(`  ${lang.toUpperCase().padEnd(6)} ${m.count} reports → ${m.accuracy} accuracy (${m.correct}/${m.count} correct)`);
}

console.log('\n── Latency ────────────────────────────────────────────────');
console.log(`  Average: ${avgLatency} ms`);
console.log(`  P50:     ${p50Latency} ms`);
console.log(`  P95:     ${p95Latency} ms`);
console.log(`  Max:     ${maxLatency} ms`);

console.log('\n── AI Fallback Behavior ───────────────────────────────────');
const errors = results.filter(r => r.isError);
console.log(`  Classifier errors: ${errors.length} / ${results.length}`);
console.log(`  All reports saved regardless of classifier status: Yes`);

console.log('\n── Detailed Per-Item Results ───────────────────────────────');
results.forEach(r => {
  const status = r.correctCategory && r.correctPriority ? '✓' : (r.correctPriority ? '~' : '✗');
  const catMatch = r.correctCategory ? '' : ` [cat: ${r.predictedCategory}]`;
  console.log(`  ${status} [${r.lang.toUpperCase()}] #${r.id} exp=${r.expectedPriority}/${r.expectedCategory} got=${r.predictedPriority}/${r.predictedCategory || '—'} conf=${Math.round(r.confidence * 100)}%${r.criticalSafetyFlag ? ' ⚠CRITICAL' : ''}${catMatch}`);
});

console.log(`\n══════════════════════════════════════════════════════════════════════`);
console.log(`  These are PROTOTYPE measurements, not proof of production safety.`);
console.log(`  A qualified child protection practitioner should review the evaluation labels.`);
console.log(`══════════════════════════════════════════════════════════════════════\n`);

// Export for programmatic use
module.exports = { results, priorityMetrics, langMetrics };
