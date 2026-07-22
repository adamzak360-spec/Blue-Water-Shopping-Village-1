
const axios = require('axios');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, replyTo } = req.body;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';

  if (!apiKey) {
    console.error('[SERVERLESS] RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    console.log(`[SERVERLESS] Attempting to send email to ${to} with subject: ${subject}`);
    
    const response = await axios.post('https://api.resend.com/emails', {
      from: fromEmail,
      to,
      subject,
      html,
      reply_to: replyTo || fromEmail,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    console.log('[SERVERLESS] Email sent successfully:', response.data.id);
    return res.status(200).json({ success: true, id: response.data.id });
  } catch (error) {
    if (error.response) {
      console.error('[SERVERLESS] Resend API error:', error.response.data);
      return res.status(error.response.status).json({ error: error.response.data.message || 'Failed to send email' });
    }
    console.error('[SERVERLESS] Error in email handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
