// api/_email-check.js
// Checks an email address is worth accepting before a form saves it: written
// properly, not a known typo of a big provider, not a throwaway inbox, and on
// a domain that can actually receive mail (DNS MX lookup, A record fallback).
// It can't prove a specific inbox exists. A DNS timeout or server error lets
// the address through, so a slow lookup never costs a real lead.
// Not a route (underscore prefix): require it from the handlers.

const dns = require('dns').promises;

const DNS_TIMEOUT_MS = 3000;

// Known misspellings of common providers, mapped to the real domain.
const TYPO_DOMAINS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com', 'gmal.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com', 'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com',
  'outlook.co': 'outlook.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com', 'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com', 'bigpond.co': 'bigpond.com', 'bigpong.com': 'bigpond.com',
};

// Endings that are almost always a slip of the finger.
const TYPO_ENDINGS = { '.con': '.com', '.cmo': '.com', '.ocm': '.com', '.comm': '.com', '.co.nzz': '.co.nz' };

const THROWAWAY_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'guerrillamail.com', 'guerrillamail.net',
  '10minutemail.com', 'temp-mail.org', 'tempmail.com', 'sharklasers.com',
  'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc',
]);

const NOT_FOUND = "We couldn't find that email address. Check it for a typo?";
const BAD_FORMAT = "That doesn't look like a valid email.";

function suggestDomain(domain) {
  if (TYPO_DOMAINS[domain]) return TYPO_DOMAINS[domain];
  for (const end of Object.keys(TYPO_ENDINGS)) {
    if (domain.endsWith(end)) return domain.slice(0, -end.length) + TYPO_ENDINGS[end];
  }
  return null;
}

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), DNS_TIMEOUT_MS)),
  ]);
}

const MISSING = new Set(['ENOTFOUND', 'ENODATA']);

// true = can receive mail, false = domain doesn't exist or has no mail setup,
// null = couldn't tell (timeout or DNS error), which the caller treats as ok.
async function domainTakesMail(domain) {
  try {
    const mx = await withTimeout(dns.resolveMx(domain));
    if (mx && mx.length) return true;
  } catch (e) {
    if (!MISSING.has(e.code)) return null;
  }
  try {
    const a = await withTimeout(dns.resolve4(domain));
    return !!(a && a.length);
  } catch (e) {
    return MISSING.has(e.code) ? false : null;
  }
}

async function checkEmail(raw) {
  const email = String(raw || '').trim();
  const at = email.lastIndexOf('@');
  if (at < 1 || email.indexOf('@') !== at) return { ok: false, error: BAD_FORMAT };

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const badChars = /[\s,;<>"()\[\]\\]/;
  if (
    local.length > 64 || badChars.test(local) || badChars.test(domain) ||
    local.startsWith('.') || local.endsWith('.') || local.includes('..') ||
    domain.includes('..') || domain.startsWith('.') || domain.startsWith('-') ||
    !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)
  ) {
    return { ok: false, error: BAD_FORMAT };
  }

  const fix = suggestDomain(domain);
  if (fix) {
    const suggestion = local + '@' + fix;
    return { ok: false, error: 'Did you mean ' + suggestion + '?', suggestion };
  }

  if (THROWAWAY_DOMAINS.has(domain)) {
    return { ok: false, error: 'Please use your real email address.' };
  }

  if (await domainTakesMail(domain) === false) return { ok: false, error: NOT_FOUND };

  return { ok: true, email: local + '@' + domain };
}

module.exports = { checkEmail };
