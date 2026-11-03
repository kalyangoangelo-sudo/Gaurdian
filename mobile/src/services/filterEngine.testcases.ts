/**
 * filterEngine.testcases.ts
 *
 * Runnable (non-Jest) test suite for the content filtering engine.
 * Import and call runFilterTests() to execute all 22 cases.
 */

import {
  filterContent,
  FilterDecision,
  FilterCategory,
  FilterInput,
  PolicyConfig,
} from './filterEngine';

// ─── Test-case shape ──────────────────────────────────────────────────────────

export interface TestCase {
  id: number;
  description: string;
  input: FilterInput;
  policy?: PolicyConfig;
  /** Expected decision (required) */
  expectedDecision: FilterDecision;
  /** Optional — when set, the result category must match */
  expectedCategory?: FilterCategory;
  /** Optional — when set, the result confidence must match */
  expectedConfidence?: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TestCaseResult {
  id: number;
  description: string;
  passed: boolean;
  expectedDecision: FilterDecision;
  actualDecision: FilterDecision;
  expectedCategory?: FilterCategory;
  actualCategory: FilterCategory;
  ruleId: string;
  explanation: string;
  error?: string;
}

export interface TestRunSummary {
  passed: number;
  failed: number;
  results: TestCaseResult[];
}

// ─── 22 test cases ────────────────────────────────────────────────────────────

export const TEST_CASES: TestCase[] = [
  // 1
  {
    id: 1,
    description: 'Known adult domain is blocked',
    input: { domain: 'adult.example' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'ADULT',
  },
  // 2
  {
    id: 2,
    description: 'Wikipedia is allowed (trusted allowlist)',
    input: { domain: 'wikipedia.org' },
    expectedDecision: 'ALLOW',
  },
  // 3
  {
    id: 3,
    description: 'Khan Academy is allowed (trusted allowlist)',
    input: { domain: 'khanacademy.org' },
    expectedDecision: 'ALLOW',
  },
  // 4
  {
    id: 4,
    description: '"buy drugs online" search query is blocked',
    input: { searchQuery: 'buy drugs online' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'DRUGS',
  },
  // 5
  {
    id: 5,
    description: '"buy cocaine cheap" search query is blocked',
    input: { searchQuery: 'buy cocaine cheap' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'DRUGS',
  },
  // 6
  {
    id: 6,
    description: '"kill all" matches violence pattern and is blocked',
    input: { searchQuery: 'kill all' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'VIOLENCE',
  },
  // 7
  {
    id: 7,
    description: 'Known gambling domain is blocked via blocklist',
    input: { domain: 'gambling-site.example' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'GAMBLING',
  },
  // 8
  {
    id: 8,
    description: '"breast cancer awareness" is reviewed due to educational context',
    input: { searchQuery: 'breast cancer awareness' },
    expectedDecision: 'REVIEW',
  },
  // 9
  {
    id: 9,
    description: '"reproductive health education class" is reviewed due to educational context',
    input: { searchQuery: 'reproductive health education class' },
    expectedDecision: 'REVIEW',
  },
  // 10
  {
    id: 10,
    description: 'Empty input defaults to ALLOW UNKNOWN LOW',
    input: {},
    expectedDecision: 'ALLOW',
    expectedCategory: 'UNKNOWN',
    expectedConfidence: 'LOW',
  },
  // 11
  {
    id: 11,
    description: 'Britannica URL is allowed via allowlist',
    input: { url: 'https://britannica.com/article' },
    expectedDecision: 'ALLOW',
  },
  // 12
  {
    id: 12,
    description: '"hello world" search query is allowed',
    input: { searchQuery: 'hello world' },
    expectedDecision: 'ALLOW',
  },
  // 13
  {
    id: 13,
    description: 'Policy blocked keyword "drugs" triggers BLOCK',
    input: { searchQuery: 'buy drugs' },
    policy: { blockedKeywords: ['drugs'] },
    expectedDecision: 'BLOCK',
  },
  // 14
  {
    id: 14,
    description: 'Custom trusted domain in policy is allowed',
    input: { domain: 'myschool.edu' },
    policy: { trustedDomains: ['myschool.edu'] },
    expectedDecision: 'ALLOW',
  },
  // 15
  {
    id: 15,
    description: '"gore and torture video" page text is blocked as violence',
    input: { pageText: 'gore and torture video' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'VIOLENCE',
  },
  // 16
  {
    id: 16,
    description: '"anatomy lesson biology" — educational phrase, should ALLOW or REVIEW',
    input: { searchQuery: 'anatomy lesson biology' },
    // anatomy alone doesn't hit a keyword rule, so it stays ALLOW
    expectedDecision: 'ALLOW',
  },
  // 17
  {
    id: 17,
    description: '"online casino bet now" triggers REVIEW for gambling',
    input: { searchQuery: 'online casino bet now' },
    expectedDecision: 'REVIEW',
    expectedCategory: 'GAMBLING',
  },
  // 18
  {
    id: 18,
    description: 'Unicode-normalized "pörnography" is blocked as adult',
    // U+00F6 ö  NFC → still ö; the engine normalizes before matching
    input: { submittedText: 'p\u00f6rnography' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'ADULT',
  },
  // 19
  {
    id: 19,
    description: 'All-caps "PORNOGRAPHY" is blocked (case-insensitive)',
    input: { searchQuery: 'PORNOGRAPHY' },
    expectedDecision: 'BLOCK',
    expectedCategory: 'ADULT',
  },
  // 20
  {
    id: 20,
    description: '"Violence is never okay" — safe sentence, no blocklist keyword hit',
    // None of the violence phrases (gore, torture, beheading, massacre, kill yourself, kill all)
    // appear in this sentence; the word "Violence" alone is not a rule.
    input: { searchQuery: 'Violence is never okay' },
    expectedDecision: 'ALLOW',
  },
  // 21
  {
    id: 21,
    description: 'Wikipedia with EDUCATIONAL blocked in policy falls through to blocklist/keyword; no blocklist entry → ALLOW',
    input: { domain: 'wikipedia.org' },
    policy: { blockedCategories: ['EDUCATIONAL'] },
    // wikipedia.org is not on the domain blocklist; no keyword match → DEFAULT ALLOW
    expectedDecision: 'ALLOW',
  },
  // 22
  {
    id: 22,
    description: '"medical breast surgery explained" is reviewed due to educational context',
    input: { pageText: 'medical breast surgery explained' },
    expectedDecision: 'REVIEW',
  },
];

// ─── Test runner ──────────────────────────────────────────────────────────────

/**
 * Execute all test cases and return a summary with per-case results.
 * Does not throw — failures are captured in the results array.
 */
export function runFilterTests(): TestRunSummary {
  let passed = 0;
  let failed = 0;
  const results: TestCaseResult[] = [];

  for (const tc of TEST_CASES) {
    let result: ReturnType<typeof filterContent> | null = null;
    let error: string | undefined;

    try {
      result = filterContent(tc.input, tc.policy);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    const actualDecision = result?.decision ?? ('ERROR' as FilterDecision);
    const actualCategory = result?.category ?? ('UNKNOWN' as FilterCategory);

    const decisionMatch = actualDecision === tc.expectedDecision;
    const categoryMatch =
      tc.expectedCategory === undefined || actualCategory === tc.expectedCategory;
    const confidenceMatch =
      tc.expectedConfidence === undefined || result?.confidence === tc.expectedConfidence;

    const testPassed = decisionMatch && categoryMatch && confidenceMatch && !error;

    if (testPassed) {
      passed++;
    } else {
      failed++;
    }

    results.push({
      id: tc.id,
      description: tc.description,
      passed: testPassed,
      expectedDecision: tc.expectedDecision,
      actualDecision,
      expectedCategory: tc.expectedCategory,
      actualCategory,
      ruleId: result?.ruleId ?? 'N/A',
      explanation: result?.explanation ?? '',
      error,
    });
  }

  return { passed, failed, results };
}
