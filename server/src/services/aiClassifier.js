'use strict';

/**
 * services/aiClassifier.js
 *
 * Rule-based AI classifier for child-safety incident reports.
 * Scans submitted text for grooming, sextortion, bullying, threats, and
 * exploitation indicators, then suggests a case priority.
 *
 * NEVER throws or blocks a submission – errors are captured and returned as
 * a safe fallback result with requiresHumanReview: true.
 */

const GROOMING = [
  'meet me',
  'keep this secret',
  "don't tell your parents",
  'send me a photo',
  "you're so mature",
  'just between us',
  'older friend',
  'special friend',
  'you can trust me',
  'i love you',
  'gift',
  'send pics',
  'video call alone',
];

const SEXTORTION = [
  'send nudes',
  'naked photo',
  'explicit photo',
  'i have your photos',
  'will share',
  'will post',
  'pay me',
  'bitcoin',
  'blackmail',
];

const BULLYING = [
  'kill yourself',
  'kys',
  "you're ugly",
  'nobody likes you',
  'loser',
  'hate you',
  'freak',
  'stupid',
  'worthless',
];

const THREATS = [
  'i will hurt you',
  'going to find you',
  'watch your back',
  "you'll regret",
  'coming for you',
];

const EXPLOITATION = [
  'work for me',
  'make money',
  'job offer',
  'come to my house',
  "i'll pay you",
  'modeling job',
];

/**
 * Scan lowercased text against a keyword list.
 * Returns the matched keywords.
 *
 * @param {string} lower  - Pre-lowercased text
 * @param {string[]} list - Keyword list to test
 * @returns {string[]}
 */
function scan(lower, list) {
  return list.filter((kw) => lower.includes(kw));
}

/**
 * Classify a text string by category.
 *
 * @param {string} text
 * @param {string} [category]
 * @returns {{ suggestedPriority: string, indicators: string[], requiresHumanReview: boolean }}
 */
function classifyText(text, category) {
  const lower = (text || '').toLowerCase();

  const groomingMatches    = scan(lower, GROOMING);
  const sextortionMatches  = scan(lower, SEXTORTION);
  const bullyingMatches    = scan(lower, BULLYING);
  const threatMatches      = scan(lower, THREATS);
  const exploitationMatches = scan(lower, EXPLOITATION);

  const hasGrooming    = groomingMatches.length > 0;
  const hasSextortion  = sextortionMatches.length > 0;
  const hasBullying    = bullyingMatches.length > 0;
  const hasThreats     = threatMatches.length > 0;
  const hasExploitation = exploitationMatches.length > 0;

  const indicators = [
    ...groomingMatches.map((k) => `Grooming: "${k}"`),
    ...sextortionMatches.map((k) => `Sextortion: "${k}"`),
    ...bullyingMatches.map((k) => `Bullying: "${k}"`),
    ...threatMatches.map((k) => `Threat: "${k}"`),
    ...exploitationMatches.map((k) => `Exploitation: "${k}"`),
  ];

  let suggestedPriority;

  if (
    (hasGrooming && hasSextortion) ||
    category === 'Sextortion' ||
    category === 'Grooming'
  ) {
    suggestedPriority = 'CRITICAL';
  } else if (
    hasBullying || hasThreats || hasExploitation ||
    category === 'Threats' || category === 'Exploitation'
  ) {
    suggestedPriority = 'HIGH';
  } else {
    suggestedPriority = 'STANDARD';
  }

  return {
    suggestedPriority,
    indicators,
    requiresHumanReview: suggestedPriority !== 'STANDARD' || indicators.length > 0,
  };
}

/**
 * Run the classifier on a report object.
 * Never throws – on any error returns a safe fallback.
 *
 * @param {{ description: string, category?: string }} report
 * @returns {{ suggestedPriority: string, indicators?: string[], requiresHumanReview: boolean, error?: string }}
 */
function runClassifier(report) {
  try {
    const { description, category } = report || {};
    return classifyText(description, category);
  } catch (_err) {
    return {
      suggestedPriority: 'STANDARD',
      requiresHumanReview: true,
      error: 'classifier_error',
    };
  }
}

module.exports = { runClassifier };
