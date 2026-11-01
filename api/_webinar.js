// api/_webinar.js
// Shared rules for the live webinar: /api/webinar-register, /api/webinar-reminder, /api/webinar-ics.
// Vercel does not expose files starting with "_" as routes.
//
// To run a different webinar, change START_ISO, TITLE and the reminder times here.
// The join link is the Vercel env var WEBINAR_LINK, so it can be set without a redeploy of code.

const { google } = require('googleapis');

const TITLE = 'AI Brain and Studio Webinar';
const START_ISO = '2026-11-05T09:00:00.000Z';   // Thursday 5 Nov 2026, 7:00pm AEST (Brisbane, UTC+10)
const DURATION_MIN = 60;                        // about 30 minutes of talk plus Q&A

const START = new Date(START_ISO);
// Day-before reminder goes out Wednesday 4 Nov, 12:00pm AEST.
const DAY_BEFORE_AT = new Date('2026-11-04T02:00:00.000Z');
const ONE_HOUR_AT = new Date(START.getTime() - 3600000);
const LIVE_AT = START;

const SITE = 'https://orangaai.com';

function joinLink() {
  return process.env.WEBINAR_LINK || '';
}

function icsUrl() { return `${SITE}/api/webinar-ics`; }

function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }

function googleCalendarUrl() {
  const end = new Date(START.getTime() + DURATION_MIN * 60000);
  const link = joinLink();
  const details = [
    'A live look at an AI brain that never sleeps, and Oranga Studio. Questions in the chat as we go.',
    link ? `Join here: ${link}` : 'The join link comes by email and text before we start.',
  ].join('\n\n');
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: TITLE, dates: `${stamp(START)}/${stamp(end)}`,
    details, location: link || 'Online',
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

function buildIcs() {
  const end = new Date(START.getTime() + DURATION_MIN * 60000);
  const link = joinLink();
  const esc = s => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oranga AI//Webinar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:webinar-2026-11-05@orangaai.com',
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(START)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(TITLE)}`,
    `DESCRIPTION:${esc(link ? `Join here: ${link}` : 'The join link comes by email and text before we start.')}`,
    `LOCATION:${esc(link || 'Online')}`,
    link ? `URL:${link}` : null,
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    'DESCRIPTION:AI Brain and Studio Webinar starts in 1 hour',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

// Mobile numbers: Australian format (04xx...) becomes +614xx...; anything already +country is kept.
function normalisePhone(raw) {
  const digits = String(raw || '').replace(/[^\d+]/g, '');
  if (/^\+\d{8,15}$/.test(digits)) return digits;
  if (/^04\d{8}$/.test(digits)) return `+61${digits.slice(1)}`;
  if (/^614\d{8}$/.test(digits)) return `+${digits}`;
  if (/^02\d{8}$/.test(digits) || /^64\d{8,10}$/.test(digits)) return digits.startsWith('64') ? `+${digits}` : `+64${digits.slice(1)}`;
  return null;
}

function getSheetsAuth() {
  const { SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET, SHEETS_REFRESH_TOKEN } = process.env;
  if (!SHEETS_CLIENT_ID || !SHEETS_CLIENT_SECRET || !SHEETS_REFRESH_TOKEN) return null;
  const auth = new google.auth.OAuth2(SHEETS_CLIENT_ID, SHEETS_CLIENT_SECRET);
  auth.setCredentials({ refresh_token: SHEETS_REFRESH_TOKEN });
  return auth;
}

// The registration list. Tab "Webinar", columns: registered_at, name, email, mobile, timezone, source.
async function appendRegistration(row) {
  const auth = getSheetsAuth();
  if (!auth || !process.env.WEBINAR_SHEET_ID) throw new Error('WEBINAR_SHEET_ID or the Sheets credentials are not set');
  await google.sheets({ version: 'v4', auth }).spreadsheets.values.append({
    spreadsheetId: process.env.WEBINAR_SHEET_ID,
    range: 'Webinar!A:F',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

module.exports = {
  TITLE, START, START_ISO, DURATION_MIN, DAY_BEFORE_AT, ONE_HOUR_AT, LIVE_AT,
  joinLink, icsUrl, googleCalendarUrl, buildIcs, normalisePhone, appendRegistration,
};
