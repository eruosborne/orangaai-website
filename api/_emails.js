// api/_emails.js
// The three Admin Audit emails (the agency's "confirmation engine", email only).
// Eru approves the exact wording here before it goes live.
//
//   1. confirmation: sent the moment someone books
//   2. reminder12h: 12 hours before the call
//   3. reminder1h: 1 hour before the call
//
// Subjects stay plain ASCII (smart quotes and dashes have garbled in Gmail before).
// HOMEWORK_VIDEO_URL (Vercel env var) switches the homework from a written list
// to the homework video at the top of /booked (https://orangaai.com/booked?from=email#homework).

const SIGNATURE = [
  'Cheers,',
  'Eru Osborne',
  'Founder, Oranga AI',
  'orangaai.com',
];

function homework() {
  const url = process.env.HOMEWORK_VIDEO_URL;
  if (url) {
    return [
      'Before we talk, take 3 minutes to watch this short video. It covers how Oranga Core works and three things to have ready, so we can spend the call on your business, not the basics:',
      url,
    ];
  }
  return [
    'Before we talk, have a rough answer to these three things, so we can spend the call on your business, not the basics:',
    '',
    '1. Where your admin time goes in a normal week (days, evenings, weekends).',
    '2. The tools the business runs on (email, calendar, accounts, booking system).',
    '3. The one admin job you would hand off first.',
  ];
}

function meetLine(meetLink) {
  return meetLink ? `Google Meet: ${meetLink}` : 'The Google Meet link is in your calendar invite.';
}

function confirmation({ firstName, date, time, zone, meetLink }) {
  return {
    subject: 'Your Admin Audit is confirmed',
    body: [
      `Hey ${firstName},`,
      '',
      `Thanks for booking your Admin Audit with Oranga AI. It's on ${date} at ${time} (${zone}), 30 minutes.`,
      '',
      ...homework(),
      '',
      'To get the most out of it:',
      '- Find a quiet spot with no distractions',
      '- Have a pen and paper handy',
      '',
      meetLine(meetLink),
      '',
      "Need to move it? Reply to this email and I'll sort a new time.",
      '',
      ...SIGNATURE,
    ].join('\n'),
  };
}

function reminder12h({ firstName, date, time, zone, meetLink }) {
  return {
    subject: 'Your Admin Audit is coming up',
    body: [
      `Hey ${firstName},`,
      '',
      `Your Admin Audit is about 12 hours away: ${date} at ${time} (${zone}).`,
      '',
      ...homework(),
      '',
      'Have a pen and paper ready. We will find where your admin time is going, and you will leave with a straight answer on whether Oranga Core is the right fix.',
      '',
      meetLine(meetLink),
      '',
      "Need to move it? Reply to this email and I'll sort a new time.",
      '',
      ...SIGNATURE,
    ].join('\n'),
  };
}

function reminder1h({ firstName, time, zone, meetLink }) {
  return {
    subject: 'Your Admin Audit starts in 1 hour',
    body: [
      `Hey ${firstName},`,
      '',
      `Your Admin Audit starts in an hour, at ${time} (${zone}).`,
      '',
      meetLine(meetLink),
      '',
      'See you soon.',
      '',
      ...SIGNATURE,
    ].join('\n'),
  };
}

module.exports = { confirmation, reminder12h, reminder1h };
