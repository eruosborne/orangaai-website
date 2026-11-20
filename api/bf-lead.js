// api/bf-lead.js
// /black-friday: someone who says they couldn't keep it doesn't see the calendar. Their details still reach Eru by email,
// so no lead is lost. Nothing is sent to the visitor.
// POST /api/bf-lead  { name, email, phone?, tz?, answers: { businessName, business, running, eats, decider, keep } }

const B = require('./_booking');

const FIELDS = [
  ['businessName', 'Business name'],
  ['business',     'What the business does'],
  ['running',      'How long it has been running'],
  ['eats',         'What eats most of their week'],
  ['decider',      'Makes the call'],
  ['keep',         'In a position to keep it'],
];

function clean(v, max) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = await B.parseBody(req);
  const name  = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Name and email are required.' });

  const auth = B.getGoogleAuth();
  if (!auth) {
    console.error('[bf-lead.js] LEAD NOT SENT: Google is not configured.', { name, email });
    return res.status(503).json({ error: 'Not configured' });
  }

  const lines = [
    'Someone filled in the Black Friday form but did not qualify for the install call, so they did not see the calendar.',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    `Their timezone: ${B.safeTz(body.tz)}`,
    '',
    ...FIELDS.map(([k, label]) => `${label}: ${clean(answers[k], 500) || '(blank)'}`),
  ].filter(l => l !== null);

  try {
    await B.sendEmail(auth, {
      toName: process.env.HOST_NAME || 'Eru Osborne',
      toEmail: process.env.HOST_EMAIL || 'eruosborne@orangaai.com',
      subject: `Black Friday lead (not a fit yet): ${name}`,
      body: lines.join('\n'),
    });
  } catch (e) {
    console.error('[bf-lead.js] LEAD EMAIL FAILED:', e.message, { name, email });
    return res.status(502).json({ error: 'Send failed' });
  }
  return res.status(200).json({ ok: true });
};
