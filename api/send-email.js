const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, text, replyTo } = req.body || {};
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.BREVO_FROM_NAME || 'Reliable Premium Marketplace';

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Recipient, subject, and HTML content are required.' });
  }

  if (!brevoApiKey && !resendApiKey) {
    console.error('[SERVERLESS] No email provider API key is configured');
    return res.status(500).json({ error: 'Email service not configured. Add BREVO_API_KEY or RESEND_API_KEY.' });
  }

  try {
    if (brevoApiKey) {
      console.log(`[SERVERLESS] Sending email through Brevo to ${to} with subject: ${subject}`);
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: fromName, email: fromEmail },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        replyTo: replyTo ? { email: replyTo } : undefined,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'api-key': brevoApiKey,
        },
      });

      console.log('[SERVERLESS] Brevo email sent successfully:', response.data.messageId);
      return res.status(200).json({ success: true, id: response.data.messageId, provider: 'brevo' });
    }

    console.log(`[SERVERLESS] Sending email through Resend to ${to} with subject: ${subject}`);
    const response = await axios.post('https://api.resend.com/emails', {
      from: fromEmail,
      to,
      subject,
      html,
      text,
      reply_to: replyTo || fromEmail,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
    });

    console.log('[SERVERLESS] Resend email sent successfully:', response.data.id);
    return res.status(200).json({ success: true, id: response.data.id, provider: 'resend' });
  } catch (error) {
    const providerError = error.response?.data;
    console.error('[SERVERLESS] Email provider error:', providerError || error.message || error);
    const message = providerError?.message || providerError?.code || 'Failed to send email';
    return res.status(error.response?.status || 500).json({ error: message });
  }
};
