/**
 * SafetyClassifier — Rule-Based Demonstration Engine
 * ⚠️ NOT a machine learning model. Detects known patterns associated with grooming, cyberbullying, and threats.
 * Does NOT provide probabilistic confidence scores. Human review always recommended.
 * Suitable for demonstration and research purposes only.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export type SafetyClassification =
  | 'SAFE'
  | 'GROOMING_INDICATORS'
  | 'BULLYING'
  | 'THREAT'
  | 'INAPPROPRIATE_REQUEST'
  | 'SUSPICIOUS_LINK'
  | 'UNKNOWN';

export type UncertaintyLevel = 'CERTAIN' | 'LIKELY' | 'POSSIBLE' | 'UNCERTAIN';

export interface ClassificationResult {
  classification: SafetyClassification;
  indicators: string[];
  recommendedAction: string;
  requiresHumanReview: boolean;
  uncertaintyLevel: UncertaintyLevel;
  ruleIds: string[];
}

// ─── Internal rule definitions ────────────────────────────────────────────────

interface SafetyRule {
  id: string;
  category: 'GROOMING' | 'BULLYING' | 'THREAT';
  pattern: RegExp;
  /**
   * Strong rules are those where even a single match warrants LIKELY certainty.
   * Corresponds to G003, G007, T001, T002, T003.
   */
  strong: boolean;
}

const GROOMING_RULES: SafetyRule[] = [
  {
    id: 'G001',
    category: 'GROOMING',
    pattern: /\b(send (me |us )?(a |your )?(photo|pic|picture|image|video|selfie))/i,
    strong: false,
  },
  {
    id: 'G002',
    category: 'GROOMING',
    pattern: /\b(meet (me|up|in person)|(come to my (house|place)))/i,
    strong: false,
  },
  {
    id: 'G003',
    category: 'GROOMING',
    pattern: /\b(keep (this |it )?(a )?secret|don.t tell (your )?parents|just between us|our (little )?secret)/i,
    strong: true,
  },
  {
    id: 'G004',
    category: 'GROOMING',
    pattern: /\b(how old are you|what (year|grade) are you (in|at)|are you (alone|home alone))/i,
    strong: false,
  },
  {
    id: 'G005',
    category: 'GROOMING',
    pattern: /\b(i (will|can|could) (buy|get|send) you|want a (gift|present|surprise))/i,
    strong: false,
  },
  {
    id: 'G006',
    category: 'GROOMING',
    pattern: /\b(your parents (don.t|won.t) (understand|get it)|only i understand you)/i,
    strong: false,
  },
  {
    id: 'G007',
    category: 'GROOMING',
    pattern: /\b(where do you live|what (is your|.s your) (address|school|home))/i,
    strong: true,
  },
  {
    id: 'G008',
    category: 'GROOMING',
    pattern: /\b(you.re so (mature|special|different)|not like other (kids|children)|special (connection|bond))/i,
    strong: false,
  },
  {
    id: 'G009',
    category: 'GROOMING',
    pattern: /\b(talk (to me )?on |message me on |use (this )?app instead|delete (this )?chat)/i,
    strong: false,
  },
  {
    id: 'G010',
    category: 'GROOMING',
    pattern: /\b(naked|underwear|take off)/i,
    strong: false,
  },
];

const BULLYING_RULES: SafetyRule[] = [
  {
    id: 'B001',
    category: 'BULLYING',
    pattern: /\b(you.re (so )?(ugly|stupid|fat|worthless|pathetic|disgusting|loser|idiot))/i,
    strong: false,
  },
  {
    id: 'B002',
    category: 'BULLYING',
    pattern: /\b(nobody (likes|wants) you|everyone (hates|dislikes) you|you have no friends)/i,
    strong: false,
  },
  {
    id: 'B003',
    category: 'BULLYING',
    pattern: /\b(you look (so )?(ugly|fat|disgusting))/i,
    strong: false,
  },
  {
    // B005 kept in list order; B004 is a compound rule (2+ bullying IDs) handled in logic
    id: 'B005',
    category: 'BULLYING',
    pattern: /\b(post (this|it) everywhere|show everyone|make it (viral|public))/i,
    strong: false,
  },
];

