const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { getPaystackFeeConfig, calculatePayoutAmounts } = require('../lib/payout-fees');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function isEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function payoutAutomationEnabled() {
  return isEnabled(process.env.PAYOUT_AUTOMATION_ENABLED);
}

function singlePayoutTestEnabled() {
  return isEnabled(process.env.PAYOUT_SINGLE_TEST_ENABLED);
}

function requestOrigin(req) {
  const origin = req.headers.origin;
  const configured = String(process.env.APP_ORIGIN || process.env.VITE_APP_URL || 'https://reliable-now.vercel.app')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return origin && configured.includes(origin) ? origin : configured[0];
}

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function paystackHeaders() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY is not configured');
  return { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
}

function timingSafeEqualHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

function verifyPaystackSignature(req) {
  const signature = req.headers['x-paystack-signature'];
  if (!signature || !req.rawBody || !process.env.PAYSTACK_SECRET_KEY) return false;
  const raw = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
  const expected = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  return timingSafeEqualHex(expected, String(signature));
}

function transferReference(payoutId) {
  return `reliable_payout_${payoutId.replace(/-/g, '')}`.slice(0, 50);
}

async function verifyTransfer(headers, reference) {
  try {
    const response = await axios.get(`${PAYSTACK_BASE_URL}/transfer/${encodeURIComponent(reference)}`, { headers });
    return response.data?.data || null;
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
}

async function recordTransferEvent(admin, eventKey, eventName, reference, payload) {
  const { error } = await admin.rpc('record_payout_transfer_event', {
    p_event_key: eventKey,
    p_event_name: eventName,
    p_transfer_reference: reference,
    p_payload: payload,
  });
  if (error) throw error;
}

async function getAuthenticatedAdmin(admin, req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!token) return null;
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData?.user) return null;
  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
  if (profileError) throw profileError;
  const role = String(profile?.role || '').toLowerCase();
  return ['admin', 'general_admin'].includes(role) ? authData.user : null;
}

async function getQueuedSinglePayout(admin, payoutId) {
  const { data: payout, error: payoutError } = await admin.from('seller_payouts').select('*').eq('payout_id', payoutId).maybeSingle();
  if (payoutError) throw payoutError;
  if (!payout) return null;
  const { data: profile, error: profileError } = await admin.from('seller_payout_profiles').select('recipient_code, recipient_type, country_code, is_active, payout_profile_confirmed_at, provider_onboarding_status, payment_provider').eq('seller_id', payout.seller_id).eq('store_id', payout.store_id).maybeSingle();
  if (profileError) throw profileError;
  if (!profile) return null;
  return {
    payout_id: payout.payout_id,
    order_id: payout.order_id,
    seller_id: payout.seller_id,
    store_id: payout.store_id,
    seller_payout_amount_minor: payout.seller_payout_amount_minor,
    payout_fee_minor: payout.payout_fee_minor,
    seller_amount_sent_minor: payout.seller_amount_sent_minor,
    provider_total_debit_minor: payout.provider_total_debit_minor,
    minimum_transfer_minor: payout.minimum_transfer_minor,
    payout_method: payout.payout_method,
    country_code: payout.country_code,
    currency: payout.currency,
    recipient_code: profile.recipient_code,
    paystack_transfer_reference: payout.paystack_transfer_reference,
    payout_status: payout.payout_status,
    eligibility_status: payout.eligibility_status,
    profile_active: profile.is_active,
    profile_confirmed: Boolean(profile.payout_profile_confirmed_at),
    provider_onboarding_status: profile.provider_onboarding_status,
    payment_provider: profile.payment_provider,
  };
}

