// api/oauth/callback.js
// Receives the OAuth code and prints the refresh token.
// Visit /api/oauth/start first. Delete this file after setup.

const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  const code = req.query && req.query.code;
  if (!code) return res.status(400).send('No code in callback.');

  const redirectUri = `https://${req.headers.host}/api/oauth/callback`;
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri,
  );

  try {
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.refresh_token) {
      return res.status(400).send(
        'No refresh_token returned. Revoke access at https://myaccount.google.com/permissions and try /api/oauth/start again.'
      );
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html>
<html><head><meta charset="utf-8"><title>Setup complete</title>
<style>
  body{font-family:-apple-system,sans-serif;background:#0A0B0E;color:#F5F5F7;padding:48px;max-width:720px;margin:0 auto;line-height:1.6;}
  h1{color:#5DDBA9;font-size:1.8rem;margin-bottom:16px;}
  p{color:#86868B;margin-bottom:24px;}
  .token{background:#131419;border:1px solid rgba(93,219,169,.22);border-radius:12px;padding:20px 24px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;color:#5DDBA9;}
  code{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;}
</style>
</head><body>
<h1>✔ Setup complete</h1>
<p>Copy the value below and add it as <code>GOOGLE_REFRESH_TOKEN</code> in your Vercel project environment variables, then redeploy.</p>
<div class="token">${tokens.refresh_token}</div>
<p style="margin-top:24px;">You can delete <code>api/oauth/start.js</code> and <code>api/oauth/callback.js</code> from your repo after this step.</p>
</body></html>`);
  } catch (e) {
    console.error('OAuth error', e.message);
    res.status(500).send('OAuth exchange failed: ' + e.message);
  }
};