const THREAT_RULES: SafetyRule[] = [
  {
    id: 'T001',
    category: 'THREAT',
    pattern: /\b(i (will|'ll|am going to) (hurt|kill|destroy|beat) (you|ur))/i,
    strong: true,
  },
  {
    id: 'T002',
    category: 'THREAT',
    pattern: /\b(you should (kill|hurt) yourself|go (kill|hurt) yourself|everyone (would|'d) be better (without|w.o) you)/i,
    strong: true,
  },
  {
    id: 'T003',
    category: 'THREAT',
    pattern: /\b(i have (your |ur )?(photos|pictures|videos)|i.ll (show|send|post) (them|it) to (everyone|your parents|your school))/i,
    strong: true,
  },
  {
    id: 'T004',
    category: 'THREAT',
    pattern: /\b(i know where you (live|are|go to school)|i.ll find you|i know your (address|house|school))/i,
    strong: false,
  },
];

const ALL_RULES: SafetyRule[] = [...GROOMING_RULES, ...BULLYING_RULES, ...THREAT_RULES];

// ─── Recommended action map ───────────────────────────────────────────────────

const RECOMMENDED_ACTIONS: Record<SafetyClassification, string> = {
  SAFE: 'No action required. Content appears safe.',
  GROOMING_INDICATORS:
    'Alert parent or guardian immediately. Do not respond to the sender. Save the conversation as evidence.',
  BULLYING:
    'Report to a trusted adult or school counsellor. Block the sender if possible. Document the messages.',
  THREAT:
    'Contact a trusted adult immediately. If there is immediate danger, call emergency services (911). Preserve all evidence.',
  INAPPROPRIATE_REQUEST:
    'Do not comply with the request. Report to a trusted adult. Block the sender.',
  SUSPICIOUS_LINK:
    'Do not click the link. Report to a trusted adult or guardian for review.',
  UNKNOWN:
    'Review content manually. If in doubt, share with a trusted adult.',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Run all rules against `text` and return the matched rules.
 */
function matchRules(text: string): SafetyRule[] {
  return ALL_RULES.filter((rule) => rule.pattern.test(text));
}

/**
 * Derive the primary classification from the matched rules.
 *
 * Priority order: THREAT > GROOMING > BULLYING (compound B004 check included).
 */
function deriveClassification(
  matched: SafetyRule[],
): SafetyClassification {
  if (matched.length === 0) return 'SAFE';

  const hasCategory = (cat: SafetyRule['category']) =>
    matched.some((r) => r.category === cat);

  if (hasCategory('THREAT')) return 'THREAT';
  if (hasCategory('GROOMING')) return 'GROOMING_INDICATORS';

  // B004: 2+ distinct bullying rule IDs → escalate to BULLYING classification
  const bullyingIds = matched.filter((r) => r.category === 'BULLYING').map((r) => r.id);
  if (bullyingIds.length >= 2 || hasCategory('BULLYING')) return 'BULLYING';

  return 'UNKNOWN';
}

/**
 * Derive the uncertainty level from matched rules and text length.
 *
 * - CERTAIN  : 3+ rules from the same primary category
 * - LIKELY   : 2+ rules from the primary category, OR 1 strong rule
 * - POSSIBLE : 1 weak rule
 * - UNCERTAIN: very short text (<20 chars) with exactly 1 match
 */
function deriveUncertainty(
  matched: SafetyRule[],
  text: string,
  primaryCategory: SafetyRule['category'] | null,
): UncertaintyLevel {
  if (matched.length === 0) return 'CERTAIN'; // SAFE is certain

  const strongRuleIds = new Set(['G003', 'G007', 'T001', 'T002', 'T003']);
  const hasStrongMatch = matched.some((r) => strongRuleIds.has(r.id));

  const sameCategory = primaryCategory
    ? matched.filter((r) => r.category === primaryCategory)
    : matched;

  if (sameCategory.length >= 3) return 'CERTAIN';
  if (sameCategory.length >= 2 || hasStrongMatch) return 'LIKELY';

  // Single weak match on very short text
  if (text.trim().length < 20 && matched.length === 1) return 'UNCERTAIN';

  return 'POSSIBLE';
}

/**
 * Build human-readable indicator strings from the matched rules.
 */
function buildIndicators(matched: SafetyRule[]): string[] {
  return matched.map((r) => {
    const labels: Record<string, string> = {
      G001: 'Request for photo or video',
      G002: 'Request to meet in person',
      G003: 'Secrecy request — keep hidden from parents',
      G004: 'Personal information probe (age, location, school)',
      G005: 'Offer of gifts or incentives',
      G006: 'Parental authority undermining language',
      G007: 'Request for home address or school name',
      G008: 'Flattery isolating child from peers',
      G009: 'Request to move conversation to another platform',
      G010: 'Sexualized language detected',
      B001: 'Derogatory name-calling or insults',
      B002: 'Social exclusion statements',
      B003: 'Appearance-based insults',
      B005: 'Threat to spread content publicly',
      T001: 'Direct threat of physical violence',
      T002: 'Self-harm encouragement (critical)',
      T003: 'Blackmail or extortion with private content',
      T004: 'Surveillance or stalking language',
    };
    return labels[r.id] ?? `Rule ${r.id} matched`;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Classify `text` using the rule-based safety engine.
 *
 * Returns a `ClassificationResult` with matched rule IDs, human-readable
 * indicators, an uncertainty level, and a recommended action.
 *
 * ⚠️ This is a demonstration engine only. Human review is always recommended.
 */
export function classifyContent(text: string): ClassificationResult {
  const matched = matchRules(text);
  const classification = deriveClassification(matched);

  // Map classification back to the rule category for uncertainty calculation
  const categoryMap: Partial<Record<SafetyClassification, SafetyRule['category']>> = {
    GROOMING_INDICATORS: 'GROOMING',
    BULLYING: 'BULLYING',
    THREAT: 'THREAT',
  };
  const primaryCategory = categoryMap[classification] ?? null;

  const uncertaintyLevel = deriveUncertainty(matched, text, primaryCategory);
  const indicators = buildIndicators(matched);
  const ruleIds = matched.map((r) => r.id);

  // T002 always requires human review; any non-SAFE result also does
  const requiresHumanReview =
    ruleIds.includes('T002') || classification !== 'SAFE';

  return {
    classification,
    indicators,
    recommendedAction: RECOMMENDED_ACTIONS[classification],
    requiresHumanReview,
    uncertaintyLevel,
    ruleIds,
  };
}
