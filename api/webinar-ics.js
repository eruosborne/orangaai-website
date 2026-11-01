// api/webinar-ics.js
// GET /api/webinar-ics  ->  calendar file for the webinar (opens in Apple Calendar, Outlook, Google Calendar).
const W = require('./_webinar');

module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="oranga-core-webinar.ics"');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(W.buildIcs());
};
