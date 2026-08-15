const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const APP_ORIGIN = (process.env.APP_ORIGIN || 'https://reliable-now.vercel.app').replace(/\/$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwouhwizzwwykchgflyk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

function setCors(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

function setSecurityCors(req, res) {
  const origin = req.headers.origin;
  if (origin === APP_ORIGIN) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function isSecurityRequest(req) {
  const url = String(req.url || '');
  return url.includes('mode=security') || req.query?.mode === 'security';
}

function hash(value, salt) {
  return crypto.createHmac('sha256', salt).update(value).digest('hex');
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function summarizeUserAgent(value) {
  const ua = String(value || 'Unknown device');
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other OS';
  const browser = /Edg\//i.test(ua) ? 'Edge' : /Chrome\//i.test(ua) ? 'Chrome' : /Firefox\//i.test(ua) ? 'Firefox' : /Safari\//i.test(ua) ? 'Safari' : 'Browser';
  return `${browser} on ${os}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

async function sendSecurityEmail({ to, occurredAt, device, country }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.BREVO_FROM_NAME || 'Reliable Marketplace';
  if (!brevoApiKey && !resendApiKey) throw new Error('provider_not_configured');

  const safeDevice = escapeHtml(device);
  const safeCountry = escapeHtml(country || 'Unavailable');
  const safeTime = escapeHtml(occurredAt.toISOString());
  const securityUrl = `${APP_ORIGIN}/forgot-password`;
  const subject = 'New device sign-in to your Reliable account';
  const text = [
    'New device sign-in',
    '',
    'Your Reliable account was used to sign in from a new device or browser.',
    `Date and time (UTC): ${occurredAt.toISOString()}`,
    `Device: ${device}`,
    `Country: ${country || 'Unavailable'}`,
    '',
    `If this was not you, reset your password here: ${securityUrl}`,
    'Reliable will never ask you to share your password, verification code, or payment details by email.',
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#1f2937"><div style="background:#16834b;color:#fff;padding:24px;border-radius:12px 12px 0 0"><h1 style="margin:0;font-size:24px">New device sign-in</h1></div><div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px"><p>Your Reliable account was used to sign in from a new device or browser.</p><table style="border-collapse:collapse;width:100%;margin:18px 0"><tr><td style="padding:8px 0;font-weight:600">Date and time (UTC)</td><td style="padding:8px 0">${safeTime}</td></tr><tr><td style="padding:8px 0;font-weight:600">Device</td><td style="padding:8px 0">${safeDevice}</td></tr><tr><td style="padding:8px 0;font-weight:600">Country</td><td style="padding:8px 0">${safeCountry}</td></tr></table><p>If this was not you, <a href="${securityUrl}" style="color:#16834b;font-weight:600">reset your password from Reliable</a> and review your account.</p><p style="font-size:13px;color:#6b7280">Reliable will never ask you to share your password, verification code, or payment details by email.</p></div></div>`;

  if (brevoApiKey) {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': brevoApiKey },
      body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!response.ok) throw new Error(`provider_http_${response.status}`);
    return 'brevo';
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify({ from: fromEmail, to: [to], subject, html, text, reply_to: fromEmail }),
  });
  if (!response.ok) throw new Error(`provider_http_${response.status}`);
  return 'resend';
}

async function handleSecurityLogin(req, res) {
  setSecurityCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Security service is not configured.' });

  const authHeader = String(req.headers.authorization || '');
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const deviceId = String(req.body?.device_id || '').trim();
  if (!accessToken || !/^[A-Za-z0-9._:-]{20,160}$/.test(deviceId)) return res.status(400).json({ error: 'A valid authenticated device identifier is required.' });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user?.id || !userData.user.email) return res.status(401).json({ error: 'Authentication could not be verified.' });

  const salt = process.env.LOGIN_SECURITY_HASH_SALT || process.env.JWT_SECRET;
  if (!salt) return res.status(503).json({ error: 'Security hashing is not configured.' });
  const now = new Date();
  const userId = userData.user.id;
  const deviceHash = hash(`${userId}:${deviceId}`, salt);
  const ipHash = hash(getClientIp(req), salt);
  const userAgent = summarizeUserAgent(req.headers['user-agent']);
  const country = String(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '').slice(0, 2).toUpperCase() || null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existing, error: lookupError } = await admin.from('trusted_login_devices').select('device_hash, alert_count').eq('user_id', userId).eq('device_hash', deviceHash).maybeSingle();
  if (lookupError) return res.status(500).json({ error: 'Unable to check sign-in security state.' });
  const isNewDevice = !existing;
  let alertAttempted = false;
  let alertSent = false;
  let alertError = null;

  const devicePayload = { user_id: userId, device_hash: deviceHash, last_seen_at: now.toISOString(), last_login_at: now.toISOString(), user_agent: userAgent, country_code: country, ip_hash: ipHash };
  if (existing) {
    const { error } = await admin.from('trusted_login_devices').update(devicePayload).eq('user_id', userId).eq('device_hash', deviceHash);
    if (error) return res.status(500).json({ error: 'Unable to update sign-in security state.' });
  } else {
    const { error } = await admin.from('trusted_login_devices').insert({ ...devicePayload, first_seen_at: now.toISOString() });
    if (error) return res.status(500).json({ error: 'Unable to record sign-in security state.' });
  }

  if (isNewDevice) {
    alertAttempted = true;
    try {
      await sendSecurityEmail({ to: userData.user.email, occurredAt: now, device: userAgent, country });
      alertSent = true;
      await admin.from('trusted_login_devices').update({ alert_count: (existing?.alert_count || 0) + 1, last_alert_sent_at: now.toISOString() }).eq('user_id', userId).eq('device_hash', deviceHash);
    } catch (error) {
      alertError = String(error?.message || 'email_delivery_failed').slice(0, 80).replace(/[^A-Za-z0-9_:-]/g, '_');
    }
  }

  const { error: eventError } = await admin.from('login_security_events').insert({ user_id: userId, device_hash: deviceHash, occurred_at: now.toISOString(), is_new_device: isNewDevice, alert_attempted: alertAttempted, alert_sent: alertSent, alert_error: alertError, user_agent: userAgent, country_code: country, ip_hash: ipHash });
  if (eventError) console.error('[security-login] event record failed:', eventError.message);

  return res.status(200).json({ ok: true, new_device: isNewDevice, alert_sent: alertSent });
}

