/**
 * filterEngine.ts
 * Content filtering decision engine for GuardianLink 2.0.
 *
 * Applies rules in order:
 *  1. Allowlist (trusted educational domains)
 *  2. Blocklist (known harmful domains)
 *  3. Keyword rules (adult, violence, drugs, gambling)
 *  4. Educational exception downgrade
 *  5. Policy-level custom keywords
 *  6. Default ALLOW
 */

// ─── Public types ────────────────────────────────────────────────────────────

export type FilterDecision = 'ALLOW' | 'BLOCK' | 'REVIEW';

export type FilterCategory =
  | 'ADULT'
  | 'VIOLENCE'
  | 'GAMBLING'
  | 'HATE_SPEECH'
  | 'DRUGS'
  | 'EDUCATIONAL'
  | 'SAFE'
  | 'UNKNOWN';

export interface FilterResult {
  decision: FilterDecision;
  category: FilterCategory;
  ruleId: string;
  explanation: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;
}

export interface PolicyConfig {
  blockedKeywords?: string[];
  trustedDomains?: string[];
  blockedCategories?: FilterCategory[];
}

export interface FilterInput {
  domain?: string;
  url?: string;
  searchQuery?: string;
  pageTitle?: string;
  pageText?: string;
  submittedText?: string;
}

// ─── Internal rule tables ─────────────────────────────────────────────────────

const BUILT_IN_ALLOWLIST: string[] = [
  'educational.example',
  'learning.example',
  'khanacademy.org',
  'bbc.co.uk',
  'nationalgeographic.com',
  'britannica.com',
  'wikipedia.org',
];

const BUILT_IN_BLOCKLIST: Record<string, FilterCategory> = {
  'adult.example': 'ADULT',
  'explicit.test': 'ADULT',
  'gambling-site.example': 'GAMBLING',
  'violence.example': 'VIOLENCE',
  'drugs.example': 'DRUGS',
};

// Keyword rules: [phrases[], category, decision, ruleId]
const KEYWORD_RULES: Array<{
  phrases: string[];
  category: FilterCategory;
  decision: FilterDecision;
  ruleId: string;
}> = [
  {
    phrases: ['porn', 'pornography', 'xxx', 'sex chat', 'explicit content'],
    category: 'ADULT',
    decision: 'BLOCK',
    ruleId: 'KEYWORD_ADULT',
  },
  {
    // 'kill' alone is too broad; only flag 'kill yourself' / 'kill all'
    phrases: ['gore', 'torture', 'beheading', 'massacre', 'kill yourself', 'kill all'],
    category: 'VIOLENCE',
    decision: 'BLOCK',
    ruleId: 'KEYWORD_VIOLENCE',
  },
  {
    phrases: ['buy cocaine', 'buy meth', 'buy drugs', 'drug dealer', 'how to make drugs'],
    category: 'DRUGS',
    decision: 'BLOCK',
    ruleId: 'KEYWORD_DRUGS',
  },
  {
    phrases: ['online casino', 'sports betting', 'bet online', 'place a bet'],
    category: 'GAMBLING',
    decision: 'REVIEW',
    ruleId: 'KEYWORD_GAMBLING',
  },
];

