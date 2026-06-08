// api/availability.js
// Returns open 30-min booking slots for a given date.
// GET /api/availability?date=YYYY-MM-DD

const { google } = require('googleapis');

// ─── Config ────────────────────────────────────────────────────────────
const TZ          = process.env.BUSINESS_TIMEZONE || 'Australia/Brisbane';
const CAL_ID      = process.env.HOST_CALENDAR_ID  || 'primary';
const START_HOUR  = 8;   // 08:00
const END_HOUR    = 18;  // 18:00 (last slot 17:30–18:00)
const SLOT_MIN    = 30;  // minutes per slot 
const BUFFER_MIN  = 15;  // buffer around existing events
const MIN_DAYS    = 1;   // no same-day
const MAX_DAYS    = 14;  // booking window

// ─── Helpers ───────────────────────────────────────────────────────────────
function isoInTz(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function localToUtc(isoDate, hour, minute = 0) {
  // Build a local datetime string and shift to UTC via the TZ offset.
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  // Use Intl to find the offset for that exact moment.
  const naive = new Date(`${isoDate}T${hh}:${mm}:00`);
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  // Parse the TZ-formatted date back to find offset.
  // Simpler: use a fixed UTC offset for Australia/Brisbane (UTC+10, no DST).
  // AEST is always UTC+10 — Brisbane / Gold Coast never observes DST.
  return new Date(Date.UTC(
    ...isoDate.split('-').map((v, i) => i === 1 ? Number(v) - 1 : Number(v)),
    hour - 10, minute
  ));
}

function daysFromToday(isoDate) {
  const today = isoInTz(new Date());
  const [y1, m1, d1] = today.split('-').map(Number);
  const [y2, m2, d2] = isoDate.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

function validateDate(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Invalid date format.';
  const delta = daysFromToday(isoDate);
  if (delta < MIN_DAYS) return "Same-day bookings aren't available — earliest is tomorrow.";
  if (delta > MAX_DAYS) return `Bookings open ${MAX_DAYS} days in advance.`;
  const dow = new Date(isoDate + 'T12:00:00Z').getUTCDay();
  if (![1, 2, 3, 4, 5].includes(dow)) return 'That date falls on a weekend — we\'re open Mon–Fri.';
  return null;
}

function getCalendarClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return google.calendar({ version: 'v3', auth });
}

function computeSlots(isoDate, busy) {
  // Expand each busy block by BUFFER_MIN on each side.
  const blocked = busy.map(b => ({
    start: new Date(b.start.getTime() - BUFFER_MIN * 60000),
    end:   new Date(b.end.getTime()   + BUFFER_MIN * 60000),
  }));

  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h += 0.5) {
    if (h + SLOT_MIN / 60 > END_HOUR) break;
    const hour = Math.floor(h);
    const min  = h % 1 === 0 ? 0 : 30;
    const slotStart = localToUtc(isoDate, hour, min);
    const slotEnd   = new Date(slotStart.getTime() + SLOT_MIN * 60000);
    const overlaps  = blocked.some(b => slotStart < b.end && slotEnd > b.start);
    if (!overlaps) slots.push({ startISO: slotStart.toISOString(), endISO: slotEnd.toISOString() });
  }
  return slots;
}

// ─── Handler ────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const isoDate = req.query && req.query.date;
  if (!isoDate) return res.status(400).json({ error: 'Missing ?date=YYYY-MM-DD' });

  const err = validateDate(isoDate);
  if (err) return res.status(400).json({ error: err, slots: [] });

  let busy = [];
  const cal = getCalendarClient();
  if (cal) {
    try {
      const dayStart = localToUtc(isoDate, START_HOUR - 1);
      const dayEnd   = localToUtc(isoDate, END_HOUR   + 1);
      const fb = await cal.freebusy.query({
        requestBody: {
          timeMin: dayStart.toISOString(),
          timeMax: dayEnd.toISOString(),
          timeZone: TZ,
          items: [{ id: CAL_ID }],
        },
      });
      const raw = fb.data.calendars?.[CAL_ID]?.busy ?? [];
      busy = raw.map(b => ({ start: new Date(b.start), end: new Date(b.end) }))
                .filter(b => !isNaN(b.start) && !isNaN(b.end));
    } catch (e) {
      console.error('freebusy error', e.message);
      return res.status(502).json({ error: 'Calendar lookup failed — please try again.' });
    }
  }

  const slots = computeSlots(isoDate, busy);
  return res.status(200).json({ date: isoDate, timezone: TZ, slots });
};
