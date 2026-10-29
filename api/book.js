// api/book.js
// Books an Bottleneck Audit: creates the Google Calendar event with a Meet link,
// sends confirmation email 1, and hands the two reminders to n8n for timing.
// POST /api/book  { startISO, endISO, name, email, phone?, tz?, answers: { business, team, adminWhen, triedAi, focus } }

const { google } = require('googleapis');
const B = require('./_booking');
const EMAILS = require('./_emails');

// The five qualifying questions (agency rule: five at most).
const QUESTIONS = [
  ['business',  'What the business does'],
  ['team',      'Team size'],
  ['adminWhen', 'What happens when they step away for a day'],
  ['triedAi',   'Tried AI yet'],
  ['focus',     'Wants off their plate'],
];

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

// Hand the reminder schedule to n8n. Failure is logged loudly but never blocks the booking.
async function scheduleReminders({ eventId, name, email, startISO, tz, meetLink, origin }) {
  const hook = process.env.N8N_BOOKING_WEBHOOK;
  const payload = JSON.stringify({ eventId, name, email, startISO, tz, meetLink, bookedAt: new Date().toISOString() });
  const sig = B.sign(payload);
  if (!hook || !sig) {
    console.error('[book.js] REMINDERS NOT SCHEDULED: N8N_BOOKING_WEBHOOK or REMINDER_SECRET is not set.');
    return false;
  }
  const start = new Date(startISO).getTime();
  try {
    const r = await fetch(hook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload, sig,
        callbackUrl: `${origin}/api/reminder`,
        remind12At: new Date(start - 12 * 3600000).toISOString(),
        remind1At:  new Date(start - 1 * 3600000).toISOString(),
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) throw new Error(`n8n responded ${r.status}`);
    return true;
  } catch (e) {
    console.error('[book.js] REMINDERS NOT SCHEDULED:', e.message);
    return false;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await B.parseBody(req);
  const { startISO, endISO } = body;
  const name  = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const tz    = B.safeTz(body.tz);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};

  if (!startISO || !endISO) return res.status(400).json({ error: 'Please pick a time.' });
  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  const qa = QUESTIONS.map(([key, label]) => [label, clean(answers[key], key === 'focus' || key === 'business' ? 500 : 60)]);
  if (qa.some(([, v]) => !v)) return res.status(400).json({ error: 'Please answer all five questions.' });

  const isoDate = new Intl.DateTimeFormat('en-CA', { timeZone: B.TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(startISO));
  const dateErr = B.validateDate(isoDate);
  if (dateErr) return res.status(400).json({ error: dateErr });

  const auth = B.getGoogleAuth();
  if (!auth) return res.status(503).json({ error: 'Booking is not configured yet. Check back soon.' });
  const cal = google.calendar({ version: 'v3', auth });

  // Race-safe: re-check the slot is still open.
  let busy;
  try {
    busy = await B.getBusy(cal, isoDate);
  } catch (e) {
    console.error('freebusy error', e.message);
    return res.status(502).json({ error: 'Calendar check failed. Please try again.' });
  }
  if (!B.computeSlots(isoDate, busy).some(s => s.startISO === startISO && s.endISO === endISO)) {
    return res.status(409).json({ error: 'That time was just taken. Please pick another.', slotTaken: true });
  }

  const description = [
    `${B.CALL_NAME} booked via orangaai.com.`,
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `Their timezone: ${tz}`,
    '',
    ...qa.map(([label, v]) => `${label}: ${v}`),
  ].filter(l => l !== null).join('\n');

  let event;
  try {
    event = await cal.events.insert({
      calendarId: B.CAL_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: `${B.CALL_NAME}: ${name}`,
        description,
        start: { dateTime: startISO, timeZone: B.TZ },
        end:   { dateTime: endISO,   timeZone: B.TZ },
        attendees: [
          { email: process.env.HOST_EMAIL || '', displayName: process.env.HOST_NAME || 'Host', organizer: true },
          { email, displayName: name },
        ],
        conferenceData: {
          createRequest: {
            requestId: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 15 }] },
      },
    });
  } catch (e) {
    console.error('event insert error', e.message);
    return res.status(500).json({ error: "We couldn't book that just now. Please try again." });
  }

  const meetLink = event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null;
  const firstName = name.split(/\s+/)[0];

  // Email 1 and the reminder hand-off both finish before we respond,
  // so the serverless function isn't frozen halfway through either.
  const msg = EMAILS.confirmation({ firstName, meetLink, ...B.formatCallTime(startISO, tz) });
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  await Promise.all([
    B.sendEmail(auth, { toName: name, toEmail: email, ...msg })
      .catch(e => console.error('[book.js] CONFIRMATION EMAIL FAILED:', e.message)),
    scheduleReminders({ eventId: event.data.id, name, email, startISO, tz, meetLink, origin }),
  ]);

  return res.status(200).json({ ok: true, startISO, meetLink });
};
