// api/newsletter.js
// Takes a newsletter sign-up: logs the email to the Google Sheet (tab "Newsletter",
// created on first use) and sends a short welcome email from Eru. Best-effort email,
// the sheet row is the record. Same sheet and credentials as the webinar sign-ups.
// POST /api/newsletter  { email, source? }

const { google } = require('googleapis');
const B = require('./_booking');
const { checkEmail } = require('./_email-check');

const TAB = 'Newsletter';

function clean(v, max) {
  return typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

function getSheetsAuth() {
  const { SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET, SHEETS_REFRESH_TOKEN } = process.env;
  if (!SHEETS_CLIENT_ID || !SHEETS_CLIENT_SECRET || !SHEETS_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: SHEETS_REFRESH_TOKEN });
  return auth;
}

// Tab "Newsletter", columns: subscribed_at, email, source. Creates the tab if it is missing.
async function appendSignup(row) {
  const auth = getSheetsAuth();
  const spreadsheetId = process.env.WEBINAR_SHEET_ID;
  if (!auth || !spreadsheetId) throw new Error('WEBINAR_SHEET_ID or the Sheets credentials are not set');
  const sheets = google.sheets({ version: 'v4', auth });
  const append = () => sheets.spreadsheets.values.append({
    spreadsheetId, range: `${TAB}!A:C`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  try {
    await append();
  } catch (e) {
    if (!/Unable to parse range/i.test(e.message || '')) throw e;
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] } });
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${TAB}!A:C`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [['subscribed_at', 'email', 'source'], row] },
    });
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await B.parseBody(req);
  const source = clean(body.source, 80);
  const check = await checkEmail(clean(body.email, 200));
  if (!check.ok) return res.status(400).json({ error: check.error, suggestion: check.suggestion });
  const email = check.email;

  try {
    await appendSignup([new Date().toISOString(), email, source]);
  } catch (e) {
    console.error(`[newsletter] SHEET ROW FAILED for ${email}:`, e.message);
    return res.status(502).json({ error: "We couldn't save that just now. Please try again in a minute." });
  }

  try {
    const auth = B.getGoogleAuth();
    if (!auth) throw new Error('Google is not configured');
    await B.sendEmail(auth, {
      toName: '', toEmail: email,
      subject: "You're on the list",
      body: [
        'Hey,',
        '',
        "You're signed up to the AI brain newsletter. I'll send the first issue soon.",
        '',
        'If you ever want off the list, reply to any issue and say so.',
        '',
        'Cheers,', 'Eru Osborne', 'Founder, Oranga AI', 'orangaai.com',
      ].join('\n'),
    });
  } catch (e) {
    console.error(`[newsletter] WELCOME EMAIL FAILED for ${email}:`, e.message);
  }
  return res.status(200).json({ ok: true });
};
