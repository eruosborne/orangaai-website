// api/giveaway.js
// Captures a giveaway entry from the site: logs it to a Google Sheet (the
// persistent record) and pings the host by email (a convenience notification,
// not the source of truth — see appendToSheet vs notifyHost below).
// POST /api/giveaway  { name, business, service, location, staff, adminHours, email, worth? }

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

async function appendToSheet(auth, entry) {
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GIVEAWAY_SHEET_ID,
    range: 'Entries!A:I',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toISOString(),
        entry.name,
        entry.business,
        entry.service,
        entry.location,
        entry.staff,
        entry.adminHours,
        entry.email,
        entry.worth || '',
      ]],
    },
  });
}

async function notifyHost(auth, entry) {
  const gmail = google.gmail({ version: 'v1', auth });
  const fromEmail = process.env.HOST_EMAIL || 'eruosborne@orangaai.com';
  const fromName  = process.env.HOST_NAME  || 'Eru Osborne';
  const toEmail   = process.env.GIVEAWAY_NOTIFY_EMAIL || process.env.HOST_EMAIL || 'eruosborne@orangaai.com';

  const subject = 'New giveaway entry - ' + entry.business;
  const lines = [
    'Name: ' + entry.name,
    'Business: ' + entry.business,
    'Service: ' + entry.service,
    'Location: ' + entry.location,
    'Staff: ' + entry.staff,
    'Admin hours per week: ' + entry.adminHours,
    'Email: ' + entry.email,
    'What 8+ hrs/week back is worth: ' + (entry.worth || '(not answered)'),
  ];
  const body = lines.join('\n');

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

const REQUIRED = ['name', 'business', 'service', 'location', 'staff', 'adminHours', 'email'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const entry = await parseBody(req);

  for (const field of REQUIRED) {
    if (!entry[field] || !String(entry[field]).trim()) {
      return res.status(400).json({ error: 'Please fill in every required field.' });
    }
  }
  if (!/\S+@\S+\.\S+/.test(entry.email)) {
    return res.status(400).json({ error: "That doesn't look like a valid email." });
  }

  const sheetsAuth = getSheetsAuth();
  if (!sheetsAuth || !process.env.GIVEAWAY_SHEET_ID) {
    return res.status(503).json({ error: 'Entries are not configured yet. Check back soon.' });
  }

  try {
    await appendToSheet(sheetsAuth, entry);
  } catch (e) {
    console.error('giveaway sheet write error', e.message);
    return res.status(500).json({ error: "We couldn't save that just now — please try again." });
  }

  // Best-effort notification — the sheet row above is the real record, so a
  // failure here doesn't fail the entry. Just log it.
  const gmailAuth = getGoogleAuth();
  if (gmailAuth) {
    try {
      await notifyHost(gmailAuth, entry);
    } catch (e) {
      console.error('giveaway notify email error (entry still saved to sheet)', e.message);
    }
  }

  return res.status(200).json({ ok: true });
};
