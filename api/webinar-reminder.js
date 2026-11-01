// api/webinar-reminder.js
// Called by the n8n "Webinar reminders" workflow at the day-before, 1-hour and live times.
// POST /api/webinar-reminder  { payload, sig, kind: 'dayBefore' | '1h' | 'live' }
// payload is the signed JSON string webinar-register.js created; nothing here trusts unsigned input.

const B = require('./_booking');
const W = require('./_webinar');
const EMAILS = require('./_webinar-emails');

const SEND_AT = { dayBefore: W.DAY_BEFORE_AT, '1h': W.ONE_HOUR_AT, live: W.LIVE_AT };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { payload, sig, kind } = await B.parseBody(req);
  if (typeof payload !== 'string' || !B.verify(payload, sig)) return res.status(401).json({ error: 'Bad signature' });
  if (!SEND_AT[kind]) return res.status(400).json({ error: 'Unknown reminder' });

  const p = JSON.parse(payload);
  const now = Date.now();
  const sendAt = SEND_AT[kind].getTime();
  const bookedAt = new Date(p.bookedAt).getTime();

  // n8n waits fire immediately when the time has already passed. These guards stop that.
  if (now < sendAt - 10 * 60000) return res.status(200).json({ sent: false, reason: 'too early' });
  if (now > W.START.getTime() + 30 * 60000) return res.status(200).json({ sent: false, reason: 'webinar over' });
  if (bookedAt > sendAt) return res.status(200).json({ sent: false, reason: 'registered after this reminder time' });

  const build = { dayBefore: EMAILS.dayBefore, '1h': EMAILS.oneHour, live: EMAILS.live }[kind];
  const msg = build({ firstName: p.name.split(/\s+/)[0], ...B.formatCallTime(W.START_ISO, B.safeTz(p.tz)) });

  const auth = B.getGoogleAuth();
  const [emailR] = await Promise.allSettled([
    auth ? B.sendEmail(auth, { toName: p.name, toEmail: p.email, subject: msg.subject, body: msg.body })
         : Promise.reject(new Error('Google is not configured')),
  ]);
  if (emailR.status === 'rejected') console.error(`[webinar-reminder] ${kind} EMAIL FAILED for ${p.email}:`, emailR.reason.message);

  if (emailR.status === 'rejected') return res.status(502).json({ error: 'Send failed' });
  return res.status(200).json({ sent: true, kind });
};
