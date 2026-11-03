/**
 * routes/events.js
 *
 * POST /events              – child records a safety event
 * GET  /events/:parentId    – parent retrieves events for their paired children
 */

'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Creates the events router with injected stores.
 *
 * @param {Map} eventsStore   id → event
 * @param {Map} relationships childId → parentId
 */
function createEventsRouter(eventsStore, relationships) {

  // ── POST /events ──────────────────────────────────────────────────────────
  // Child records a safety event.
  router.post('/', requireAuth, requireRole('child'), (req, res) => {
    const childId = req.user.id;
    const { type, detail } = req.body;

    if (!type || typeof type !== 'string' || type.trim() === '') {
      return res.status(400).json({ error: 'Event type is required.' });
    }

    const event = {
      id: uuidv4(),
      childId,
      type: type.trim(),
      detail: typeof detail === 'string' ? detail.trim() : '',
      timestamp: new Date().toISOString(),
    };

    eventsStore.set(event.id, event);

    return res.status(201).json({ id: event.id, message: 'Event recorded.' });
  });

  // ── GET /events/:parentId ─────────────────────────────────────────────────
  // Authenticated parent retrieves all events for their paired children.
  router.get('/:parentId', requireAuth, requireRole('parent'), (req, res) => {
    const { parentId } = req.params;
    const { id } = req.user;

    // Parents may only query their own events
    if (id !== parentId) {
      return res.status(403).json({ error: 'You can only view events for your own children.' });
    }

    // Collect childIds whose parent is this user
    const childIds = new Set();
    for (const [childId, pid] of relationships.entries()) {
      if (pid === id) childIds.add(childId);
    }

    const result = [];
    for (const event of eventsStore.values()) {
      if (childIds.has(event.childId)) {
        result.push(event);
      }
    }

    result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return res.status(200).json({ events: result });
  });

  return router;
}

module.exports = { createEventsRouter };
