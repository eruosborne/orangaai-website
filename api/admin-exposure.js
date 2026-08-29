// api/admin-exposure.js
// Captures a completed Admin Exposure Score quiz: logs it to a Google Sheet
// (the persistent record) and pings the host by email (best-effort only —
// see appendToSheet vs notifyHost, same pattern as api/giveaway.js).
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
  }

  return res.status(200).json({ ok: true });
};
