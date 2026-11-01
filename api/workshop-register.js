// api/workshop-register.js
// Takes a sign-up for the one-day workshop: logs it to the Google Sheet (tab "Workshop"),
// emails the person a confirmation, and emails Eru so he can call them. No payment here.
// POST /api/workshop-register  { name, email, phone, business?, source? }
// Same pattern as api/webinar-register.js: each step is best-effort and fails loudly in the logs.

const B = require('./_booking');
const W = require('./_webinar');

function clean(v, max) {
  return typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ').trim().slice(0, max) : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await B.parseBody(req);
  const name     = clean(body.name, 120);
  const email    = clean(body.email, 200);
  const phone    = W.normalisePhone(clean(body.phone, 40));
  const business = clean(body.business, 160);
  const source   = clean(body.source, 80);

  if (name.length < 2) return res.status(400).json({ error: 'Name is required.' });
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'A valid email is required.' });
  if (!phone) return res.status(400).json({ error: 'Please enter a mobile number, for example 0412 345 678.' });

  const firstName = name.split(/\s+/)[0];
  const auth = B.getGoogleAuth();
  const send = msg => (auth ? B.sendEmail(auth, msg) : Promise.reject(new Error('Google is not configured')));

  const results = await Promise.allSettled([
    W.appendWorkshopSignup([new Date().toISOString(), name, email, phone, business, source]),
    send({
      toName: name, toEmail: email,
      subject: "You're on the list: one-day AI brain workshop",
      body: [
        `Hey ${firstName},`,
        '',
        "You're on the list for the one-day workshop. I'll call you to talk it through and lock in your spot.",
        '',
        'Spots are limited, and nothing is due until we have spoken.',
        '',
        'Cheers,', 'Eru Osborne', 'Founder, Oranga AI', 'orangaai.com',
      ].join('\n'),
    }),
    send({
      toName: 'Eru Osborne', toEmail: process.env.HOST_EMAIL || 'eruosborne@orangaai.com',
      subject: `Workshop sign-up: ${name}`,
      body: [`Name: ${name}`, `Business: ${business || '(not given)'}`, `Mobile: ${phone}`, `Email: ${email}`, `Source: ${source || '(direct)'}`].join('\n'),
    }),
  ]);
  ['SHEET ROW', 'CONFIRMATION EMAIL', 'NOTIFICATION EMAIL'].forEach((label, i) => {
    if (results[i].status === 'rejected') console.error(`[workshop-register] ${label} FAILED for ${email}:`, results[i].reason.message);
  });

  // If neither the sheet nor the note to Eru worked, nothing recorded this person. Say so.
  if (results[0].status === 'rejected' && results[2].status === 'rejected') {
    return res.status(502).json({ error: "We couldn't save your spot just now. Please try again in a minute." });
  }
  return res.status(200).json({ ok: true });
};
