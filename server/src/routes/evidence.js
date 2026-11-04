/**
 * routes/evidence.js
 *
 * Evidence upload and integrity verification.
 *
 * Routes:
 *   POST /evidence/:caseId            – upload a file (any authenticated user)
 *   GET  /evidence/verify/:evidenceId – verify SHA-256 integrity (caseworker)
 *   GET  /evidence/:caseId            – list evidence for a case (caseworker)
 */

'use strict';

const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
});

function createEvidenceRouter(EVIDENCE, CASES) {
  const router = express.Router();

  // ── GET /evidence/verify/:evidenceId  (must come BEFORE /:caseId) ─────────
  router.get('/verify/:evidenceId', requireAuth, requireRole('caseworker'), (req, res) => {
    const ev = EVIDENCE.get(req.params.evidenceId);
    if (!ev) return res.status(404).json({ error: 'Evidence not found.' });

    const currentHash = crypto
      .createHash('sha256')
      .update(Buffer.from(ev.data, 'base64'))
      .digest('hex');

    const verified = currentHash === ev.sha256;

    return res.status(200).json({
      status: verified ? 'VERIFIED' : 'TAMPERED',
      storedHash: ev.sha256,
      currentHash,
      filename: ev.filename,
    });
  });

  // ── POST /evidence/:caseId ─────────────────────────────────────────────────
  // Only the case's submitting child, or a caseworker, may upload evidence.
  // Enforces case ownership to prevent IDOR.
  router.post('/:caseId', requireAuth, (req, res, next) => {
    const { caseId } = req.params;

    // Authorization check: caseworker may always upload; child must own the case.
    const c = CASES.get(caseId);
    if (!c) return res.status(404).json({ error: 'Case not found.' });

    if (req.user.role !== 'caseworker') {
      // Non-caseworker can only upload to their own case
      if (c.childId && c.childId !== req.user.id) {
        return res.status(403).json({ error: 'You are not authorized to upload evidence to this case.' });
      }
    }

    // Accept both multipart/form-data (file upload) and application/json (demo synthetic evidence)
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      // JSON path: synthetic demo evidence
      try {
        const { filename, mimeType, content } = req.body;
        if (!filename) return res.status(400).json({ error: 'filename is required.' });

        const { caseId } = req.params;
        const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
        const buffer = Buffer.from(content || filename);
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const now = new Date().toISOString();

        const evidence = {
          id, caseId,
          filename: filename,
          mimetype: mimeType || 'text/plain',
          size: buffer.length,
          sha256,
          data: buffer.toString('base64'),
          uploadedBy: req.user.id,
          uploadedAt: now,
        };

        EVIDENCE.set(id, evidence);
        return res.status(201).json({ id, caseId, filename, size: buffer.length, sha256, uploadedAt: now });
      } catch (err) {
        return next(err);
      }
    }

    // Multipart path: real file upload via multer
    upload.single('file')(req, res, (err) => {
      if (err) return next(err);
      try {
      if (!req.file) {
        return res.status(400).json({ error: 'A file is required (field: file).' });
      }

      if (!ALLOWED_MIMETYPES.has(req.file.mimetype)) {
        return res.status(400).json({
          error: `File type not allowed. Allowed types: ${Array.from(ALLOWED_MIMETYPES).join(', ')}`,
        });
      }

      const { caseId } = req.params;
      const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
      const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
      const now = new Date().toISOString();

      const evidence = {
        id, caseId,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        sha256,
        data: req.file.buffer.toString('base64'),
        uploadedBy: req.user.id,
        uploadedAt: now,
      };

      EVIDENCE.set(id, evidence);
      return res.status(201).json({ id, caseId, filename: evidence.filename, size: evidence.size, sha256, uploadedAt: now });
      } catch (err) { return next(err); }
    });
  });

  // ── GET /evidence/:caseId ──────────────────────────────────────────────────
  router.get('/:caseId', requireAuth, requireRole('caseworker'), (req, res) => {
    const { caseId } = req.params;
    const items = [];

    for (const ev of EVIDENCE.values()) {
      if (ev.caseId === caseId) {
        // Recalculate integrity status without exposing raw data
        const currentHash = crypto
          .createHash('sha256')
          .update(Buffer.from(ev.data, 'base64'))
          .digest('hex');

        items.push({
          id: ev.id,
          caseId: ev.caseId,
          filename: ev.filename,
          mimetype: ev.mimetype,
          size: ev.size,
          sha256: ev.sha256,
          uploadedAt: ev.uploadedAt,
          integrityStatus: currentHash === ev.sha256 ? 'VERIFIED' : 'TAMPERED',
        });
      }
    }

    return res.status(200).json(items);
  });

  return router;
}

module.exports = { createEvidenceRouter };
