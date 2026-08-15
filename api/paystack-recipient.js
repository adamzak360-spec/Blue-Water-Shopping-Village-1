const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';
const SUPPORTED_RECIPIENTS = new Set(['ghipss', 'mobile_money', 'kepss', 'nuban', 'basa', 'mobile_money_business']);

function payoutAutomationEnabled() {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env.PAYOUT_AUTOMATION_ENABLED || '').trim().toLowerCase());
}

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

function headers() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
}

function clean(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', requestOrigin(req));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!payoutAutomationEnabled()) return res.status(409).json({ disabled: true, error: 'Automated Paystack payouts are disabled until production verification is complete.' });
    const token = bearer(req);
    if (!token) return res.status(401).json({ error: 'Seller authentication is required' });
    const body = req.body || {};
    const storeId = clean(body.store_id, 80);
    const countryCode = clean(body.country_code, 2).toUpperCase();
    const currency = clean(body.currency, 3).toUpperCase();
    const recipientType = clean(body.recipient_type, 40);
    const accountName = clean(body.account_name, 160);
    const accountNumber = clean(body.account_number, 80);
    const bankCode = clean(body.bank_code, 40);
    if (!storeId || !countryCode || !currency || !recipientType || !accountName || !accountNumber || !bankCode) {
      return res.status(400).json({ error: 'Country, currency, payout type, account name, account number, and bank/provider code are required' });
    }
    if (!SUPPORTED_RECIPIENTS.has(recipientType)) return res.status(400).json({ error: 'Unsupported Paystack recipient type' });

    const admin = adminClient();
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

    const { data: business, error: businessError } = await admin
      .from('businesses').select('id, owner_id, country_code, currency_code').eq('id', storeId).maybeSingle();
    if (businessError) throw businessError;
    if (!business || business.owner_id !== authData.user.id) return res.status(403).json({ error: 'You are not allowed to update this payout profile' });
    if (business.country_code && business.country_code !== countryCode) return res.status(400).json({ error: 'Payout country must match the seller business country' });

    const { data: capability, error: capabilityError } = await admin
      .from('payment_provider_capabilities')
      .select('payout_enabled, notes')
      .eq('provider', 'paystack')
      .eq('country_code', countryCode)
      .eq('currency_code', currency)
      .maybeSingle();
    if (capabilityError) throw capabilityError;
    if (!capability?.payout_enabled) return res.status(409).json({ error: 'Paystack automated payouts are not enabled for this seller country and currency yet', manual_fallback: true, notes: capability?.notes || null });

    const payload = {
      type: recipientType,
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency,
    };
    const response = await axios.post(`${PAYSTACK_BASE_URL}/transferrecipient`, payload, { headers: headers() });
    const recipient = response.data?.data;
    if (!recipient?.recipient_code || recipient.active === false) return res.status(502).json({ error: 'Paystack did not activate this payout recipient' });

    const { error: saveError } = await admin.from('seller_payout_profiles').upsert({
      seller_id: authData.user.id,
      store_id: storeId,
      recipient_type: recipientType,
      recipient_code: recipient.recipient_code,
      account_name: accountName,
      account_number_last4: accountNumber.slice(-4),
      bank_code: bankCode,
      currency,
      country_code: countryCode,
      payment_provider: 'paystack',
      provider_account_reference: recipient.recipient_code,
      provider_onboarding_status: 'ACTIVE',
      is_active: true,
      payout_profile_confirmed_at: new Date().toISOString(),
      payout_profile_confirmation_note: 'Paystack recipient verified and activated.',
      updated_at: new Date().toISOString(),
    });
    if (saveError) throw saveError;

    return res.status(200).json({ status: true, data: { recipient_code: recipient.recipient_code, recipient_type: recipientType, currency, country_code: countryCode, account_name: accountName, account_number_last4: accountNumber.slice(-4), provider_onboarding_status: 'ACTIVE' } });
  } catch (error) {
    console.error('[PAYSTACK RECIPIENT]', error.response?.data || error.message || error);
    return res.status(500).json({ error: error.response?.data?.message || error.message || 'Could not configure Paystack payout recipient' });
  }
};
