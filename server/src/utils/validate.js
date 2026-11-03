/**
 * validate.js
 *
 * Shared validation helpers.
 */

/**
 * Validates that a string is a well-formed HTTP or HTTPS URL.
 *
 * Rejects:
 *  - Non-HTTP/HTTPS schemes (ftp://, javascript://, etc.)
 *  - URLs with embedded credentials (http://user:pass@host)
 *  - Empty or non-string values
 *
 * @param {string} raw  The URL string from user input
 * @returns {{ valid: boolean, url?: URL, reason?: string }}
 */
function validateUrl(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    return { valid: false, reason: 'URL must be a non-empty string.' };
  }

  let parsed;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { valid: false, reason: 'URL is not well-formed.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only http:// and https:// URLs are accepted.' };
  }

  // Reject embedded credentials: http://user:pass@host or http://user@host
  if (parsed.username !== '' || parsed.password !== '') {
    return { valid: false, reason: 'URLs with embedded credentials are not allowed.' };
  }

  // Reject bare IP-less or host-less URLs (e.g. "https:///path")
  if (!parsed.hostname) {
    return { valid: false, reason: 'URL must include a hostname.' };
  }

  return { valid: true, url: parsed };
}

/**
 * Validates a decision value from a parent.
 * @param {string} decision
 * @returns {boolean}
 */
function isValidDecision(decision) {
  return decision === 'approved' || decision === 'denied';
}

module.exports = { validateUrl, isValidDecision };