module.exports = async (req, res) => {
  if (isSecurityRequest(req)) return handleSecurityLogin(req, res);

  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, subject, html, text, replyTo } = req.body || {};
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.BREVO_FROM_NAME || 'Reliable Premium Marketplace';

  if (!to || !subject || !html) return res.status(400).json({ error: 'Recipient, subject, and HTML content are required.' });
  if (!brevoApiKey && !resendApiKey) return res.status(500).json({ error: 'Email service not configured. Add BREVO_API_KEY or RESEND_API_KEY.' });

  try {
    if (brevoApiKey) {
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
        sender: { name: fromName, email: fromEmail },
        to: Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }],
        subject, htmlContent: html, textContent: text,
        replyTo: replyTo ? { email: replyTo } : undefined,
      }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': brevoApiKey } });
      return res.status(200).json({ success: true, id: response.data.messageId, provider: 'brevo' });
    }

    const response = await axios.post('https://api.resend.com/emails', {
      from: fromEmail, to, subject, html, text, reply_to: replyTo || fromEmail,
    }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` } });
    return res.status(200).json({ success: true, id: response.data.id, provider: 'resend' });
  } catch (error) {
    const providerError = error.response?.data;
    const message = providerError?.message || providerError?.code || 'Failed to send email';
    return res.status(error.response?.status || 500).json({ error: message });
  }
};