async function verifySinglePayoutSafety(admin, payoutId) {
  const { data: payout, error: payoutError } = await admin.from('seller_payouts').select('payout_id, order_id, seller_id, store_id, payout_status, eligibility_status, payout_mode, payment_provider, currency, payout_fee_minor, seller_amount_sent_minor, provider_total_debit_minor, paystack_transfer_reference').eq('payout_id', payoutId).maybeSingle();
  if (payoutError) throw payoutError;
  if (!payout) return { ok: false, reason: 'Payout not found.' };
  const { data: order, error: orderError } = await admin.from('orders').select('status, customer_delivery_confirmation, admin_delivery_confirmation').eq('id', payout.order_id).maybeSingle();
  if (orderError) throw orderError;
  const { data: profile, error: profileError } = await admin.from('seller_payout_profiles').select('recipient_code, is_active, payout_profile_confirmed_at, provider_onboarding_status, payment_provider').eq('seller_id', payout.seller_id).eq('store_id', payout.store_id).maybeSingle();
  if (profileError) throw profileError;
  const confirmed = order?.customer_delivery_confirmation === 'CONFIRMED' || order?.admin_delivery_confirmation === true;
  const safe = payout.payout_status === 'QUEUED'
    && payout.eligibility_status === 'ELIGIBLE'
    && payout.payout_mode === 'AUTOMATED'
    && String(payout.payment_provider || 'paystack').toLowerCase() === 'paystack'
    && order?.status === 'delivered'
    && confirmed
    && profile?.is_active === true
    && Boolean(profile?.payout_profile_confirmed_at)
    && profile?.provider_onboarding_status === 'ACTIVE'
    && String(profile?.payment_provider || 'paystack').toLowerCase() === 'paystack'
    && Boolean(profile?.recipient_code)
    && payout.payout_fee_minor != null
    && payout.seller_amount_sent_minor != null
    && payout.provider_total_debit_minor != null
    && !payout.paystack_transfer_reference;
  return { ok: safe, reason: safe ? null : 'Payout safety revalidation failed; no transfer was sent.' };
}

