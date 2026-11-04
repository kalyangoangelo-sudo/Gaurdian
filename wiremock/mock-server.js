'use strict';

/**
 * wiremock/mock-server.js
 *
 * Simple HTTP mock server that simulates the Child Helpline 116
 * referral endpoint. Acts as a WireMock-compatible stub.
 *
 * WireMock mappings are also provided in wiremock/mappings/ for
 * running with the actual WireMock Java application.
 *
 * Usage:
 *   node wiremock/mock-server.js [port]
 *
 * Default port: 8080
 */

const http = require('http');

const PORT = parseInt(process.argv[2] || process.env.WIREMOCK_PORT || '8080', 10);

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/referral') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        console.log(`[WireMock Stub] Received referral: ${data.referralId} for case ${data.caseId} → ${data.service}`);

        // Simulate processing delay
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ACKNOWLEDGED',
            referralId: data.referralId,
            receivedAt: new Date().toISOString(),
            message: 'Referral received and acknowledged by simulated Child Helpline 116 service.',
            estimatedResponseTime: '24 hours',
            caseWorker: 'CW-' + Math.floor(Math.random() * 9000 + 1000),
          }));
        }, 200);
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body.' }));
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'WireMock Stub — Child Helpline 116' }));
    return;
  }

  // Simulate WireMock admin endpoint
  if (req.url === '/__admin/mappings') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      mappings: [
        {
          id: 'child-helpline-referral',
          url: '/referral',
          method: 'POST',
          status: 200,
          response: { status: 'ACKNOWLEDGED' },
        },
      ],
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found.' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n[WireMock Stub] Mock referral service running on port ${PORT}`);
  console.log(`  Referral endpoint: POST http://localhost:${PORT}/referral`);
  console.log(`  Health check:      GET  http://localhost:${PORT}/health`);
  console.log(`\n  ⚠️ SIMULATED — No real agency is contacted. For demonstration only.\n`);
});

module.exports = server;
