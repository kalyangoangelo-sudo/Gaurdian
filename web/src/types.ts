/**
 * Shared types for the GuardianLink web application.
 */

export type Role = 'child' | 'parent' | 'teacher' | 'caseworker' | 'admin';
export type Lang = 'en' | 'lg';

export interface AuthUser {
  id: string;
  username: string;
  role: Role;
  token: string;
}

export interface CaseSummary {
  id: string;
  caseRef: string;
  category: string;
  status: string;
  priority: string;
  humanPriority: string | null;
  aiResult: {
    suggestedPriority: string | null;
    requiresHumanReview: boolean;
    summary?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  submittedByRole: string;
  anonymous: boolean;
}

export interface CaseDetail {
  id: string;
  caseRef: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  humanPriority: string | null;
  aiResult: {
    suggestedPriority: string;
    category: string | null;
    indicators: string[];
    confidence: number;
    requiresHumanReview: boolean;
    criticalSafetyFlag: boolean;
    summary?: string;
  } | null;
  notes: { text: string; by: string; at: string }[];
  referrals: { referralId: string; service: string; status: string; simulated: boolean; acknowledgment: string }[];
  auditTrail: { action: string; by: string; at: string; status?: string; humanPriority?: string; service?: string }[];
  childResponse?: string | null;
  responseTemplate?: string | null;
  submittedByRole: string;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
  encryptedTokenMap?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  ageBand: string;
  category: string;
  hasQuiz: boolean;
}

export interface LessonDetail {
  id: string;
  title: string;
  description: string;
  content: string;
  ageBand: string;
  category: string;
  quiz: { question: string; options: string[]; correctAnswer: number }[] | null;
}

export interface AccessRequest {
  id: string;
  childId: string;
  parentId: string;
  url: string;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
  decidedAt: string | null;
}

export interface SafeSignal {
  id: string;
  childId: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

export interface CuriosityQuestion {
  id: string;
  questionRef: string;
  question: string;
  category: string;
  status: string;
  isSeriousFlag: boolean;
  aiAssessment: {
    suggestedPriority: string;
    category: string | null;
    indicators: string[];
    criticalSafetyFlag: boolean;
  };
  createdAt: string;
}

export interface ReportResult {
  caseRef: string;
  recoverySecret: string;
}