async function processQueue(admin, limit, singlePayoutId = null, allowAdminSingle = false) {
  const singleTestMode = Boolean(singlePayoutId);
  if (!payoutAutomationEnabled() && !(singleTestMode && (singlePayoutTestEnabled() || allowAdminSingle))) {
    return { disabled: true, claimed: 0, processed: 0, pending: 0, failed: 0 };
  }
  let payouts;
  if (singlePayoutId) {
    const { data: queuedPayout, error: queuedError } = await admin.rpc('claim_single_eligible_payout', { p_payout_id: singlePayoutId });
    if (queuedError) throw queuedError;
    if (queuedPayout && queuedPayout.length > 0) {
      payouts = queuedPayout;
    } else {
      const current = await getQueuedSinglePayout(admin, singlePayoutId);
      if (!current || current.payout_status !== 'QUEUED' || current.eligibility_status !== 'ELIGIBLE' || !current.profile_active || !current.profile_confirmed || !current.recipient_code) {
        return { claimed: 0, processed: 0, pending: 0, failed: 0, skipped: true, reason: 'Payout is not in a safe eligible queued state.' };
      }
      payouts = [current];
    }
  } else {
    const claim = await admin.rpc('claim_eligible_payouts', { p_limit: Math.min(Number(limit) || 25, 100) });
    if (claim.error) throw claim.error;
    payouts = claim.data;
  }
  if (!payouts || payouts.length === 0) return { claimed: 0, processed: 0, pending: 0, failed: 0 };

  if (singlePayoutId) {
    const safety = await verifySinglePayoutSafety(admin, singlePayoutId);
    if (!safety.ok) return { claimed: 0, processed: 0, pending: 0, failed: 0, skipped: true, reason: safety.reason };
  }

  const headers = paystackHeaders();
  let processed = 0;
  let pending = 0;
  let failed = 0;

  let balanceByCurrency = {};
  try {
    const balanceResponse = await axios.get(`${PAYSTACK_BASE_URL}/balance`, { headers });
    for (const balance of balanceResponse.data?.data || []) balanceByCurrency[balance.currency] = Number(balance.balance || 0);
  } catch (error) {
    console.error('[PAYOUT] Could not inspect Paystack balance:', error.response?.data || error.message);
  }

  for (const payout of payouts) {
    const feeConfig = getPaystackFeeConfig({
      country: payout.country_code || 'GH',
      currency: payout.currency,
      payoutMethod: payout.payout_method || payout.recipient_type,
    });
    if (!feeConfig) {
      await admin.rpc('release_payout_to_queued', {
        p_payout_id: payout.payout_id,
        p_reason: 'Payout method or fee configuration is not verified; payout remains queued.',
      });
      pending += 1;
      continue;
    }

    const amounts = calculatePayoutAmounts({
      sellerAmountBeforeFeeMinor: Number(payout.seller_payout_amount_minor),
      feeMinor: feeConfig.feeMinor,
      minimumTransferMinor: feeConfig.minimumTransferMinor,
    });
    if (!amounts.feeSufficient || !amounts.minimumTransferSatisfied || !amounts.providerTotalDebitMinor) {
      await admin.rpc('release_payout_to_queued', {
        p_payout_id: payout.payout_id,
        p_reason: !amounts.feeSufficient
          ? 'Seller amount is insufficient to cover the applicable payout transfer fee.'
          : 'Calculated seller transfer is below the provider minimum; payout remains queued.',
      });
      pending += 1;
      continue;
    }

    const available = balanceByCurrency[payout.currency] ?? null;
    if (available !== null && available < amounts.providerTotalDebitMinor) {
      await admin.rpc('release_payout_to_queued', {
        p_payout_id: payout.payout_id,
        p_reason: `Paystack available balance is insufficient for provider debit of ${amounts.providerTotalDebitMinor} minor units; payout remains queued.`,
      });
      pending += 1;
      continue;
    }

    const reference = payout.paystack_transfer_reference || transferReference(payout.payout_id);
    const { data: claimed, error: claimError } = await admin.rpc('mark_payout_processing', {
      p_payout_id: payout.payout_id,
      p_reference: reference,
    });
    if (claimError || !claimed) {
      pending += 1;
      continue;
    }

    let transferInitiated = false;
    try {
      // Verify the deterministic reference before creating a new transfer. This
      // closes the timeout window where Paystack may have accepted the transfer
      // but the original request did not return to the worker.
      const existingTransfer = await verifyTransfer(headers, reference);
      if (existingTransfer) {
        const existingStatus = String(existingTransfer.status || '').toLowerCase();
        if (existingStatus === 'success') {
          await recordTransferEvent(admin, `verified:${reference}:success`, 'transfer.success', reference, existingTransfer);
          processed += 1;
        } else {
          pending += 1;
        }
        continue;
      }

      const initiated = await axios.post(`${PAYSTACK_BASE_URL}/transfer`, {
        source: 'balance',
        amount: amounts.sellerAmountSentMinor,
        recipient: payout.recipient_code,
        reference,
        reason: `Reliable seller payout for order ${payout.order_id}`,
        currency: payout.currency,
      }, { headers });
      transferInitiated = true;

      const transfer = initiated.data?.data || {};
      const verified = await axios.get(`${PAYSTACK_BASE_URL}/transfer/${encodeURIComponent(reference)}`, { headers });
      const verifiedTransfer = verified.data?.data || {};
      const status = String(verifiedTransfer.status || transfer.status || '').toLowerCase();

      if (status === 'success') {
        await recordTransferEvent(admin, `verified:${reference}:success`, 'transfer.success', reference, verifiedTransfer);
        processed += 1;
      } else {
        // Paystack may report a queued/pending transfer. Leave it PROCESSING;
        // the webhook or a later reconciliation must decide the final state.
        pending += 1;
      }
    } catch (error) {
      console.error('[PAYOUT] Transfer attempt failed:', payout.payout_id, error.response?.data || error.message);
      const message = error.response?.data?.message || error.message || 'Transfer attempt failed';

      if (!transferInitiated) {
        // A network error or a provider conflict can happen after Paystack has
        // accepted the deterministic reference. Re-check before recording a
        // failure that would make a safe retry impossible to distinguish.
        try {
          const recoveredTransfer = await verifyTransfer(headers, reference);
          if (recoveredTransfer) {
            const recoveredStatus = String(recoveredTransfer.status || '').toLowerCase();
            if (recoveredStatus === 'success') {
              await recordTransferEvent(admin, `verified:${reference}:success`, 'transfer.success', reference, recoveredTransfer);
              processed += 1;
            } else {
              pending += 1;
            }
            continue;
          }
        } catch (verificationError) {
          console.error('[PAYOUT] Recovery verification failed:', payout.payout_id, verificationError.response?.data || verificationError.message);
          pending += 1;
          continue;
        }
      }

      if (transferInitiated) {
        // The transfer may already exist even if status verification failed.
        // Do not mark it FAILED or retry it with the same recipient payout
        // reference, because that could create a duplicate transfer.
        pending += 1;
        continue;
      }

      await admin.rpc('record_payout_transfer_event', {
        p_event_key: `worker-failure:${reference}:${Date.now()}`,
        p_event_name: 'transfer.failed',
        p_transfer_reference: reference,
        p_payload: { message },
      });
      failed += 1;
    }
  }

  return { claimed: payouts.length, processed, pending, failed };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', requestOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Paystack-Signature, X-Payout-Worker-Secret, X-Payout-Single-Test-Token');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || req.body?.action || (req.method === 'GET' ? 'process-queue' : null);
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (action === 'process-queue' || action === 'process-single' || action === 'admin-process-single') {
      const singlePayoutId = action === 'process-queue' ? null : (req.body?.payout_id || req.query?.payout_id);
      const allowed = payoutAutomationEnabled() || (singlePayoutId && (singlePayoutTestEnabled() || action === 'admin-process-single'));
      if (!allowed) return res.status(409).json({ disabled: true, error: 'Automated payouts are disabled until production verification is complete.' });
      const workerSecret = process.env.PAYOUT_WORKER_SECRET;
      const cronSecret = process.env.CRON_SECRET;
      const singleTestToken = process.env.PAYOUT_SINGLE_TEST_TOKEN;
      const suppliedSecret = req.headers['x-payout-worker-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const suppliedSingleTestToken = req.headers['x-payout-single-test-token'];
      const recurringAuthorized = (workerSecret && suppliedSecret === workerSecret) || (cronSecret && suppliedSecret === cronSecret);
      const singleTestAuthorized = action === 'process-single' && singlePayoutTestEnabled() && singleTestToken && suppliedSingleTestToken === singleTestToken;
      const admin = supabaseAdmin();
      const authenticatedAdmin = action === 'admin-process-single' ? await getAuthenticatedAdmin(admin, req) : null;
      const adminAuthorized = action === 'admin-process-single' && Boolean(authenticatedAdmin);
      if (!recurringAuthorized && !singleTestAuthorized && !adminAuthorized) return res.status(401).json({ error: 'Unauthorized' });
      if ((action === 'process-single' || action === 'admin-process-single') && !singlePayoutId) return res.status(400).json({ error: 'payout_id is required for a single-payout test' });
      const result = await processQueue(admin, req.body?.limit || req.query?.limit, singlePayoutId, adminAuthorized);
      return res.status(200).json(result);
    }

    if (action === 'webhook') {
      if (!verifyPaystackSignature(req)) return res.status(401).json({ error: 'Invalid Paystack signature' });
      const admin = supabaseAdmin();
      const event = req.body || {};
      const transfer = event.data || {};
      const eventName = String(event.event || '').toLowerCase();
      const mapped = {
        'transfer.success': 'transfer.success',
        'transfer.failed': 'transfer.failed',
        'transfer.reversed': 'transfer.reversed',
      }[eventName];
      if (mapped) {
        const reference = transfer.reference || transfer.transfer_code;
        const eventKey = `${eventName}:${reference}:${transfer.id || transfer.updatedAt || 'unknown'}`;
        await recordTransferEvent(admin, eventKey, mapped, reference, transfer);
      }
      return res.status(200).json({ received: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('[PAYOUT API]', error.response?.data || error.message || error);
    return res.status(500).json({ error: 'Payout operation failed' });
  }
};

module.exports.processQueue = processQueue;
module.exports.verifyPaystackSignature = verifyPaystackSignature;
module.exports.payoutAutomationEnabled = payoutAutomationEnabled;
