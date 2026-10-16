// api/_booking.js
// Shared booking rules for /api/availability, /api/book and /api/reminder.
// Vercel does not expose files starting with "_" as routes.
//
// The window follows the agency funnel: bookings only in the next 48 hours
// (boosts show-up). Weekends are open, so the window is today plus the next
// two days, with at least LEAD_MIN notice.

const crypto = require('crypto');
const { google } = require('googleapis');

const TZ         = process.env.BUSINESS_TIMEZONE || 'Australia/Brisbane';
const CAL_ID     = process.env.HOST_CALENDAR_ID  || 'primary';
const START_HOUR = 8;    // 08:00 Brisbane
const END_HOUR   = 18;   // 18:00 (last slot 17:30–18:00)
const SLOT_MIN   = 30;
const BUFFER_MIN = 15;   // around existing events
const LEAD_MIN   = 120;  // minimum notice for a same-day booking
const DAYS_AHEAD = 2;

// Days closed to bookings (YYYY-MM-DD, Brisbane). Dropped from the day list,
// so /api/availability and /api/book both refuse them.
const BLOCKED_DATES = ['2026-10-27'];

const CALL_NAME = 'Admin Audit';

function isoInTz(date, tz = TZ) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

// Brisbane / Gold Coast is UTC+10 all year (no daylight saving).
function localToUtc(isoDate, hour, minute = 0) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour - 10, minute));
}

// Today (if slots are left) plus the next DAYS_AHEAD days, weekends included.
function bookableDates(now = new Date()) {
  const today = isoInTz(now);
  const [y, m, d] = today.split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const dates = [];
  if (now < new Date(localToUtc(today, END_HOUR).getTime() - (LEAD_MIN + SLOT_MIN) * 60000)) {
    dates.push(today);
  }
  let ahead = 0;
  while (ahead < DAYS_AHEAD) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const iso = cursor.toISOString().slice(0, 10);
    dates.push(iso); ahead++;
  }
  return dates.filter(d => !BLOCKED_DATES.includes(d));
}

function validateDate(isoDate, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return 'Invalid date format.';
  if (!bookableDates(now).includes(isoDate)) {
    return 'Admin Audits book in the next two days. Please pick one of the days shown.';
  }
  return null;
}

function computeSlots(isoDate, busy, now = new Date()) {
  const earliest = new Date(now.getTime() + LEAD_MIN * 60000);
  const blocked = busy.map(b => ({
    start: new Date(b.start.getTime() - BUFFER_MIN * 60000),
    end:   new Date(b.end.getTime()   + BUFFER_MIN * 60000),
  }));
  const slots = [];
  for (let h = START_HOUR; h + SLOT_MIN / 60 <= END_HOUR; h += 0.5) {
    const s = localToUtc(isoDate, Math.floor(h), h % 1 === 0 ? 0 : 30);
    const e = new Date(s.getTime() + SLOT_MIN * 60000);
    if (s < earliest) continue;
    if (!blocked.some(b => s < b.end && e > b.start)) {
      slots.push({ startISO: s.toISOString(), endISO: e.toISOString() });
    }
  }
  return slots;
}

function getGoogleAuth() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  return auth;
}

async function getBusy(cal, isoDate) {
  const fb = await cal.freebusy.query({
    requestBody: {
      timeMin: localToUtc(isoDate, START_HOUR - 1).toISOString(),
      timeMax: localToUtc(isoDate, END_HOUR + 1).toISOString(),
      timeZone: TZ,
      items: [{ id: CAL_ID }],
    },
  });
  const raw = fb.data.calendars?.[CAL_ID]?.busy ?? [];
  return raw.map(b => ({ start: new Date(b.start), end: new Date(b.end) }))
            .filter(b => !isNaN(b.start) && !isNaN(b.end));
}

// The visitor's own timezone, if the browser sent a real one. Falls back to Brisbane.
function safeTz(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return TZ;
  try { new Intl.DateTimeFormat('en-AU', { timeZone: tz }); return tz; } catch { return TZ; }
}

function formatCallTime(isoStr, tz = TZ) {
  const d = new Date(isoStr);
  const date = d.toLocaleDateString('en-AU', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
  const time = d.toLocaleTimeString('en-AU', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  const zone = new Intl.DateTimeFormat('en-AU', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(d).find(p => p.type === 'timeZoneName')?.value || tz;
  return { date, time, zone };
}

// Plain-text email from Eru's mailbox via the Gmail API.
async function sendEmail(auth, { toName, toEmail, subject, body }) {
  const gmail = google.gmail({ version: 'v1', auth });
  const fromEmail = process.env.HOST_EMAIL || 'eruosborne@orangaai.com';
  const fromName  = process.env.HOST_NAME  || 'Eru Osborne';
  const message = [
    `From: "${fromName}" <${fromEmail}>`,
    `To: "${toName.replace(/"/g, '')}" <${toEmail}>`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join('\n');
  const raw = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
}

// Reminder payloads travel through n8n and come back to /api/reminder.
// The signature stops anyone else using that endpoint to send email.
function sign(payload) {
  const secret = process.env.REMINDER_SECRET;
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verify(payload, sig) {
  const expected = sign(payload);
  if (!expected || typeof sig !== 'string' || sig.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

async function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

module.exports = {
  TZ, CAL_ID, SLOT_MIN, CALL_NAME,
  bookableDates, validateDate, computeSlots, getBusy,
  getGoogleAuth, safeTz, formatCallTime, sendEmail, sign, verify, parseBody,
};
