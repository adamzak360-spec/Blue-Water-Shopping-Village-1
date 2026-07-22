
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, replyTo } = req.body;
  const apiKey = process.env.RESEND_API_KEY;
  // Use VITE_FROM_EMAIL if available, fallback to FROM_EMAIL, then default
  const fromEmail = process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'noreply@bluewatershopping.com';

  if (!apiKey) {
    console.error('[SERVERLESS] RESEND_API_KEY is not set');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    console.log(`[SERVERLESS] Attempting to send email to ${to} with subject: ${subject}`);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
        reply_to: replyTo || fromEmail,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[SERVERLESS] Resend API error:', data);
      return res.status(response.status).json({ error: data.message || 'Failed to send email' });
    }

    console.log('[SERVERLESS] Email sent successfully:', data.id);
    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('[SERVERLESS] Error in email handler:', error);
    return res.status(500).json({ error: error.message });
  }
}
