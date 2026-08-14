const crypto = require('crypto');
const axios = require('axios');

const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

function flutterwaveHeaders() {
  const secret = process.env.FLW_SECRET_KEY;
  if (!secret) throw new Error('FLW_SECRET_KEY is not configured');
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

function normalizedStatus(value) {
  const status = String(value || '').toLowerCase();
  if (['successful', 'success', 'completed'].includes(status)) return 'success';
  if (['failed', 'cancelled', 'canceled'].includes(status)) return 'failed';
  if (['refunded'].includes(status)) return 'refunded';
  if (['reversed'].includes(status)) return 'reversed';
  return 'pending';
}

function normalizeVerification(payload) {
  const data = payload?.data || {};
  return {
    provider: 'flutterwave',
    providerReference: String(data.tx_ref || data.flw_ref || ''),
    transactionId: data.id ? String(data.id) : undefined,
    status: normalizedStatus(data.status),
    amountMinor: Math.round(Number(data.amount || 0) * 100),
    currency: String(data.currency || '').toUpperCase(),
    paidAt: data.created_at || data.charged_at || undefined,
    raw: payload,
  };
}

async function initialize(body) {
  const { email, amount, currency, tx_ref, redirect_url, customer, meta, payment_options } = body;
  if (!email || !tx_ref || !redirect_url) throw new Error('email, tx_ref, and redirect_url are required');

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('amount must be a positive number');
  if (!/^[A-Z]{3}$/.test(String(currency || '').toUpperCase())) throw new Error('currency must be an ISO 4217 code');

  const response = await axios.post(`${FLUTTERWAVE_BASE_URL}/payments`, {
    tx_ref: String(tx_ref),
    amount: numericAmount,
    currency: String(currency).toUpperCase(),
    redirect_url: String(redirect_url),
    payment_options,
    customer: {
      email: String(customer?.email || email),
      name: customer?.name,
      phonenumber: customer?.phonenumber,
    },
    meta,
  }, { headers: flutterwaveHeaders() });

  const data = response.data?.data || {};
  if (!data.link) throw new Error('Flutterwave did not return a checkout link');
  return {
    provider: 'flutterwave',
    providerReference: String(data.tx_ref || tx_ref),
    redirectUrl: data.link,
    status: 'requires_action',
    raw: response.data,
  };
}

async function verify(body) {
  const txRef = String(body.tx_ref || '').trim();
  const transactionId = String(body.transaction_id || '').trim();
  if (!txRef && !transactionId) throw new Error('tx_ref or transaction_id is required');

  const url = transactionId
    ? `${FLUTTERWAVE_BASE_URL}/transactions/${encodeURIComponent(transactionId)}/verify`
    : `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`;
  const response = await axios.get(url, { headers: flutterwaveHeaders() });
  return normalizeVerification(response.data);
}

function isValidWebhook(req) {
  const configuredHash = process.env.FLW_SECRET_HASH;
  const receivedHash = req.headers['verif-hash'] || req.headers['Verif-Hash'];
  if (!configuredHash || !receivedHash) return false;
  const expected = Buffer.from(String(configuredHash));
  const received = Buffer.from(String(receivedHash));
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, verif-hash');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const action = String(req.body?.action || '');
  try {
    if (action === 'initialize') return res.status(200).json(await initialize(req.body || {}));
    if (action === 'verify') return res.status(200).json(await verify(req.body || {}));
    if (action === 'webhook') {
      if (!isValidWebhook(req)) return res.status(401).json({ error: 'Invalid Flutterwave webhook signature' });
      return res.status(200).json({ received: true, event: req.body?.event || null });
    }
    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('[FLUTTERWAVE API]', error.response?.data || error.message || error);
    return res.status(error.response?.status >= 400 && error.response.status < 500 ? error.response.status : 500)
      .json({ error: error.response?.data?.message || error.message || 'Flutterwave operation failed' });
  }
};

module.exports.normalizeVerification = normalizeVerification;
module.exports.normalizedStatus = normalizedStatus;
