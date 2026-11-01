// api/webinar-register.js
// Registers someone for the live webinar: logs them to the Google Sheet (mobile included,
// Eru sends the texts himself), sends the confirmation email, and hands the three reminders to n8n for timing.
// POST /api/webinar-register  { name, email, phone, tz? }
// Same pattern as api/book.js: each step is best-effort and fails loudly in the logs,
// but only a missing name, email or mobile stops the registration.

const B = require('./_booking');
const W = require('./_webinar');
const EMAILS = require('./_webinar-emails');

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

async function scheduleReminders({ name, email, phone, tz, origin }) {
  const hook = process.env.N8N_WEBINAR_WEBHOOK;
  const payload = JSON.stringify({ name, email, phone, tz, bookedAt: new Date().toISOString() });
  const sig = B.sign(payload);
  if (!hook || !sig) {
    console.error('[webinar-register] REMINDERS NOT SCHEDULED: N8N_WEBINAR_WEBHOOK or REMINDER_SECRET is not set.');
    return false;
  }
  try {
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload, sig,
        callbackUrl: `${origin}/api/webinar-reminder`,
        dayBeforeAt: W.DAY_BEFORE_AT.toISOString(),
        oneHourAt: W.ONE_HOUR_AT.toISOString(),
        liveAt: W.LIVE_AT.toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`n8n responded ${r.status}`);
    return true;
  } catch (e) {
    console.error('[webinar-register] REMINDERS NOT SCHEDULED:', e.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await B.parseBody(req);
  const name  = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = W.normalisePhone(clean(body.phone, 40));
  const tz    = B.safeTz(body.tz);

  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!phone) return res.status(400).json({ error: 'Please enter a mobile number, for example 0412 345 678.' });
  if (Date.now() > W.START.getTime() + 30 * 60000) {
    return res.status(410).json({ error: 'This webinar has already started.' });
  }

  const firstName = name.split(/\s+/)[0];
  const msg = EMAILS.confirmation({ firstName, ...B.formatCallTime(W.START_ISO, tz) });
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const auth = B.getGoogleAuth();

  // Everything finishes before we respond, so the serverless function isn't frozen halfway.
  const results = await Promise.allSettled([
    W.appendRegistration([new Date().toISOString(), name, email, phone, tz, clean(body.source, 80)]),
    auth ? B.sendEmail(auth, { toName: name, toEmail: email, subject: msg.subject, body: msg.body })
         : Promise.reject(new Error('Google is not configured')),
    scheduleReminders({ name, email, phone, tz, origin }),
  ]);
  const labels = ['SHEET ROW', 'CONFIRMATION EMAIL', 'REMINDER SCHEDULE'];
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[webinar-register] ${labels[i]} FAILED for ${email}:`, r.reason.message);
  });

  // If neither the sheet nor the email worked, nothing recorded this person. Say so.
  if (results[0].status === 'rejected' && results[1].status === 'rejected') {
    return res.status(502).json({ error: "We couldn't register you just now. Please try again in a minute." });
  }
  return res.status(200).json({ ok: true });
};
