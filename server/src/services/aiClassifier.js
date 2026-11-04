'use strict';

/**
 * services/aiClassifier.js
 *
 * AI-assisted incident classifier for child-safety reports.
 *
 * Rule-based + keyword scoring with confidence levels.
 * Supports English and Luganda text. Never throws or blocks submission.
 *
 * On failure, returns a safe fallback with requiresHumanReview: true.
 *
 * Architecture note: This is a deterministic rule-based classifier that
 * simulates an AI model. A Hugging Face multilingual model can be plugged in
 * by replacing classifyText() with an API call. The interface (input/output
 * shape) is designed to be model-agnostic.
 */

// ─── English keyword sets ────────────────────────────────────────

const EN_GROOMING = [
  'meet me', 'keep this secret', "don't tell your parents", 'send me a photo',
  "you're so mature", 'just between us', 'older friend', 'special friend',
  'you can trust me', 'i love you', 'gift', 'send pics', 'video call alone',
  'our little secret', 'nobody has to know', 'i understand you',
];

const EN_SEXTORTION = [
  'send nudes', 'naked photo', 'explicit photo', 'i have your photos',
  'will share', 'will post', 'pay me', 'bitcoin', 'blackmail',
  'send pictures', 'show me your body', 'if you don\'t',
];

const EN_BULLYING = [
  'kill yourself', 'kys', "you're ugly", 'nobody likes you', 'loser',
  'hate you', 'freak', 'stupid', 'worthless', 'everyone hates you',
  'go die', 'nobody cares about you',
];

const EN_THREATS = [
  'i will hurt you', 'going to find you', 'watch your back', "you'll regret",
  'coming for you', 'i know where you live', 'i will find you',
  'you better watch out', 'i\'m going to get you',
];

const EN_EXPLOITATION = [
  'work for me', 'make money', 'job offer', 'come to my house',
  "i'll pay you", 'modeling job', 'opportunity for you',
  'i can help you earn', 'sugar daddy',
];

const EN_HARASSMENT = [
  'leave me alone', 'stop messaging me', 'won\'t stop', 'keeps texting',
  'won\'t go away', 'bothering me', 'bother me', ' harassing me', 'stalking',
  'following me online', 'won\'t leave me alone', 'unwanted messages',
  'keeps sending', 'keeps messaging', 'keeps bothering',
];

const EN_IMPERSONATION = [
  'pretending to be', 'fake account', 'stole my identity',
  'using my name', 'catfish', 'pretended to be someone',
  'they faked', 'not who they say',
];

// ─── Luganda keyword sets ─────────────────────────────────────────

const LG_GROOMING = [
  'gana ekintu kino', 'olabe ng\'omukwano', 'olabe omukwano',
  'totangaaza bazadde', 'gwe munange', 'nzikiriza',
  'tusibirize', 'olabe ekikyali kyaffe',
];

const LG_SEXTORTION = [
  'mpa bifaananyi by\'ekyama', 'mpa bifaananyi', 'bifaananyi by\'obugumba',
  'ekifaananyi ky\'ekyama', 'jja kukusaasaaza', 'singa otafa', 'simbisa',
  'jja okubisaabisa', 'mpa ekifaananyi',
];

const LG_BULLYING = [
  'yita', 'komya', 'mwejudde', 'tonyivu', 'gwe musajja',
  'tonswaza', 'nakuubi', 'tono gooda',
];

const LG_THREATS = [
  'njja kukubonera', 'njja kukunoonya', 'leka nkubye',
  'mfuba obulabe', 'njja kukukwasiza',
];

const LG_EXPLOITATION = [
  'mpa ssente', 'kolera waaka', 'mba yakola emirimu',
  'njja kukuwa ssente', 'linga omujja wange',
];

const LG_HARASSMENT = [
  'ntaaga kubuusabuusa', 'leka omala', 'mutidde',
  'akola obutabagana',
];

// ─── Critical safety indicators (never downgraded) ────────────────

const CRITICAL_INDICATORS = [
  'kill', 'suicide', 'self-harm', 'end my life', 'want to die',
  'rape', 'molest', 'sexual assault', 'touching me',
  'child abuse', 'pedophile', 'csam', 'child sexual abuse material',
  'kidnap', 'abduct', 'trafficking',
  'meeting in person', 'coming to your house',
  'gun', 'weapon', 'knife',
];

// ─── Category keyword map ─────────────────────────────────────────

const CATEGORY_MAP = {
  Grooming: { en: EN_GROOMING, lg: LG_GROOMING },
  Sextortion: { en: EN_SEXTORTION, lg: LG_SEXTORTION },
  Cyberbullying: { en: EN_BULLYING, lg: LG_BULLYING },
  Threats: { en: EN_THREATS, lg: LG_THREATS },
  Exploitation: { en: EN_EXPLOITATION, lg: LG_EXPLOITATION },
  'Online Harassment': { en: EN_HARASSMENT, lg: LG_HARASSMENT },
  Impersonation: { en: EN_IMPERSONATION, lg: [] },
};

// ─── Helper: scan text against keyword list ────────────────────────

function scan(lower, list) {
  return list.filter((kw) => lower.includes(kw));
}

/**
 * Classify a text string by category.
 *
 * @param {string} text
 * @param {string} [category]  Optional category hint from the report
 * @returns {{
 *   suggestedPriority: string,
 *   category: string|null,
 *   indicators: string[],
 *   confidence: number,
 *   requiresHumanReview: boolean,
 *   criticalSafetyFlag: boolean
 * }}
 */
