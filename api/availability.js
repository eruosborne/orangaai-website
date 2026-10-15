// api/availability.js
// GET /api/availability             → { timezone, dates: ['YYYY-MM-DD', ...] }  bookable days
// GET /api/availability?date=DATE   → { date, timezone, slots: [{ startISO, endISO }] }

const { google } = require('googleapis');
const B = require('./_booking');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const isoDate = req.query && req.query.date;
  if (!isoDate) return res.status(200).json({ timezone: B.TZ, dates: B.bookableDates() });

  const err = B.validateDate(isoDate);
  if (err) return res.status(400).json({ error: err, slots: [] });

  let busy = [];
  const auth = B.getGoogleAuth();
  if (auth) {
    try {
      busy = await B.getBusy(google.calendar({ version: 'v3', auth }), isoDate);
    } catch (e) {
      console.error('freebusy error', e.message);
      return res.status(502).json({ error: 'Calendar lookup failed. Please try again.' });
    }
  }

  return res.status(200).json({ date: isoDate, timezone: B.TZ, slots: B.computeSlots(isoDate, busy) });
};
