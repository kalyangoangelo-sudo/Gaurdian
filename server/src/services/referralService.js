'use strict';

/**
 * services/referralService.js
 *
 * Referral service — sends case referrals to simulated or real external agencies.
 *
 * Supports a configurable partner registry. Each partner has:
 *   - name: Display name
 *   - endpoint: HTTP URL for the referral API
 *   - authHeader: Optional Authorization header value
 *   - dataMapping: What fields to send (minimal disclosure)
 *   - simulated: true if this is a mock/test partner
 *
 * The default partner is the WireMock stub (simulated).
 * Real partners require verified partnerships and credentials.
 *
 * Environment variables:
 *   REFERRAL_ENDPOINT_URL  – URL of the default (WireMock) referral service
 *   REFERRAL_TIMEOUT_MS    – request timeout (default: 5000)
 *
 * If the partner service is unavailable, returns a fallback simulated response.
 * Never throws.
 */

const crypto = require('crypto');
const http = require('http');
const https = require('https');

// ─── Partner Registry ────────────────────────────────────────────
// Each partner defines how referrals are sent and what data is disclosed.
// Only authorized, verified partners should be added here.
// Simulated partners are clearly labeled.

const PARTNERS = {
  'childline-116': {
    name: 'Childline Uganda 116',
    serviceName: 'Childline Uganda 116',
    endpoint: process.env.REFERRAL_ENDPOINT_URL || 'http://localhost:8080/referral',
    authHeader: null,
    timeoutMs: parseInt(process.env.REFERRAL_TIMEOUT_MS || '5000', 10),
    simulated: true,
    // Minimal data disclosure — only send what the partner needs
    dataFields: ['referralId', 'caseId', 'service', 'timestamp'],
    description: 'Simulated Child Helpline 116 referral via WireMock stub.',
  },
  'police-cpu': {
    name: 'Uganda Police Child Protection Unit',
    serviceName: 'Uganda Police Child Protection Unit',
    endpoint: process.env.POLICE_REFERRAL_URL || null, // Not configured — simulated
    authHeader: null,
    timeoutMs: 5000,
    simulated: true,
    dataFields: ['referralId', 'caseId', 'service', 'timestamp', 'category', 'priority'],
    description: 'Simulated — real integration requires verified partnership and credentials.',
  },
  'unicef': {
    name: 'UNICEF Uganda',
    serviceName: 'UNICEF Uganda',
    endpoint: process.env.UNICEF_REFERRAL_URL || null,
    authHeader: null,
    timeoutMs: 5000,
    simulated: true,
    dataFields: ['referralId', 'caseId', 'service', 'timestamp'],
    description: 'Simulated — real integration requires verified partnership.',
  },
  'save-children': {
    name: 'Save the Children Uganda',
    serviceName: 'Save the Children Uganda',
    endpoint: process.env.SAVE_CHILDREN_REFERRAL_URL || null,
    authHeader: null,
    timeoutMs: 5000,
    simulated: true,
    dataFields: ['referralId', 'caseId', 'service', 'timestamp'],
    description: 'Simulated — real integration requires verified partnership.',
  },
  'ministry-gender': {
    name: 'Ministry of Gender Uganda',
    serviceName: 'Ministry of Gender Uganda',
    endpoint: process.env.MINISTRY_REFERRAL_URL || null,
    authHeader: null,
    timeoutMs: 5000,
    simulated: true,
    dataFields: ['referralId', 'caseId', 'service', 'timestamp', 'category'],
    description: 'Simulated — real integration requires verified partnership.',
  },
};

// Legacy service list (for backward compatibility)
const SERVICES = Object.values(PARTNERS).map(p => p.serviceName);

/**
 * Make an HTTP request to a partner endpoint.
 */
