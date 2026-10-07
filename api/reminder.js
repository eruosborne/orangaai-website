// api/reminder.js
// Called by the n8n "Admin Audit reminders" workflow at -12h and -1h.
// POST /api/reminder  { payload, sig, kind: '12h' | '1h' }
// payload is the signed JSON string book.js created; nothing here trusts unsigned input.

const { google } = require('googleapis');
const B = require('./_booking');
const EMAILS = require('./_emails');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { payload, sig, kind } = await B.parseBody(req);
  if (typeof payload !== 'string' || !B.verify(payload, sig)) return res.status(401).json({ error: 'Bad signature' });
  if (kind !== '12h' && kind !== '1h') return res.status(400).json({ error: 'Unknown reminder' });

  const p = JSON.parse(payload);
  const start = new Date(p.startISO).getTime();
  const now = Date.now();

  // Booked less than 13 hours out: email 1 already covers what the 12-hour email says.
  if (kind === '12h' && start - new Date(p.bookedAt).getTime() < 13 * 3600000) {
    return res.status(200).json({ sent: false, reason: 'booked inside 13 hours' });
  }
  if (now > start) return res.status(200).json({ sent: false, reason: 'call already started' });

  const auth = B.getGoogleAuth();
  if (!auth) return res.status(503).json({ error: 'Google not configured' });

  // Only remind if the call is still on, at the same time. Eru may have cancelled or moved it.
  try {
    const ev = await google.calendar({ version: 'v3', auth }).events.get({ calendarId: B.CAL_ID, eventId: p.eventId });
    if (ev.data.status === 'cancelled') return res.status(200).json({ sent: false, reason: 'event cancelled' });
    if (new Date(ev.data.start?.dateTime).getTime() !== start) {
      return res.status(200).json({ sent: false, reason: 'event moved' });
    }
  } catch (e) {
    if (e.code === 404 || e.code === 410) return res.status(200).json({ sent: false, reason: 'event deleted' });
    console.error('[reminder.js] event check failed:', e.message);
    return res.status(502).json({ error: 'Calendar check failed' });
  }

  const build = kind === '12h' ? EMAILS.reminder12h : EMAILS.reminder1h;
  const msg = build({ firstName: p.name.split(/\s+/)[0], meetLink: p.meetLink, ...B.formatCallTime(p.startISO, B.safeTz(p.tz)) });
  try {
    await B.sendEmail(auth, { toName: p.name, toEmail: p.email, ...msg });
  } catch (e) {
    console.error(`[reminder.js] ${kind} REMINDER FAILED:`, e.message);
    return res.status(502).json({ error: 'Send failed' });
  }
  return res.status(200).json({ sent: true, kind });
};