const EDUCATIONAL_EXCEPTION_PHRASES: string[] = [
  'breast cancer',
  'cancer awareness',
  'sexual health education',
  'reproductive health',
  'anatomy',
  'biology lesson',
  'health class',
  'medical',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize a string for consistent matching:
 *  1. NFC compose
 *  2. NFD decompose then strip combining diacritics (catches obfuscation like "pörnography")
 *  3. Lowercase
 */
function normalize(text: string): string {
  return text
    .normalize('NFC')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .toLowerCase();
}

/**
 * Extract the hostname from a URL string.
 * Returns the original string (lowercased) if URL parsing fails.
 */
function extractDomain(urlOrDomain: string): string {
  try {
    const u = new URL(
      urlOrDomain.includes('://') ? urlOrDomain : `https://${urlOrDomain}`,
    );
    return u.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return urlOrDomain.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Test whether `phrase` appears as a whole word (or multi-word sequence) in
 * `text` using a word-boundary regex.
 */
function matchesPhrase(phrase: string, text: string): boolean {
  // Build a regex with word boundaries. Multi-word phrases still need \b on
  // the outer edges; internal spaces may match any whitespace.
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(text);
}

/**
 * Collect all text fields from the input into a single normalized blob for
 * keyword scanning.
 */
function collectText(input: FilterInput): string {
  return normalize(
    [
      input.searchQuery ?? '',
      input.pageTitle ?? '',
      input.pageText ?? '',
      input.submittedText ?? '',
    ].join(' '),
  );
}

/**
 * Resolve the effective domain to test from an input.
 * Prefers explicit `domain`, falls back to extracting from `url`.
 */
function resolveDomain(input: FilterInput): string | null {
  if (input.domain) return extractDomain(input.domain);
  if (input.url) return extractDomain(input.url);
  return null;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Evaluate `input` against the configured policy and return a `FilterResult`.
 *
 * Rules are applied in priority order; the first matching rule wins, with one
 * exception: keyword results may be downgraded by the educational-exception
 * check before being returned.
 */
export function filterContent(input: FilterInput, policy?: PolicyConfig): FilterResult {
  const ts = new Date().toISOString();
  const domain = resolveDomain(input);
  const blockedCategories = policy?.blockedCategories ?? [];

  // ── 1. Allowlist ──────────────────────────────────────────────────────────
  if (domain !== null) {
    const allowlist = [
      ...BUILT_IN_ALLOWLIST,
      ...(policy?.trustedDomains ?? []),
    ].map((d) => extractDomain(d));

    if (allowlist.includes(domain)) {
      if (!blockedCategories.includes('EDUCATIONAL')) {
        return {
          decision: 'ALLOW',
          category: 'EDUCATIONAL',
          ruleId: 'ALLOWLIST',
          explanation: `Domain "${domain}" is on the trusted allowlist.`,
          confidence: 'HIGH',
          timestamp: ts,
        };
      }
      // EDUCATIONAL is blocked by policy — fall through to blocklist/keyword checks
    }
  }

  // ── 2. Blocklist ──────────────────────────────────────────────────────────
  if (domain !== null) {
    const matchedCategory = BUILT_IN_BLOCKLIST[domain];
    if (matchedCategory !== undefined) {
      return {
        decision: 'BLOCK',
        category: matchedCategory,
        ruleId: 'BLOCKLIST_DOMAIN',
        explanation: `Domain "${domain}" is on the content blocklist.`,
        confidence: 'HIGH',
        timestamp: ts,
      };
    }
  }

  // ── 3. Keyword rules ──────────────────────────────────────────────────────
  const blob = collectText(input);

  for (const rule of KEYWORD_RULES) {
    for (const phrase of rule.phrases) {
      if (matchesPhrase(phrase, blob)) {
        let decision: FilterDecision = rule.decision;
        let explanation = `Matched keyword rule "${phrase}" (${rule.ruleId}).`;
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

        // ── 4. Educational exception ───────────────────────────────────────
        if (decision === 'BLOCK') {
          const hasEducationalContext = EDUCATIONAL_EXCEPTION_PHRASES.some((ep) =>
            matchesPhrase(ep, blob),
          );
          if (hasEducationalContext) {
            decision = 'REVIEW';
            explanation += ' Educational context detected.';
            confidence = 'MEDIUM';
          }
        }

        return {
          decision,
          category: rule.category,
          ruleId: rule.ruleId,
          explanation,
          confidence,
          timestamp: ts,
        };
      }
    }
  }

  // ── 5. Policy keyword check ───────────────────────────────────────────────
  if (policy?.blockedKeywords && policy.blockedKeywords.length > 0) {
    for (const kw of policy.blockedKeywords) {
      if (matchesPhrase(normalize(kw), blob)) {
        return {
          decision: 'BLOCK',
          category: 'UNKNOWN',
          ruleId: 'POLICY_KEYWORD',
          explanation: `Matched policy-defined keyword "${kw}".`,
          confidence: 'HIGH',
          timestamp: ts,
        };
      }
    }
  }

  // ── 6. Default ────────────────────────────────────────────────────────────
  return {
    decision: 'ALLOW',
    category: 'UNKNOWN',
    ruleId: 'DEFAULT',
    explanation: 'No rules matched; content allowed by default.',
    confidence: 'LOW',
    timestamp: ts,
  };
}
