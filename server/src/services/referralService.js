'use strict';

const crypto = require('crypto');

const SERVICES = [
  'Uganda Police Child Protection Unit',
  'UNICEF Uganda',
  'Save the Children Uganda',
  'Ministry of Gender Uganda',
  'Childline Uganda 116',
];

async function makeReferral(caseId, requestedService) {
  await new Promise((r) => setTimeout(r, 200));

  const service =
    requestedService && SERVICES.includes(requestedService)
      ? requestedService
      : SERVICES[Math.floor(Math.random() * SERVICES.length)];

  return {
    referralId: 'REF-' + crypto.randomBytes(4).toString('hex').toUpperCase(),
    service,
    status: 'SIMULATED',
    simulatedAt: new Date().toISOString(),
    acknowledgment:
      '⚠️ SIMULATED — This referral was not actually sent to any external agency. For demonstration purposes only.',
    caseId,
  };
}

module.exports = { makeReferral, SIMULATED_SERVICES: SERVICES };
