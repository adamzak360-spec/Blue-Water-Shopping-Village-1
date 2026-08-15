const crypto = require('crypto');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

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

async function processQueue(admin, limit, singlePayoutId = null) {
  const singleTestMode = Boolean(singlePayoutId);
  if (!payoutAutomationEnabled() && !(singleTestMode && singlePayoutTestEnabled())) {
    return { disabled: true, claimed: 0, processed: 0, pending: 0, failed: 0 };
  }
  const claim = singlePayoutId
    ? await admin.rpc('claim_single_eligible_payout', { p_payout_id: singlePayoutId })
    : await admin.rpc('claim_eligible_payouts', { p_limit: Math.min(Number(limit) || 25, 100) });
  const { data: payouts, error } = claim;
  if (error) throw error;
  if (!payouts || payouts.length === 0) return { claimed: 0, processed: 0, pending: 0, failed: 0 };

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
    const available = balanceByCurrency[payout.currency] ?? null;
    if (available !== null && available < Number(payout.seller_payout_amount_minor)) {
      await admin.rpc('release_payout_to_queued', {
        p_payout_id: payout.payout_id,
        p_reason: 'Paystack balance is not currently sufficient; payout remains queued.',
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
        amount: Number(payout.seller_payout_amount_minor),
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Paystack-Signature, X-Payout-Worker-Secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query?.action || req.body?.action || (req.method === 'GET' ? 'process-queue' : null);
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    if (action === 'process-queue' || action === 'process-single') {
      const singlePayoutId = action === 'process-single' ? (req.body?.payout_id || req.query?.payout_id) : null;
      const allowed = payoutAutomationEnabled() || (singlePayoutId && singlePayoutTestEnabled());
      if (!allowed) return res.status(409).json({ disabled: true, error: 'Automated payouts are disabled until production verification is complete.' });
      const workerSecret = process.env.PAYOUT_WORKER_SECRET;
      const cronSecret = process.env.CRON_SECRET;
      const suppliedSecret = req.headers['x-payout-worker-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if ((!workerSecret || suppliedSecret !== workerSecret) && (!cronSecret || suppliedSecret !== cronSecret)) return res.status(401).json({ error: 'Unauthorized' });
      if (action === 'process-single' && !singlePayoutId) return res.status(400).json({ error: 'payout_id is required for a single-payout test' });
      const admin = supabaseAdmin();
      const result = await processQueue(admin, req.body?.limit || req.query?.limit, singlePayoutId);
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
