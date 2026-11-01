// api/_webinar-emails.js
// The four webinar emails. The matching texts (the sms fields) are not sent by the site;
// Eru sends them himself. The same wording is in 02-playbooks/webinar-launch.md. Eru approves the exact wording here before it goes live.
//
//   confirmation: straight after they register
//   dayBefore:    Wednesday midday
//   oneHour:      1 hour before
//   live:         at 7pm, with the link
//
// Subjects stay plain ASCII (smart quotes and dashes have garbled in Gmail before).
// Texts stay short and use no special characters.

const W = require('./_webinar');

const SIGNATURE = ['Cheers,', 'Eru Osborne', 'Founder, Oranga AI', 'orangaai.com'];

function linkLine() {
  const l = W.joinLink();
  return l ? `Join here: ${l}` : 'The join link is coming by email and text before we start.';
}

function confirmation({ firstName, date, time, zone }) {
  return {
    subject: `You're in: AI Brain and Studio Webinar, ${date} at ${time}`,
    body: [
      `Hey ${firstName},`,
      '',
      `You're registered for the live AI Brain and Studio Webinar. It's on ${date} at ${time} (${zone}), and it runs for 30 to 40 minutes, questions included.`,
      '',
      "Here's what I'll cover:",
      '- What AI is, and the difference between a chat and an AI brain',
      '- The four parts of an AI brain, and how it works overnight so you wake up to a daily brief',
      '- How you keep building it yourself, without calling me',
      '- Oranga Studio live: a raw recording of me turned into a finished video',
      '- Real results from owners who have one installed',
      '- A one-day workshop where I install an AI brain in your business and teach you to build your own playbooks. Limited spots.',
      '',
      'Ask your questions in the chat as we go and I will get to them.',
      '',
      `Add it to your calendar: ${W.icsUrl()}`,
      '',
      linkLine(),
      '',
      "I'll be in touch the day before, an hour before, and when we go live.",
      '',
      ...SIGNATURE,
    ].join('\n'),
    sms: `Hi ${firstName}, you're registered for the AI Brain and Studio Webinar, ${date} at ${time} ${zone}. Add to calendar: ${W.icsUrl()} - Eru, Oranga AI`,
  };
}

function dayBefore({ firstName, time, zone }) {
  return {
    subject: `Tomorrow at ${time}: AI Brain and Studio Webinar`,
    body: [
      `Hey ${firstName},`,
      '',
      `A quick reminder that the AI Brain and Studio Webinar is tomorrow at ${time} (${zone}). It runs for 30 to 40 minutes, questions included.`,
      '',
      "Bring one question about your own business. I'll answer as many as I can live.",
      '',
      linkLine(),
      '',
      ...SIGNATURE,
    ].join('\n'),
    sms: `Reminder: the AI Brain and Studio Webinar is tomorrow at ${time} ${zone}. Bring a question about your business. - Eru, Oranga AI`,
  };
}

function oneHour({ firstName, time, zone }) {
  return {
    subject: 'AI Brain and Studio Webinar starts in 1 hour',
    body: [
      `Hey ${firstName},`,
      '',
      `We go live in an hour, at ${time} (${zone}). It runs for 30 to 40 minutes, questions included.`,
      '',
      linkLine(),
      '',
      'See you there.',
      '',
      ...SIGNATURE,
    ].join('\n'),
    sms: `The AI Brain and Studio Webinar starts in 1 hour (${time} ${zone}). ${W.joinLink() || 'Link coming at start time.'} - Eru`,
  };
}

function live({ firstName }) {
  return {
    subject: "We're live: AI Brain and Studio Webinar",
    body: [
      `Hey ${firstName},`,
      '',
      "We're live now.",
      '',
      linkLine(),
      '',
      ...SIGNATURE,
    ].join('\n'),
    sms: `We're live now. Join here: ${W.joinLink() || 'check your email for the link'} - Eru, Oranga AI`,
  };
}

module.exports = { confirmation, dayBefore, oneHour, live };
