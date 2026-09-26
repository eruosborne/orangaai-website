// api/admin-exposure.js
// Captures a completed Admin Exposure Score quiz: logs it to a Google Sheet
// (the persistent record), pings the host by email, and sends the person a
// plain-text email from Eru with their score and what Oranga Core would do
// about their biggest gap (both emails best-effort only — see appendToSheet
// vs notifyHost, same pattern as api/giveaway.js).
// POST /api/admin-exposure  { email, score, answers: number[6] }

const { google } = require('googleapis');

function getGoogleAuth() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return auth;
}

function getSheetsAuth() {
  const { SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET, SHEETS_REFRESH_TOKEN } = process.env;
  if (!SHEETS_CLIENT_ID || !SHEETS_CLIENT_SECRET || !SHEETS_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: SHEETS_REFRESH_TOKEN });
  return auth;
}

function bandFor(score) {
  if (score <= 5) return 'Low';
  if (score <= 11) return 'Moderate';
  return 'High';
}

async function appendToSheet(auth, entry) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.ADMIN_EXPOSURE_SHEET_ID,
    range: 'Entries!A:J',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toISOString(),
        entry.email,
        entry.score,
        bandFor(entry.score),
        entry.answers[0], entry.answers[1], entry.answers[2],
        entry.answers[3], entry.answers[4], entry.answers[5],
      ]],
    },
  });
}

async function notifyHost(auth, entry) {
  const gmail = google.gmail({ version: 'v1', auth });
  const fromEmail = process.env.HOST_EMAIL || 'eruosborne@orangaai.com';
  const fromName  = process.env.HOST_NAME  || 'Eru Osborne';
  const toEmail   = process.env.ADMIN_EXPOSURE_NOTIFY_EMAIL || process.env.HOST_EMAIL || 'eruosborne@orangaai.com';

  const subject = 'New Admin Exposure Score result - ' + bandFor(entry.score) + ' (' + entry.score + ')';
  const body = [
    'Email: ' + entry.email,
    'Score: ' + entry.score + ' (' + bandFor(entry.score) + ')',
    'Answers (q1-q6): ' + entry.answers.join(', '),
  ].join('\n');

  const message = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: ${toEmail}`,
    `Reply-To: ${entry.email}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\n');

  const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
}

const MAX_SCORE = 17; // 3+3+3+3+2+3, matches the quiz page
const BOOK_URL = 'https://www.orangaai.com/strategy-call';

// Index matches QUESTION_LABELS on admin-exposure.html.
const TOP_GAP = [
  { label: 'admin bleeding into your evenings and weekends',
    fix: "Here's what Oranga Core would do about that. Before you sit down each morning, the dawn run has already cleared what it safely can, and leaves you one short note: done, needs you, couldn't move." },
  { label: 'a real risk of losing a job or client to something slipping through',
    fix: "Here's what Oranga Core would do about that. The mailroom sorts your inbox all day and drafts replies in your own voice, so enquiries and follow-ups don't sit waiting until you get to them." },
  { label: 'business knowledge that only lives in your head',
    fix: "Here's what Oranga Core would do about that. It starts by getting your business written down once: your prices, your customers, how you work. After that it isn't only in your head." },
  { label: 'having to re-explain your business to AI every time you use it',
    fix: "Here's what Oranga Core would do about that. Your business is written down once, and it reads that before every job, so you never start from scratch." },
  { label: "time you'd actually put to good use if you had it back",
    fix: "Here's what Oranga Core would do about that. The routine admin gets prepared for you, so it's finished by the time you get home." },
  { label: "a business that's already stretched, with no room to take on more",
    fix: "Here's what Oranga Core would do about that. It fixes the admin foundation first, so the business can take on more work without more dropped balls." },
];

const HOW_IT_WORKS = "It runs on your laptop, reads your business written down (your prices, your customers, how you write), and follows playbooks for jobs like quoting and replying. It prepares the work and you approve it. It never sends, spends or signs anything on its own.";
const PROOF = "One civil construction business had it find a payment condition buried in a 30-page contract. They recovered $20,000 they wouldn't have chased.";
const SIGNATURE = [
  'Eru Osborne',
  'FOUNDER · ORANGA AI',
  '"We build the AI. You run the business."',
  '📞 0424 955 238',
  '🌐 www.orangaai.com',
  '📅 Book a time: ' + BOOK_URL,
].join('\n');

