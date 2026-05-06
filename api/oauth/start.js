// api/oauth/start.js
// One-time helper: visit this route to start the Google OAuth flow.
// Visit /api/oauth/start after deploying, sign in, then copy the refresh token.
// You can delete this file after setup.

const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).send('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel environment variables first.');
  }
  const redirectUri = `https://${req.headers.host}/api/oauth/callback`;
  const oauth2 = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, redirectUri);
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar'],
  });
  res.writeHead(302, { Location: url });
  res.end();
};
