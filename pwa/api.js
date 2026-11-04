/**
 * api.js — GuardianLink PWA API client
 *
 * Handles all communication with the Express backend.
 * Maps picture categories to server-side VALID_CATEGORIES.
 */
(function () {
  'use strict';

  const BASE = window.GUARDIAN_CONFIG.API_BASE_URL;

  // Picture category → server VALID_CATEGORIES mapping
  const CATEGORY_MAP = {
    bullying: 'Cyberbullying',
    threats: 'Threats',
    private_pics: 'Sextortion',
    harassment: 'Online Harassment',
    impersonation: 'Impersonation',
    unwanted: 'Online Harassment',
    other: 'Other',
  };

  /**
   * Submit an anonymous report.
   * @param {object} params - { pictureCategory, description, pastedText, safeToContact }
   * @returns {Promise<{ caseRef: string, recoverySecret: string }>}
   */
  async function submitReport(params) {
    const category = CATEGORY_MAP[params.pictureCategory] || 'Other';

    // Combine description and pasted text into a single report
    let description = '';
    if (params.description && params.description.trim()) {
      description += params.description.trim();
    }
    if (params.pastedText && params.pastedText.trim()) {
      if (description) description += '\n\n--- Pasted message ---\n';
      description += params.pastedText.trim();
    }
    if (!description) {
      // Picture-only report — use the category as a minimal description
      description = `[Picture category: ${category}]`;
    }

    const body = {
      category,
      description,
      safeToContact: params.safeToContact !== false,
    };

    const res = await fetch(`${BASE}/reports/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Failed to submit report');
    }

    return res.json();
  }

  /**
   * Check case status using caseRef + recoverySecret.
   * @param {string} caseRef
   * @param {string} recoverySecret
   * @returns {Promise<object>}
   */
  async function checkStatus(caseRef, recoverySecret) {
    const res = await fetch(`${BASE}/reports/check-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseRef, recoverySecret }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Invalid case reference or recovery code');
    }

    return res.json();
  }

  /**
   * Submit a Curiosity Corner question.
   * Routes to the same report pipeline with category "Other".
   * @param {string} question
   * @returns {Promise<{ caseRef: string, recoverySecret: string }>}
   */
  async function submitCuriosity(question) {
    const body = {
      category: 'Other',
      description: `[Curiosity Corner question] ${question.trim()}`,
      safeToContact: false,
    };

    const res = await fetch(`${BASE}/reports/anonymous`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Failed to submit question');
    }

    return res.json();
  }

  // ─── Curiosity Corner ───────────────────────────────────────────

  /**
   * Submit a Curiosity Corner question to the backend.
   * @param {string} question
   * @returns {Promise<object>} { id, questionRef, status, response?, warning? }
   */
  async function askCuriosity(question) {
    const res = await fetch(`${BASE}/curiosity/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.trim() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Failed to submit question');
    }

    return res.json();
  }

  /**
   * Check Curiosity Corner question status.
   * @param {string} id
   * @returns {Promise<object>}
   */
  async function checkCuriosity(id) {
    const res = await fetch(`${BASE}/curiosity/${id}`);
    if (!res.ok) throw new Error('Question not found');
    return res.json();
  }

  // ─── Learning Library ──────────────────────────────────────────

  /**
   * Fetch lesson list.
   * @param {string} [lang] - 'en' or 'lg'
   * @param {string} [ageBand] - '6-9', '10-13', 'all'
   * @returns {Promise<array>}
   */
  async function getLessons(lang, ageBand) {
    let url = `${BASE}/lessons`;
    const params = new URLSearchParams();
    if (lang) params.set('lang', lang);
    if (ageBand) params.set('ageBand', ageBand);
    const qs = params.toString();
    if (qs) url += '?' + qs;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load lessons');
    return res.json();
  }

  /**
   * Get a single lesson with content.
   * @param {string} id
   * @param {string} [lang]
   * @returns {Promise<object>}
   */
  async function getLesson(id, lang) {
    let url = `${BASE}/lessons/${id}`;
    if (lang) url += '?lang=' + lang;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Lesson not found');
    return res.json();
  }

  window.GuardianAPI = { submitReport, checkStatus, submitCuriosity, askCuriosity, checkCuriosity, getLessons, getLesson, CATEGORY_MAP };
})();