// Score is recomputed from the answers rather than trusting the client.
function buildEmail(answers) {
  const score = answers.reduce((a, b) => a + b, 0);
  const band = bandFor(score).toLowerCase();
  let top = 0;
  for (let i = 1; i < answers.length; i++) if (answers[i] > answers[top]) top = i;
  const gap = answers[top] > 0 ? TOP_GAP[top] : null;

  const lines = [
    'Hey,',
    '',
    'Thanks for taking the quiz. You scored ' + score + ' out of ' + MAX_SCORE + ', which is ' + band + ' exposure.' +
      (gap ? ' Your answers pointed most strongly to ' + gap.label + '.' : ''),
    '',
  ];
  if (gap) lines.push(gap.fix, '');
  lines.push(
    HOW_IT_WORKS,
    '',
    PROOF,
    '',
    "If you'd like to see how it would work in your business, book a free 30 minute strategy call and I'll show you: " + BOOK_URL,
    '',
    'Cheers,',
    SIGNATURE
  );
  return { subject: 'Your Admin Exposure Score: ' + score + ' out of ' + MAX_SCORE, body: lines.join('\n') };
}

// Strict on purpose: this address goes into a To header, so no commas,
// spaces, angle brackets or quotes (stops extra recipients being smuggled in).
function isSafeRecipient(email) {
  return /^[^\s,;<>"]+@[^\s,;<>"]+\.[^\s,;<>"]+$/.test(email);
}

async function alreadyEntered(auth, email) {
  const sheets = google.sheets({ version: 'v4', auth });
  const r = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.ADMIN_EXPOSURE_SHEET_ID,
    range: 'Entries!B:B',
  });
  const target = email.trim().toLowerCase();
  return (r.data.values || []).some(row => (row[0] || '').trim().toLowerCase() === target);
}

async function sendToProspect(auth, email, answers) {
  const gmail = google.gmail({ version: 'v1', auth });
  const fromEmail = process.env.HOST_EMAIL || 'eruosborne@orangaai.com';
  const { subject, body } = buildEmail(answers);
  const message = [
    `From: "Eru Osborne" <${fromEmail}>`,
    `To: ${email}`,
    `Reply-To: ${fromEmail}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf8').toString('base64').replace(/(.{76})/g, '$1\n'),
  ].join('\n');
  const encoded = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encoded } });
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(data)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const entry = await parseBody(req);

  if (!entry.email || !/\S+@\S+\.\S+/.test(entry.email)) {
    return res.status(400).json({ error: "That doesn't look like a valid email." });
  }
  if (typeof entry.score !== 'number' || !Array.isArray(entry.answers) || entry.answers.length !== 6) {
    return res.status(400).json({ error: 'Missing quiz result — please retake the quiz.' });
  }

  const sheetsAuth = getSheetsAuth();
  if (!sheetsAuth || !process.env.ADMIN_EXPOSURE_SHEET_ID) {
    return res.status(503).json({ error: 'This isn\'t connected yet. Check back soon.' });
  }

  // One email per address ever: check before this entry is written. If the
  // check fails we skip the prospect email rather than risk sending twice.
  let seenBefore = true;
  try {
    seenBefore = await alreadyEntered(sheetsAuth, entry.email);
  } catch (e) {
    console.error('admin-exposure duplicate check error (prospect email skipped)', e.message);
  }

  try {
    await appendToSheet(sheetsAuth, entry);
  } catch (e) {
    console.error('admin-exposure sheet write error', e.message);
    return res.status(500).json({ error: "We couldn't save that just now — please try again." });
  }

  // Best-effort notification — the sheet row above is the real record, so a
  // failure here doesn't fail the entry. Just log it.
  const gmailAuth = getGoogleAuth();
  if (gmailAuth) {
    try {
      await notifyHost(gmailAuth, entry);
    } catch (e) {
      console.error('admin-exposure notify email error (entry still saved to sheet)', e.message);
    }

    // Plain-text email from Eru to the person who took the quiz.
    if (!seenBefore && isSafeRecipient(entry.email) && entry.answers.every(a => Number.isInteger(a) && a >= 0 && a <= 3)) {
      try {
        await sendToProspect(gmailAuth, entry.email.trim(), entry.answers);
      } catch (e) {
        console.error('admin-exposure prospect email error (entry still saved to sheet)', e.message);
      }
    }
  }

  return res.status(200).json({ ok: true });
};

module.exports.buildEmail = buildEmail; // exposed for local testing
