'use strict';

/**
 * services/tokenizer.js
 *
 * Privacy tokenizer — replaces PII (emails, phone numbers, names) in text
 * with opaque tokens and stores the mapping encrypted with AES-256-CBC.
 *
 * The encryption key is read from TOKENIZER_KEY (hex-encoded 32-byte string)
 * or generated fresh for the process lifetime if the env var is absent.
 */

const crypto = require('crypto');

const KEY = process.env.TOKENIZER_KEY
  ? Buffer.from(process.env.TOKENIZER_KEY, 'hex')
  : crypto.randomBytes(32);

const ALG = 'aes-256-cbc';
const IV_LENGTH = 16;

// ── Regexes ────────────────────────────────────────────────────────────────────

// Standard email address
const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// International / local phone numbers
// Matches: +256 123 456 789, (044) 123-4567, 0712345678, etc.
const PHONE_REGEX = /(?:\+?\d[\d\s\-().]{7,}\d)/g;

// Title Case name pairs (Firstname Lastname) — two capitalised words side by side
// Excludes common sentence starters captured by EMAIL/PHONE already replaced
const NAME_REGEX = /\b([A-Z][a-z]{1,20})\s([A-Z][a-z]{1,20})\b/g;

// ── Helpers ────────────────────────────────────────────────────────────────────

function encryptTokenMap(map) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALG, KEY, iv);
  const json = JSON.stringify(map);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Replace PII in `text` with placeholder tokens and return the tokenized
 * string together with an encrypted token map.
 *
 * @param {string} text
 * @returns {{ tokenized: string, encryptedTokenMap: string }}
 */
function tokenize(text) {
  const tokenMap = {};
  let counter = { EMAIL: 0, PHONE: 0, NAME: 0 };
  let result = String(text || '');

  // Replace emails first (most specific)
  result = result.replace(EMAIL_REGEX, (match) => {
    counter.EMAIL += 1;
    const token = `[EMAIL_${counter.EMAIL}]`;
    tokenMap[token] = match;
    return token;
  });

  // Replace phone numbers
  result = result.replace(PHONE_REGEX, (match) => {
    counter.PHONE += 1;
    const token = `[PHONE_${counter.PHONE}]`;
    tokenMap[token] = match;
    return token;
  });

  // Replace Title Case name pairs
  result = result.replace(NAME_REGEX, (match) => {
    counter.NAME += 1;
    const token = `[NAME_${counter.NAME}]`;
    tokenMap[token] = match;
    return token;
  });

  const encryptedTokenMap = encryptTokenMap(tokenMap);

  return { tokenized: result, encryptedTokenMap };
}

/**
 * Decrypt an encrypted token map string back to a plain object.
 *
 * @param {string} encryptedStr  - "<iv_hex>:<ciphertext_hex>"
 * @returns {object}
 */
function decryptTokenMap(encryptedStr) {
  const [ivHex, cipherHex] = encryptedStr.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const decipher = crypto.createDecipheriv(ALG, KEY, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = { tokenize, decryptTokenMap };