function postJSON(url, body, timeoutMs, authHeader) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;

    const data = JSON.stringify(body);

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (authHeader) headers['Authorization'] = authHeader;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, json: JSON.parse(responseBody) });
          } catch {
            resolve({ status: res.statusCode, json: null, raw: responseBody });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Create a referral for a case to a specific partner.
 * Only sends the data fields defined in the partner's dataMapping (minimal disclosure).
 * Caseworker must approve the referral before this is called.
 *
 * @param {string} caseId
 * @param {string} [requestedService]
 * @returns {Promise<object>}
 */
async function makeReferral(caseId, requestedService) {
  // Find the matching partner
  let partner = null;
  for (const p of Object.values(PARTNERS)) {
    if (p.serviceName === requestedService) {
      partner = p;
      break;
    }
  }

  // If no specific partner matched, use the default (Childline 116)
  if (!partner) {
    partner = PARTNERS['childline-116'];
    if (requestedService && SERVICES.includes(requestedService)) {
      partner = Object.values(PARTNERS).find(p => p.serviceName === requestedService) || partner;
    }
  }

  const referralId = 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase();

  // Build the referral payload with minimal data disclosure
  const fullPayload = {
    referralId,
    caseId,
    service: partner.serviceName,
    timestamp: new Date().toISOString(),
  };

  // Only include fields the partner is authorized to receive
  const payload = {};
  for (const field of partner.dataFields) {
    if (fullPayload[field] !== undefined) {
      payload[field] = fullPayload[field];
    }
  }

  // Try to call the partner endpoint
  if (partner.endpoint) {
    try {
      const response = await postJSON(
        partner.endpoint,
        payload,
        partner.timeoutMs,
        partner.authHeader
      );

      if (response.status === 200 && response.json) {
        return {
          referralId,
          service: partner.serviceName,
          status: response.json.status || 'SENT',
          simulated: partner.simulated,
          simulatedAt: new Date().toISOString(),
          acknowledgment: partner.simulated
            ? '⚠️ SIMULATED — This referral was processed by a mock service. No real agency was contacted.'
            : 'Referral acknowledged by partner service.',
          partner: partner.name,
          mockResponse: response.json,
          dataDisclosed: Object.keys(payload),
        };
      } else {
        return {
          referralId,
          service: partner.serviceName,
          status: 'SIMULATED',
          simulated: true,
          simulatedAt: new Date().toISOString(),
          acknowledgment: '⚠️ SIMULATED — Partner endpoint returned an error. No real agency was contacted.',
          partner: partner.name,
          mockError: response.status,
          dataDisclosed: Object.keys(payload),
        };
      }
    } catch (err) {
      // Partner endpoint unavailable — fallback to in-process simulation
      return {
        referralId,
        service: partner.serviceName,
        status: 'SIMULATED',
        simulated: true,
        simulatedAt: new Date().toISOString(),
        acknowledgment: '⚠️ SIMULATED — Referral service was unavailable. Falling back to in-process simulation. No real agency was contacted.',
        partner: partner.name,
        fallback: true,
        error: err.message,
        dataDisclosed: Object.keys(payload),
      };
    }
  } else {
    // No endpoint configured — simulated only
    return {
      referralId,
      service: partner.serviceName,
      status: 'SIMULATED',
      simulated: true,
      simulatedAt: new Date().toISOString(),
      acknowledgment: '⚠️ SIMULATED — No endpoint configured for this partner. No real agency was contacted.',
      partner: partner.name,
      description: partner.description,
      dataDisclosed: Object.keys(payload),
    };
  }
}

/**
 * List all available referral partners.
 * Useful for the caseworker UI to show available services.
 */
function listPartners() {
  return Object.entries(PARTNERS).map(([key, p]) => ({
    id: key,
    name: p.name,
    serviceName: p.serviceName,
    simulated: p.simulated,
    description: p.description,
    configured: !!p.endpoint,
  }));
}

module.exports = { makeReferral, listPartners, SIMULATED_SERVICES: SERVICES, PARTNERS };
