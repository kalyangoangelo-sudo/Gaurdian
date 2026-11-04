/**
 * config.js — GuardianLink PWA configuration
 *
 * API_BASE_URL points to the Express backend.
 * When the PWA is served from the same server (default), use a relative path.
 * For standalone hosting, set this to the full URL, e.g. 'http://localhost:3001'.
 */
window.GUARDIAN_CONFIG = {
  API_BASE_URL: '',  // Same-origin by default; set to 'http://localhost:3001' if served separately
  APP_NAME: 'GuardianLink',
  VERSION: '1.0.0',
};