function classifyText(text, category) {
  const lower = (text || '').toLowerCase();
  const allIndicators = [];
  let maxMatches = 0;
  let bestCategory = null;
  let totalChecks = 0;

  // Run all category scanners
  for (const [cat, langs] of Object.entries(CATEGORY_MAP)) {
    for (const [lang, keywords] of Object.entries(langs)) {
      const matches = scan(lower, keywords);
      totalChecks += keywords.length;
      if (matches.length > 0) {
        allIndicators.push(...matches.map((k) => `${cat} (${lang}): "${k}"`));
        if (matches.length > maxMatches) {
          maxMatches = matches.length;
          bestCategory = cat;
        }
      }
    }
  }

  // If a category hint was provided, use it to strengthen the signal
  if (category && CATEGORY_MAP[category]) {
    if (!bestCategory) bestCategory = category;
  } else if (category) {
    // Unknown category hint — keep it
    if (!bestCategory) bestCategory = category;
  }

  // Check critical safety indicators
  const criticalMatches = scan(lower, CRITICAL_INDICATORS);
  const hasCritical = criticalMatches.length > 0;

  // Determine priority
  let suggestedPriority;

  const hasGrooming = allIndicators.some(i => i.startsWith('Grooming'));
  const hasSextortion = allIndicators.some(i => i.startsWith('Sextortion'));
  const hasThreats = allIndicators.some(i => i.startsWith('Threats'));
  const hasBullying = allIndicators.some(i => i.startsWith('Cyberbullying'));
  const hasExploitation = allIndicators.some(i => i.startsWith('Exploitation'));
  const hasHarassment = allIndicators.some(i => i.startsWith('Online Harassment'));
  const hasImpersonation = allIndicators.some(i => i.startsWith('Impersonation'));

  if (hasCritical || (hasGrooming && hasSextortion) || category === 'Sextortion' || category === 'Grooming' || bestCategory === 'Grooming' || bestCategory === 'Sextortion') {
    suggestedPriority = 'CRITICAL';
  } else if (hasBullying || hasThreats || hasExploitation || hasHarassment || hasImpersonation ||
             category === 'Threats' || category === 'Exploitation') {
    suggestedPriority = 'HIGH';
  } else if (category && category !== 'Other' && category !== 'Harmful Content' && lower.length > 0) {
    // Conservative default: if a specific category was chosen and text exists,
    // default to HIGH rather than STANDARD for child safety.
    // This covers categories like Cyberbullying, Online Harassment, Impersonation,
    // Privacy Violation where the child chose a category but the text doesn't
    // contain explicit keywords.
    suggestedPriority = 'HIGH';
  } else {
    suggestedPriority = 'STANDARD';
  }

  // Critical safety indicators can NEVER be downgraded
  if (hasCritical && suggestedPriority !== 'CRITICAL') {
    suggestedPriority = 'CRITICAL';
  }

  // Confidence: ratio of matched indicators to total checks
  // Higher = more confident. Capped at 0.95 (never 100% — human review always possible)
  const confidence = Math.min(0.95, maxMatches / Math.max(totalChecks * 0.02, 1));

  // Any non-standard priority or any indicators require human review
  const requiresHumanReview = suggestedPriority !== 'STANDARD' || allIndicators.length > 0 || hasCritical;

  return {
    suggestedPriority,
    category: bestCategory,
    indicators: allIndicators,
    confidence: Math.round(confidence * 100) / 100,
    requiresHumanReview,
    criticalSafetyFlag: hasCritical,
  };
}

/**
 * Run the classifier on a report object.
 * Never throws – on any error returns a safe fallback.
 *
 * @param {{ description: string, category?: string }} report
 * @returns {object} Classification result
 */
function runClassifier(report) {
  try {
    const { description, category } = report || {};

    // If no description is provided, return a safe fallback requiring human review
    if (!description || typeof description !== 'string' || description.trim() === '') {
      return {
        suggestedPriority: 'STANDARD',
        category: null,
        indicators: [],
        confidence: 0,
        requiresHumanReview: true,
        criticalSafetyFlag: false,
        error: 'classifier_error',
        summary: 'No description provided. Manual review required.',
      };
    }

    const result = classifyText(description, category);

    // Generate a human-readable summary
    const summary = generateSummary(result);

    return { ...result, summary };
  } catch (_err) {
    return {
      suggestedPriority: 'STANDARD',
      category: null,
      indicators: [],
      confidence: 0,
      requiresHumanReview: true,
      criticalSafetyFlag: false,
      error: 'classifier_error',
      summary: 'AI classification failed. Manual review required.',
    };
  }
}

/**
 * Generate a short human-readable summary of the classification.
 */
function generateSummary(result) {
  const parts = [];

  if (result.category) {
    parts.push(`Primary category: ${result.category}`);
  }

  parts.push(`Priority: ${result.suggestedPriority}`);

  if (result.confidence > 0) {
    parts.push(`Confidence: ${Math.round(result.confidence * 100)}%`);
  }

  if (result.criticalSafetyFlag) {
    parts.push('⚠ CRITICAL SAFETY INDICATOR DETECTED');
  }

  if (result.indicators.length > 0) {
    parts.push(`${result.indicators.length} indicator(s) matched`);
  }

  return parts.join(' | ');
}

module.exports = { runClassifier, classifyText };
