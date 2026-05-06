// api/book.js
// Creates a Google Calendar event with a Meet link.
// POST /api/book  { startISO, endISO, name, email, phone? }

const { google } = require('googleapis');

const TZ     = process.env.BUSINESS_TIMEZONE || 'Australia/Brisbane';
const CAL_ID = process.env.HOST_CALENDAR_ID  || 'primary';

function isoInTz(isoStr) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(isoStr));
}

function localToUtc(isoDate, hour, min = 0) {
  return new Date(Date.UTC(
    ...isoDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)),
    hour - 10, min
  ));
}

const SLOT_MIN   = 30;
const BUFFER_MIN = 15;
const START_HOUR = 8;
const END_HOUR   = 18;
const MIN_DAYS   = 1;
const MAX_DAYS   = 14;

function daysFromToday(isoDate) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const [y1,m1,d1] = today.split('-').map(Number);
  const [y2,m2,d2] = isoDate.split('-').map(Number);
  return Math.round((Date.UTC(y2,m2-1,d2) - Date.UTC(y1,m1-1,d1)) / 86400000);
}

function validateDate(isoDate) {
  const delta = daysFromToday(isoDate);
  if (delta < MIN_DAYS) return 'Same-day bookings are not available.';
  if (delta > MAX_DAYS) return `Bookings open ${MAX_DAYS} days in advance.`;
  const dow = new Date(isoDate + 'T12:00:00Z').getUTCDay();
  if (![1,2,3,4,5].includes(dow)) return 'That date falls on a weekend.';
  return null;
}

function computeSlots(isoDate, busy) {
  const blocked = busy.map(b => ({
    start: new Date(b.start.getTime() - BUFFER_MIN * 60000),
    end:   new Date(b.end.getTime()   + BUFFER_MIN * 60000),
  }));
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h += 0.5) {
    const hour = Math.floor(h), min = h % 1 === 0 ? 0 : 30;
    if (h + SLOT_MIN / 60 > END_HOUR) break;
    const s = localToUtc(isoDate, hour, min);
    const e = new Date(s.getTime() + SLOT_MIN * 60000);
    if (!blocked.some(b => s < b.end && e > b.start)) slots.push({ s: s.toISOString(), e: e.toISOString() });
  }
  return slots;
}

function getCalendarClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
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

  const body = await parseBody(req);
  const { startISO, endISO, name, email, phone } = body;

  if (!startISO || !endISO) return res.status(400).json({ error: 'startISO and endISO are required.' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
  if (!email || !/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Valid email is required.' });

  const isoDate = isoInTz(startISO);
  const dateErr = validateDate(isoDate);
  if (dateErr) return res.status(400).json({ error: dateErr });

  const cal = getCalendarClient();
  if (!cal) return res.status(503).json({ error: 'Booking is not configured yet. Check back soon.' });

  // Race-safe: re-check slot is still open.
  let busy = [];
  try {
    const dayStart = localToUtc(isoDate, START_HOUR - 1);
    const dayEnd   = localToUtc(isoDate, END_HOUR   + 1);
    const fb = await cal.freebusy.query({
      requestBody: { timeMin: dayStart.toISOString(), timeMax: dayEnd.toISOString(), timeZone: TZ, items: [{ id: CAL_ID }] },
    });
    const raw = fb.data.calendars?.[CAL_ID]?.busy ?? [];
    busy = raw.map(b => ({ start: new Date(b.start), end: new Date(b.end) })).filter(b => !isNaN(b.start));
  } catch (e) {
    console.error('freebusy error', e.message);
    return res.status(502).json({ error: 'Calendar check failed — please try again.' });
  }

  const stillOpen = computeSlots(isoDate, busy).some(s => s.s === startISO && s.e === endISO);
  if (!stillOpen) {
    return res.status(409).json({ error: 'That slot was just booked — please pick another time.', slotTaken: true });
  }

  // Create the event.
  const description = [
    'Intro call booked via Oranga AI website.',
    '',
    `Name: ${name.trim()}`,
    `Email: ${email.trim()}`,
    phone ? `Phone: ${phone.trim()}` : null,
  ].filter(Boolean).join('\n');

  try {
    const event = await cal.events.insert({
      calendarId: CAL_ID,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
      requestBody: {
        summary: `Intro call: ${name.trim()}`,
        description,
        start: { dateTime: startISO, timeZone: TZ },
        end:   { dateTime: endISO,   timeZone: TZ },
        attendees: [
          { email: process.env.HOST_EMAIL || '', displayName: process.env.HOST_NAME || 'Host', organizer: true },
          { email: email.trim(), displayName: name.trim() },
        ],
        conferenceData: {
          createRequest: {
            requestId: `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 15 }],
        },
      },
    });

    const meetLink = event.data.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri ?? null;
    return res.status(200).json({ ok: true, meetLink, eventLink: event.data.htmlLink });
  } catch (e) {
    console.error('event insert error', e.message);
    return res.status(500).json({ error: "We couldn't book that just now — please try again." });
  }
};
