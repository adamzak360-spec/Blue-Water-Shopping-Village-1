const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function requestOrigin(req) {
  const origin = req.headers.origin;
  const configured = String(process.env.APP_ORIGIN || process.env.VITE_APP_URL || 'https://reliable-now.vercel.app')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return origin && configured.includes(origin) ? origin : configured[0];
}

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function bearer(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function clean(value, max = 40) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', requestOrigin(req));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Seller authentication is required' });
    const admin = adminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

    const type = clean(req.query?.type).toLowerCase();
    if (!['ghipss', 'mobile_money'].includes(type)) return res.status(400).json({ error: 'Only Ghana bank or mobile-money institutions are supported' });
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');

    const response = await axios.get(`${PAYSTACK_BASE_URL}/bank`, {
      params: { country: 'ghana', currency: 'GHS', type, perPage: 100 },
      headers: { Authorization: `Bearer ${secret}` },
    });
    const institutions = Array.isArray(response.data?.data) ? response.data.data : [];
    const safeInstitutions = institutions
      .filter(item => item && item.active !== false && item.is_deleted !== true && item.code && item.name)
      .map(item => ({ name: String(item.name), code: String(item.code), type, currency: 'GHS', country_code: 'GH' }));

    return res.status(200).json({ status: true, data: safeInstitutions });
  } catch (error) {
    console.error('[PAYSTACK BANKS]', error.response?.data || error.message || error);
    return res.status(500).json({ error: error.response?.data?.message || error.message || 'Could not load Paystack institutions' });
  }
};
