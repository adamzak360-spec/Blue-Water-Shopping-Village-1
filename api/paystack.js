const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSupabaseAdmin() {
  // Keep the service credential server-only. Accept the established Supabase
  // aliases used by existing Reliable deployments, but never fall back to the
  // browser anon key for privileged seller/payment operations.
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwouhwizzwwykchgflyk.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    const missing = [!url ? 'SUPABASE_URL' : '', !key ? 'SUPABASE_SERVICE_ROLE_KEY' : ''].filter(Boolean).join(', ');
    throw new Error(`Supabase server configuration is missing: ${missing}`);
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

function paystackHeaders(secret) {
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

function timingSafeEqualHex(expected, received) {
  if (!expected || !received || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(received, 'utf8'));
}

function verifyPaystackSignature(req, secret) {
  const received = req.headers?.['x-paystack-signature'] || req.headers?.['X-Paystack-Signature'];
  const rawBody = req.rawBody ? Buffer.from(req.rawBody) : Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(expected, received);
}

async function verifyPaystackTransaction(reference, secret) {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders(secret) },
  );
  return response.data;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' })[char]);
}

function getEmailProviderConfig() {
  return {
    brevoApiKey: process.env.BREVO_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.BREVO_FROM_EMAIL || process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev',
    fromName: process.env.BREVO_FROM_NAME || 'Reliable Premium Marketplace',
    adminEmail: process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || process.env.BREVO_ADMIN_EMAIL || 'adamzak360@gmail.com',
  };
}

function orderEmailContent(order, recipientType, storeName) {
  const shortId = String(order.id).slice(0, 8);
  const items = Array.isArray(order.items) ? order.items : [];
  const itemLines = items.map((item) => `${escapeHtml(item.name || item.product_name || 'Item')} × ${Number(item.quantity || 1)}`).join('<br>') || 'Order items are available in the dashboard.';
  const audience = recipientType === 'customer' ? 'Your order has been confirmed.' : recipientType === 'seller' ? `A new order has been placed for ${escapeHtml(storeName || 'your store')}.` : 'A new paid order has been received.';
  const subject = recipientType === 'customer' ? `Reliable order confirmation #${shortId}` : recipientType === 'seller' ? `New order for ${storeName || 'your store'} #${shortId}` : `New paid order #${shortId}`;
  const text = [audience, `Order: #${shortId}`, `Customer: ${order.customer_name || ''} (${order.customer_email || ''})`, `Items: ${items.map((item) => `${item.name || item.product_name || 'Item'} x${Number(item.quantity || 1)}`).join(', ')}`, `Total: ${order.currency || 'GHS'} ${Number(order.total || 0).toFixed(2)}`, `Payment status: ${order.payment_status || 'paid'}`, `Delivery: ${order.delivery_address || 'See dashboard'}`].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1f2937"><div style="background:#032D61;color:#fff;padding:22px"><strong style="font-size:22px">Reliable</strong><span style="margin-left:8px;color:#b7e4c7">Premium Marketplace</span></div><div style="padding:24px;border:1px solid #e5e7eb"><h2>${escapeHtml(audience)}</h2><p><strong>Order #${escapeHtml(shortId)}</strong></p><p>${itemLines}</p><p><strong>Total:</strong> ${escapeHtml(order.currency || 'GHS')} ${Number(order.total || 0).toFixed(2)}<br><strong>Payment:</strong> ${escapeHtml(order.payment_status || 'paid')}<br><strong>Customer:</strong> ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)})</p><p><strong>Delivery:</strong> ${escapeHtml(order.delivery_address || 'See dashboard')}</p></div></div>`;
  return { subject, text, html };
}

async function sendThroughConfiguredProvider({ to, subject, html, text }) {
  const { brevoApiKey, resendApiKey, fromEmail, fromName } = getEmailProviderConfig();
  if (!brevoApiKey && !resendApiKey) throw new Error('provider_not_configured');
  if (brevoApiKey) {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', { sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, htmlContent: html, textContent: text }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': brevoApiKey } });
    return { provider: 'brevo', messageId: response.data?.messageId || null };
  }
  const response = await axios.post('https://api.resend.com/emails', { from: fromEmail, to: [to], subject, html, text, reply_to: fromEmail }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` } });
  return { provider: 'resend', messageId: response.data?.id || null };
}

async function deliverOrderEmail(supabaseAdmin, order, recipientType, recipientEmail, storeName) {
  const email = String(recipientEmail || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { skipped: true, reason: 'invalid_recipient' };
  const content = orderEmailContent(order, recipientType, storeName);
  const { data: existing, error: existingError } = await supabaseAdmin.from('order_email_deliveries').select('id,status,attempts').eq('order_id', order.id).eq('recipient_type', recipientType).eq('recipient_email', email).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.status === 'sent') return { skipped: true, reason: 'already_sent' };
  const { data: delivery, error: upsertError } = await supabaseAdmin.from('order_email_deliveries').upsert({ order_id: order.id, recipient_type: recipientType, recipient_email: email, subject: content.subject, payload: { store_name: storeName || null }, status: 'pending', last_attempt_at: new Date().toISOString(), attempts: Number(existing?.attempts || 0) + 1 }, { onConflict: 'order_id,recipient_type,recipient_email' }).select('id').single();
  if (upsertError) throw upsertError;
  try {
    const providerResult = await sendThroughConfiguredProvider({ to: email, ...content });
    await supabaseAdmin.from('order_email_deliveries').update({ status: 'sent', provider: providerResult.provider, provider_message_id: providerResult.messageId, sent_at: new Date().toISOString(), last_error: null }).eq('id', delivery.id);
    console.log(`[order-email] ${recipientType} accepted for order ${order.id}`);
    return { sent: true, provider: providerResult.provider };
  } catch (error) {
    const safeError = String(error?.response?.data?.message || error?.message || 'email_delivery_failed').slice(0, 500);
    await supabaseAdmin.from('order_email_deliveries').update({ status: 'failed', last_error: safeError }).eq('id', delivery.id);
    console.error(`[order-email] ${recipientType} failed for order ${order.id}: ${safeError}`);
    return { sent: false, error: safeError };
  }
}

async function dispatchPostPaymentNotifications(supabaseAdmin, order) {
  if (!order?.id) return { skipped: true, reason: 'missing_order' };
  const { data: store } = order.business_id ? await supabaseAdmin.from('businesses').select('name,contact_email,owner_id').eq('id', order.business_id).maybeSingle() : { data: null };
  let sellerEmail = store?.contact_email || '';
  if (!sellerEmail && store?.owner_id) {
    const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(store.owner_id);
    sellerEmail = ownerData?.user?.email || '';
  }
  const { adminEmail } = getEmailProviderConfig();
  const recipients = [['customer', order.customer_email], ['admin', adminEmail], ['seller', sellerEmail]];
  const results = await Promise.all(recipients.map(([type, email]) => deliverOrderEmail(supabaseAdmin, order, type, email, store?.name)));
  if (order.user_id) {
    const { data: existingCustomerNotice } = await supabaseAdmin.from('notifications').select('id').eq('user_id', order.user_id).eq('order_id', order.id).eq('type', 'order_update').limit(1);
    if (!existingCustomerNotice?.length) {
      const { error: noticeError } = await supabaseAdmin.from('notifications').insert({ user_id: order.user_id, title: 'Order Confirmed', message: `Your order #${String(order.id).slice(0, 8)} has been received.`, type: 'order_update', order_id: order.id, is_read: false });
      if (noticeError) console.error('[order-notification] customer notification failed:', noticeError.message);
    }
  }
  return { results };
}

function addOneMonth(value) {
  const next = new Date(value);
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

function isActiveSubscription(business) {
  return Boolean(
    business?.pos_subscription_active &&
    business?.pos_subscription_expires_at &&
    new Date(business.pos_subscription_expires_at).getTime() > Date.now(),
  );
}

// The exact set of columns present on the orders table at runtime. If the
// insert fails with a 42703 "column does not exist" error, the payload is
// stripped to this list and retried once so a database schema that has not
// yet picked up a recent migration never blocks a successful payment.
const ORDERS_KNOWN_COLUMNS = new Set([
  'user_id', 'business_id', 'customer_name', 'customer_email', 'customer_phone',
  'delivery_address', 'city', 'region', 'notes', 'items', 'subtotal',
  'delivery_fee', 'total', 'currency', 'status', 'payment_status',
  'payment_method', 'paystack_reference', 'payment_provider', 'provider_reference',
  'provider_transaction_id', 'payment_metadata', 'source', 'amount_paid',
  'payment_date', 'paid_at', 'transaction_id',
  'phone', 'delivery_method', 'metadata', 'webhook_received_at',
]);

function stripUnknownOrderColumns(payload) {
  const cleaned = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ORDERS_KNOWN_COLUMNS.has(key)) cleaned[key] = value;
  }
  return cleaned;
}

function normalizeReservationPayload(value) {
  const input = value && typeof value === 'object' ? value : {};
  const items = Array.isArray(input.items) ? input.items.slice(0, 100) : [];
  const total = Number(input.total);
  const subtotal = Number(input.subtotal);
  const deliveryFee = Number(input.delivery_fee || 0);
  if (!items.length || !Number.isFinite(total) || total <= 0 || !Number.isFinite(subtotal) || subtotal < 0 || !Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new Error('A valid cart and order total are required for reservation');
  }
  const customerEmail = String(input.customer_email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error('A valid customer email is required');
  const currency = String(input.currency || 'GHS').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid payment currency');
  return {
    customer_name: String(input.customer_name || '').trim().slice(0, 160),
    customer_email: customerEmail.slice(0, 255),
    customer_phone: input.customer_phone ? String(input.customer_phone).slice(0, 60) : null,
    delivery_address: input.delivery_address ? String(input.delivery_address).slice(0, 500) : null,
    city: input.city ? String(input.city).slice(0, 120) : null,
    region: input.region ? String(input.region).slice(0, 120) : null,
    notes: input.notes ? String(input.notes).slice(0, 1000) : null,
    items,
    subtotal,
    delivery_fee: deliveryFee,
    total,
    currency,
    delivery_method: input.delivery_method ? String(input.delivery_method).slice(0, 160) : null,
    delivery_area: input.delivery_area ? String(input.delivery_area).slice(0, 160) : null,
    business_id: input.business_id ? String(input.business_id) : null,
  };
}

async function finalizeReservedOrder(supabaseAdmin, transaction) {
  const referenceValue = String(transaction?.reference || '').trim();
  const amountMinor = Number(transaction?.amount);
  if (!referenceValue || !Number.isFinite(amountMinor)) throw new Error('Payment reference or amount is missing');

  const { data: reservation, error: reservationError } = await supabaseAdmin
    .from('order_payment_reservations')
    .select('*')
    .eq('paystack_reference', referenceValue)
    .maybeSingle();
  if (reservationError) throw reservationError;
  if (!reservation) return { reservation: null, order: null, reason: 'reservation_not_found' };

  const expectedAmountMinor = Math.round(Number(reservation.total) * 100);
  if (!Number.isFinite(expectedAmountMinor) || expectedAmountMinor !== amountMinor) {
    throw new Error('Verified payment amount does not match the reserved order total');
  }

  if (reservation.finalized_order_id) {
    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from('orders').select('*').eq('id', reservation.finalized_order_id).maybeSingle();
    if (existingOrderError) throw existingOrderError;
    return { reservation, order: existingOrder, alreadyFinalized: true };
  }

  const orderPayload = {
    user_id: reservation.user_id,
    business_id: reservation.business_id,
    customer_name: reservation.customer_name,
    customer_email: reservation.customer_email,
    customer_phone: reservation.customer_phone,
    delivery_address: reservation.delivery_address,
    city: reservation.city,
    region: reservation.region,
    notes: reservation.notes,
    items: reservation.items,
    subtotal: reservation.subtotal,
    delivery_fee: reservation.delivery_fee,
    delivery_method: reservation.delivery_method,
    delivery_area: reservation.delivery_area,
    currency: reservation.currency,
    total: reservation.total,
    status: 'pending',
    payment_status: 'paid',
    payment_method: 'paystack',
    paystack_reference: referenceValue,
    payment_provider: 'paystack',
    provider_reference: referenceValue,
    provider_transaction_id: transaction.id ? String(transaction.id) : null,
    payment_metadata: { ...(reservation.payment_metadata || {}), verification_source: 'paystack_server_finalize', payment_attempt_status: 'paid' },
    source: 'ONLINE',
    amount_paid: amountMinor / 100,
    payment_date: transaction.paid_at || new Date().toISOString(),
    paid_at: transaction.paid_at || new Date().toISOString(),
    transaction_id: transaction.id ? String(transaction.id) : null,
  };

  const { data: insertedOrder, error: insertError } = await supabaseAdmin
    .from('orders').insert(orderPayload).select('*').single();
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: duplicateOrder, error: duplicateError } = await supabaseAdmin
        .from('orders').select('*').eq('paystack_reference', referenceValue).maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicateOrder) return { reservation, order: duplicateOrder, alreadyFinalized: true };
    }
    // 42703 means a column in the payload does not exist on the orders
    // table (e.g. schema cache or migration not yet applied). Strip any
    // unknown columns and retry exactly once.
    if (insertError.code === '42703') {
      console.error('[PAYSTACK API] order insert referenced an unknown column, retrying with stripped payload:', insertError.message);
      const strippedPayload = stripUnknownOrderColumns(orderPayload);
      const retryResult = await supabaseAdmin.from('orders').insert(strippedPayload).select('*').single();
      if (retryResult.error) {
        if (retryResult.error.code === '23505') {
          const { data: duplicateOrder, error: duplicateError } = await supabaseAdmin
            .from('orders').select('*').eq('paystack_reference', referenceValue).maybeSingle();
          if (duplicateError) throw duplicateError;
          if (duplicateOrder) return { reservation, order: duplicateOrder, alreadyFinalized: true };
        }
        throw retryResult.error;
      }
      return finalizeAfterInsert(supabaseAdmin, reservation, retryResult.data, transaction, false);
    }
    throw insertError;
  }
  return finalizeAfterInsert(supabaseAdmin, reservation, insertedOrder, transaction, false);
}

async function finalizeAfterInsert(supabaseAdmin, reservation, insertedOrder, transaction, alreadyFinalized) {
  const { error: reservationUpdateError } = await supabaseAdmin
    .from('order_payment_reservations')
    .update({ status: 'paid', payment_status: 'paid', provider_transaction_id: transaction.id ? String(transaction.id) : null, paid_at: transaction.paid_at || new Date().toISOString(), finalized_order_id: insertedOrder.id })
    .eq('id', reservation.id).is('finalized_order_id', null);
  if (reservationUpdateError) throw reservationUpdateError;
  return { reservation, order: insertedOrder, alreadyFinalized };
}



module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { action, email, amount, currency, reference, callback_url, metadata } = body;
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

  if (!PAYSTACK_SECRET_KEY) {
    console.error('[PAYSTACK API] PAYSTACK_SECRET_KEY is not set');
    return res.status(500).json({ error: 'Payment service not configured' });
  }

  try {
    // Paystack's charge.success webhook is the authoritative recovery path
    // when a customer's browser loses connectivity after payment. It is
    // deliberately signature-protected and idempotent: repeated deliveries
    // only rewrite the same paid state.
    if (body.event === 'charge.success') {
      if (!verifyPaystackSignature(req, PAYSTACK_SECRET_KEY)) {
        return res.status(401).json({ error: 'Invalid Paystack webhook signature' });
      }

      const transaction = body.data || {};
      const referenceValue = String(transaction.reference || '').trim();
      const amountMinor = Number(transaction.amount);
      if (!referenceValue || !Number.isFinite(amountMinor)) {
        return res.status(400).json({ error: 'Paystack webhook is missing transaction reference or amount' });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const reservationFinalization = await finalizeReservedOrder(supabaseAdmin, transaction);
      if (reservationFinalization.order) {
        try {
          await dispatchPostPaymentNotifications(supabaseAdmin, reservationFinalization.order);
        } catch (notificationError) {
          console.error('[PAYSTACK WEBHOOK] Post-payment notification dispatch failed:', notificationError.message);
        }
        return res.status(200).json({ received: true, event: body.event, reference: referenceValue, updated: reservationFinalization.alreadyFinalized ? 0 : 1, order_id: reservationFinalization.order.id });
      }
      const { data: byPaystackReference, error: paystackReferenceError } = await supabaseAdmin
        .from('orders')
        .select('id, total, status, payment_status, payment_metadata')
        .eq('paystack_reference', referenceValue);
      if (paystackReferenceError) throw paystackReferenceError;

      let orders = byPaystackReference || [];
      if (orders.length === 0) {
        const { data: byProviderReference, error: providerReferenceError } = await supabaseAdmin
          .from('orders')
          .select('id, total, status, payment_status, payment_metadata')
          .eq('provider_reference', referenceValue);
        if (providerReferenceError) throw providerReferenceError;
        orders = byProviderReference || [];
      }

      let updated = 0;
      for (const order of orders) {
        const expectedAmountMinor = Math.round(Number(order.total) * 100);
        if (!Number.isFinite(expectedAmountMinor) || expectedAmountMinor !== amountMinor) continue;

        const existingMetadata = order.payment_metadata && typeof order.payment_metadata === 'object'
          ? order.payment_metadata
          : {};
        const nextStatus = order.status === 'cancelled' || order.status === 'pending'
          ? 'pending'
          : order.status;
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status: nextStatus,
            payment_status: 'paid',
            amount_paid: amountMinor / 100,
            payment_date: transaction.paid_at || new Date().toISOString(),
            paid_at: transaction.paid_at || new Date().toISOString(),
            provider_transaction_id: transaction.id ? String(transaction.id) : null,
            payment_metadata: {
              ...existingMetadata,
              payment_attempt_status: 'paid',
              verification_source: 'paystack_webhook',
              paystack_transaction_status: String(transaction.status || 'success'),
              webhook_event: 'charge.success',
              webhook_received_at: new Date().toISOString(),
            },
          })
          .eq('id', order.id);
        if (updateError) throw updateError;
        updated += 1;
      }

      return res.status(200).json({ received: true, event: body.event, reference: referenceValue, updated });
    }

    if (action === 'reserve_order') {
      const token = getBearerToken(req);
      let userId = null;
      if (token) {
        const supabaseAdmin = getSupabaseAdmin();
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
        userId = authData.user.id;
      }
      const reservationReference = String(reference || '').trim();
      if (!/^rlbl-[A-Za-z0-9-]{8,100}$/.test(reservationReference)) return res.status(400).json({ error: 'A valid payment reference is required' });
      const reservationPayload = normalizeReservationPayload(body.reservation);
      const supabaseAdmin = getSupabaseAdmin();
      const { data: existing, error: existingError } = await supabaseAdmin.from('order_payment_reservations').select('*').eq('paystack_reference', reservationReference).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return res.status(200).json({ status: true, data: existing, alreadyReserved: true });
      const { data: reservation, error: reservationError } = await supabaseAdmin.from('order_payment_reservations').insert({ ...reservationPayload, paystack_reference: reservationReference, user_id: userId, payment_metadata: { payment_attempt_status: 'reserved', reserved_at: new Date().toISOString() } }).select('*').single();
      if (reservationError) throw reservationError;
      return res.status(200).json({ status: true, data: reservation, alreadyReserved: false });
    }

    if (action === 'finalize_reserved_order') {
      if (!reference) return res.status(400).json({ error: 'Reference is required for finalization' });
      const transactionResponse = await verifyPaystackTransaction(String(reference), PAYSTACK_SECRET_KEY);
      const transaction = transactionResponse?.data || {};
      if (String(transaction.status || '').toLowerCase() !== 'success') return res.status(409).json({ error: 'Payment is not successful yet', status: transaction.status || 'unknown' });
      const supabaseAdmin = getSupabaseAdmin();
      const result = await finalizeReservedOrder(supabaseAdmin, transaction);
      if (!result.order) return res.status(404).json({ error: 'No server-side reservation exists for this payment reference' });
      try {
        await dispatchPostPaymentNotifications(supabaseAdmin, result.order);
      } catch (notificationError) {
        console.error('[PAYSTACK API] Post-payment notification dispatch failed:', notificationError.message);
      }
      return res.status(200).json({ status: true, data: result.order, alreadyFinalized: Boolean(result.alreadyFinalized) });
    }

    if (action === 'initialize_advertising_payment') {
      const token = getBearerToken(req);
      const advertiserName = String(body.advertiser_name || '').trim();
      const advertiserType = ['SELLER', 'EXTERNAL', 'INTERNAL'].includes(String(body.advertiser_type)) ? String(body.advertiser_type) : 'EXTERNAL';
      const campaign = body.campaign || {};
      const pricingPlanId = String(campaign.pricing_plan_id || '').trim();
      const campaignName = String(campaign.campaign_name || '').trim();
      const adType = String(campaign.ad_type || 'BANNER');
      const placement = String(campaign.placement || 'HOME_TOP');
      const headline = String(campaign.headline || '').trim();
      const description = campaign.description ? String(campaign.description).trim() : null;
      const imageUrl = campaign.image_url ? String(campaign.image_url).trim() : null;
      const destinationUrl = String(campaign.destination_url || '').trim();
      const startsAt = new Date(String(campaign.starts_at || ''));
      const endsAt = new Date(String(campaign.ends_at || ''));
      let requestedAmount = Number(campaign.budget_minor);
      const allowedAdTypes = ['BANNER', 'PRODUCT', 'STORE', 'SPONSORED_PRODUCT', 'SPONSORED_STORE', 'HOMEPAGE_PROMOTION'];
      const allowedPlacements = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'PRODUCT_LIST_TOP', 'PRODUCT_LIST_MIDDLE', 'PRODUCT_DETAILS', 'STORE_PAGE', 'CATEGORY_PAGE', 'SEARCH_RESULTS', 'SIDEBAR_DESKTOP', 'MOBILE_BANNER'];

      if (!token || !advertiserName || !campaignName || !headline || !destinationUrl || !pricingPlanId) {
        return res.status(400).json({ error: 'Authenticated advertiser, campaign, secure destination, and an advertising package are required.' });
      }
      if (!allowedAdTypes.includes(adType) || !allowedPlacements.includes(placement)) return res.status(400).json({ error: 'Invalid advertising type or placement.' });
      if (!/^https:\/\//i.test(destinationUrl) || (imageUrl && !/^https:\/\//i.test(imageUrl))) return res.status(400).json({ error: 'Advertisement and image URLs must use HTTPS.' });
      if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) return res.status(400).json({ error: 'The advertising schedule is invalid.' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: pricingPlan, error: pricingPlanError } = await supabaseAdmin.from('ad_pricing_plans')
        .select('id, name, price_minor, duration_days, is_active').eq('id', pricingPlanId).maybeSingle();
      if (pricingPlanError) throw pricingPlanError;
      if (!pricingPlan || !pricingPlan.is_active) return res.status(400).json({ error: 'The selected advertising package is not available.' });
      requestedAmount = Number(pricingPlan.price_minor);
      if (!Number.isInteger(requestedAmount) || requestedAmount <= 0) return res.status(400).json({ error: 'The selected advertising package has an invalid price.' });
      const requestedDurationDays = (endsAt.getTime() - startsAt.getTime()) / 86400000;
      if (!Number.isFinite(requestedDurationDays) || Math.abs(requestedDurationDays - Number(pricingPlan.duration_days)) > 0.01) {
        return res.status(400).json({ error: `The selected package runs for ${pricingPlan.duration_days} day(s).` });
      }
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

      const { data: settings, error: settingsError } = await supabaseAdmin.from('advertising_settings')
        .select('minimum_budget_minor, maximum_duration_days, approval_required').eq('id', true).maybeSingle();
      if (settingsError) throw settingsError;
      const minimumBudget = Number(settings?.minimum_budget_minor || 0);
      const durationDays = (endsAt.getTime() - startsAt.getTime()) / 86400000;
      if (requestedAmount < minimumBudget) return res.status(400).json({ error: `The minimum advertising budget is ${minimumBudget} in the smallest currency unit.` });
      if (durationDays > Number(settings?.maximum_duration_days || 365)) return res.status(400).json({ error: 'The advertising duration is longer than the configured maximum.' });

      const paymentReference = String(reference || `rlbl-ad-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
      const { data: advertiser, error: advertiserError } = await supabaseAdmin.from('advertisers').insert({
        owner_user_id: authData.user.id,
        name: advertiserName,
        contact_email: authData.user.email || String(email || ''),
        advertiser_type: advertiserType,
      }).select('id').single();
      if (advertiserError) throw advertiserError;

      const { data: advertisement, error: advertisementError } = await supabaseAdmin.from('advertisements').insert({
        advertiser_id: advertiser.id,
        campaign_name: campaignName,
        ad_type: adType,
        placement,
        status: 'DRAFT',
        priority: Math.max(1, Math.min(100, Number(campaign.priority) || 10)),
        headline,
        description,
        image_url: imageUrl,
        destination_url: destinationUrl,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        budget_minor: requestedAmount,
        pricing_plan_id: pricingPlan.id,
        created_by: authData.user.id,
      }).select('id').single();
      if (advertisementError) throw advertisementError;

      const { data: payment, error: paymentError } = await supabaseAdmin.from('ad_payments').insert({
        advertiser_id: advertiser.id,
        advertisement_id: advertisement.id,
        amount_minor: requestedAmount,
        pricing_plan_id: pricingPlan.id,
        currency: 'GHS',
        purpose: 'ADVERTISING_PAYMENT',
        status: 'PENDING',
        payment_reference: paymentReference,
        metadata: { type: 'reliable_advertising', advertiser_id: advertiser.id, advertisement_id: advertisement.id },
      }).select('id').single();
      if (paymentError) throw paymentError;

      try {
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
          email: authData.user.email || String(email),
          amount: requestedAmount,
          currency: 'GHS',
          reference: paymentReference,
          callback_url,
          metadata: { type: 'reliable_advertising', advertiser_id: advertiser.id, advertisement_id: advertisement.id, ad_payment_id: payment.id },
        }, { headers: paystackHeaders(PAYSTACK_SECRET_KEY) });
        return res.status(200).json({ ...response.data, data: { ...response.data.data, advertiser_id: advertiser.id, advertisement_id: advertisement.id, ad_payment_id: payment.id } });
      } catch (paymentInitError) {
        await supabaseAdmin.from('ad_payments').update({ status: 'FAILED', metadata: { type: 'reliable_advertising', error: 'initialization_failed' } }).eq('id', payment.id);
        await supabaseAdmin.from('advertisements').update({ status: 'ARCHIVED', updated_at: new Date().toISOString() }).eq('id', advertisement.id);
        throw paymentInitError;
      }
    }

    if (action === 'confirm_advertising_payment') {
      const token = getBearerToken(req);
      const paymentId = String(body.ad_payment_id || '');
      const paymentReference = String(reference || '');
      if (!token || !paymentId || !paymentReference) return res.status(400).json({ error: 'Authenticated advertising payment and reference are required.' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
      const { data: payment, error: paymentError } = await supabaseAdmin.from('ad_payments')
        .select('id, advertiser_id, advertisement_id, amount_minor, currency, status, payment_reference').eq('id', paymentId).maybeSingle();
      if (paymentError) throw paymentError;
      if (!payment || payment.payment_reference !== paymentReference) return res.status(404).json({ error: 'Advertising payment was not found.' });
      const { data: advertiser, error: advertiserError } = await supabaseAdmin.from('advertisers').select('id, owner_user_id').eq('id', payment.advertiser_id).maybeSingle();
      if (advertiserError) throw advertiserError;
      if (!advertiser || advertiser.owner_user_id !== authData.user.id) return res.status(403).json({ error: 'You are not allowed to confirm this advertising payment.' });
      if (payment.status === 'SUCCESS') return res.status(200).json({ status: true, message: 'Advertising payment already confirmed.', data: payment });

      const verified = await verifyPaystackTransaction(paymentReference, PAYSTACK_SECRET_KEY);
      const transaction = verified?.data;
      const transactionMetadata = transaction?.metadata || {};
      const valid = verified?.status && transaction?.status === 'success' && String(transaction?.reference) === paymentReference && Number(transaction?.amount) === Number(payment.amount_minor) && String(transaction?.currency || '').toUpperCase() === 'GHS' && transactionMetadata.type === 'reliable_advertising';
      if (!valid) {
        await supabaseAdmin.from('ad_payments').update({ status: 'FAILED', metadata: transactionMetadata }).eq('id', payment.id).eq('status', 'PENDING');
        return res.status(400).json({ error: 'Paystack payment could not be verified for this advertising campaign.' });
      }

      const { data: settings, error: settingsError } = await supabaseAdmin.from('advertising_settings').select('approval_required').eq('id', true).maybeSingle();
      if (settingsError) throw settingsError;
      const { error: ledgerError } = await supabaseAdmin.from('ad_payments').update({ status: 'SUCCESS', paid_at: transaction?.paid_at || new Date().toISOString(), metadata: transactionMetadata }).eq('id', payment.id).eq('status', 'PENDING');
      if (ledgerError) throw ledgerError;
      const nextStatus = settings?.approval_required === false ? 'SCHEDULED' : 'PENDING_APPROVAL';
      const { data: advertisement, error: activationError } = await supabaseAdmin.from('advertisements').update({ status: nextStatus, revenue_minor: payment.amount_minor, updated_at: new Date().toISOString() }).eq('id', payment.advertisement_id).select('id, status, starts_at, ends_at').single();
      if (activationError) throw activationError;
      return res.status(200).json({ status: true, message: 'Advertising payment confirmed. Campaign submitted for approval.', data: { ...advertisement, payment_reference: paymentReference } });
    }

    if (action === 'initialize_product_visibility') {
      const token = getBearerToken(req);
      const businessId = String(body.business_id || '').trim();
      const productId = String(body.product_id || '').trim();
      const planId = String(body.plan_id || '').trim();
      if (!token || !businessId || !productId || !planId) return res.status(400).json({ error: 'Authenticated store, product, and visibility package are required.' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

      const [{ data: business, error: businessError }, { data: product, error: productError }, { data: plan, error: planError }] = await Promise.all([
        supabaseAdmin.from('businesses').select('id, owner_id').eq('id', businessId).maybeSingle(),
        supabaseAdmin.from('products').select('id, business_id, name').eq('id', productId).maybeSingle(),
        supabaseAdmin.from('product_visibility_plans').select('id, name, target, price_minor, currency, duration_days, is_active').eq('id', planId).maybeSingle(),
      ]);
      if (businessError) throw businessError;
      if (productError) throw productError;
      if (planError) throw planError;
      if (!business || business.owner_id !== authData.user.id) return res.status(403).json({ error: 'You are not allowed to publish products for this store.' });
      if (!product || product.business_id !== businessId) return res.status(400).json({ error: 'The selected product does not belong to this store.' });
      if (!plan || !plan.is_active) return res.status(400).json({ error: 'The selected visibility package is not available.' });

      const paymentReference = `rlbl-visibility-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const { data: entitlement, error: entitlementError } = await supabaseAdmin.from('product_visibility_entitlements').insert({
        seller_id: authData.user.id,
        store_id: businessId,
        product_id: productId,
        plan_id: plan.id,
        target: plan.target,
        status: 'PENDING',
        amount_minor: plan.price_minor,
        currency: 'GHS',
        duration_days: plan.duration_days,
        payment_reference: paymentReference,
        payment_metadata: { type: 'product_visibility', product_id: productId, store_id: businessId, plan_id: plan.id },
      }).select('id, payment_reference, amount_minor, currency, target, duration_days').single();
      if (entitlementError) throw entitlementError;

      try {
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
          email: authData.user.email || String(email || ''),
          amount: Number(plan.price_minor),
          currency: 'GHS',
          reference: paymentReference,
          callback_url,
          metadata: { type: 'product_visibility', visibility_entitlement_id: entitlement.id, product_id: productId, store_id: businessId, plan_id: plan.id },
        }, { headers: paystackHeaders(PAYSTACK_SECRET_KEY) });
        return res.status(200).json({ ...response.data, data: { ...response.data.data, visibility_entitlement_id: entitlement.id, payment_reference: paymentReference } });
      } catch (paymentInitError) {
        await supabaseAdmin.from('product_visibility_entitlements').update({ status: 'CANCELLED', updated_at: new Date().toISOString() }).eq('id', entitlement.id).eq('status', 'PENDING');
        throw paymentInitError;
      }
    }

    if (action === 'confirm_product_visibility') {
      const token = getBearerToken(req);
      const entitlementId = String(body.visibility_entitlement_id || '').trim();
      const paymentReference = String(reference || '').trim();
      if (!token || !entitlementId || !paymentReference) return res.status(400).json({ error: 'Authenticated visibility entitlement and payment reference are required.' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
      const { data: entitlement, error: entitlementError } = await supabaseAdmin.from('product_visibility_entitlements')
        .select('id, seller_id, amount_minor, currency, status, payment_reference, duration_days, target, starts_at, expires_at')
        .eq('id', entitlementId).maybeSingle();
      if (entitlementError) throw entitlementError;
      if (!entitlement || entitlement.seller_id !== authData.user.id || entitlement.payment_reference !== paymentReference) return res.status(404).json({ error: 'Visibility payment was not found.' });
      if (entitlement.status === 'PAID') return res.status(200).json({ status: true, message: 'Visibility payment already confirmed.', data: entitlement });
      if (entitlement.status !== 'PENDING') return res.status(409).json({ error: 'This visibility payment is no longer pending.' });

      const verified = await verifyPaystackTransaction(paymentReference, PAYSTACK_SECRET_KEY);
      const transaction = verified?.data;
      const transactionMetadata = transaction?.metadata || {};
      const valid = verified?.status && transaction?.status === 'success' && String(transaction?.reference) === paymentReference && Number(transaction?.amount) === Number(entitlement.amount_minor) && String(transaction?.currency || '').toUpperCase() === String(entitlement.currency).toUpperCase() && transactionMetadata.type === 'product_visibility';
      if (!valid) {
        await supabaseAdmin.from('product_visibility_entitlements').update({ status: 'CANCELLED', payment_metadata: transactionMetadata, updated_at: new Date().toISOString() }).eq('id', entitlementId).eq('status', 'PENDING');
        return res.status(400).json({ error: 'Paystack payment could not be verified for this visibility package.' });
      }

      const start = new Date(transaction?.paid_at || new Date().toISOString());
      const end = new Date(start.getTime() + Number(entitlement.duration_days) * 86400000);
      const { data: activated, error: activationError } = await supabaseAdmin.from('product_visibility_entitlements').update({
        status: 'PAID',
        paid_at: transaction?.paid_at || start.toISOString(),
        starts_at: start.toISOString(),
        expires_at: end.toISOString(),
        payment_metadata: transactionMetadata,
        updated_at: new Date().toISOString(),
      }).eq('id', entitlementId).eq('seller_id', authData.user.id).eq('status', 'PENDING').select('*').maybeSingle();
      if (activationError) throw activationError;
      return res.status(200).json({ status: true, message: 'Product visibility payment confirmed.', data: activated || { ...entitlement, status: 'PAID', starts_at: start.toISOString(), expires_at: end.toISOString() } });
    }

    if (action === 'initialize') {
      if (!email || !amount) {
        return res.status(400).json({ error: 'Email and amount are required for initialization' });
      }

      const requestedAmount = Number(amount);
      if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || !Number.isInteger(requestedAmount)) {
        return res.status(400).json({ error: 'Amount must be a positive integer in the smallest currency unit' });
      }

      let paymentEmail = String(email);
      let paymentAmount = requestedAmount;
      let paymentCurrency = currency;
      let paymentMetadata = metadata;
      let createdPromotionId = null;

      // Seller promotions must be initialized from the current server-side plan.
      // The browser may select a target, but it cannot choose the price or owner.
      if (metadata?.type === 'seller_promotion') {
        const businessId = String(metadata.business_id || '');
        const productId = metadata.product_id ? String(metadata.product_id) : null;
        const planId = String(metadata.plan_id || '');
        const promotionType = String(metadata.promotion_type || '');
        const targetCategories = Array.isArray(metadata.target_categories)
          ? metadata.target_categories.map(value => String(value).trim()).filter(Boolean).slice(0, 20)
          : [];
        const targetRegions = Array.isArray(metadata.target_regions)
          ? metadata.target_regions.map(value => String(value).trim().toUpperCase()).filter(Boolean).slice(0, 20)
          : [];
        const token = getBearerToken(req);
        if (!token || !businessId || !planId || !promotionType) {
          return res.status(401).json({ error: 'Authenticated seller and promotion details are required' });
        }
        if (!['FEATURED_PRODUCT', 'FEATURED_STORE'].includes(promotionType)) {
          return res.status(400).json({ error: 'Invalid promotion type' });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

        const { data: plan, error: planError } = await supabaseAdmin
          .from('promotion_plans')
          .select('id, code, price_minor, currency, duration_days, placement, max_active_promotions, is_active')
          .eq('id', planId).eq('code', promotionType).maybeSingle();
        if (planError) throw planError;
        if (!plan || !plan.is_active) return res.status(400).json({ error: 'This promotion plan is not available.' });

        const { data: business, error: businessError } = await supabaseAdmin
          .from('businesses').select('id, owner_id').eq('id', businessId).maybeSingle();
        if (businessError) throw businessError;
        if (!business || business.owner_id !== authData.user.id) return res.status(403).json({ error: 'You are not allowed to promote this store.' });

        if (promotionType === 'FEATURED_PRODUCT') {
          if (!productId) return res.status(400).json({ error: 'A product is required for featured product promotion.' });
          const { data: product, error: productError } = await supabaseAdmin.from('products').select('id, business_id').eq('id', productId).maybeSingle();
          if (productError) throw productError;
          if (!product || product.business_id !== businessId) return res.status(403).json({ error: 'You are not allowed to promote this product.' });
        }

        const { count: activeCount, error: countError } = await supabaseAdmin
          .from('seller_promotions').select('id', { count: 'exact', head: true })
          .eq('plan_id', planId).eq('status', 'ACTIVE');
        if (countError) throw countError;
        if ((activeCount || 0) >= plan.max_active_promotions) return res.status(409).json({ error: 'This promotion placement is currently full.' });

        paymentEmail = authData.user.email || paymentEmail;
        paymentAmount = Number(plan.price_minor);
        paymentCurrency = String(plan.currency || '').toUpperCase();
        paymentMetadata = {
          type: 'seller_promotion',
          promotion_type: promotionType,
          plan_id: planId,
          business_id: businessId,
          product_id: productId,
          target_categories: targetCategories,
          target_regions: targetRegions,
        };

        const { data: createdPromotion, error: promotionError } = await supabaseAdmin.from('seller_promotions').insert({
          seller_id: authData.user.id, store_id: businessId, product_id: productId, plan_id: planId,
          promotion_type: promotionType, amount_minor: paymentAmount, currency: paymentCurrency,
          target_categories: targetCategories, target_regions: targetRegions,
          payment_reference: reference, status: 'PENDING_PAYMENT', review_status: 'PENDING_REVIEW',
        }).select('id').single();
        if (promotionError) throw promotionError;
        createdPromotionId = createdPromotion?.id || null;
      }

      // POS subscriptions must be initialized from the current server-side plan.
      // This prevents a modified browser request from creating a checkout for a
      // different amount than the administrator configured.
      if (metadata?.type === 'pos_subscription') {
        const businessId = String(metadata.business_id || '');
        const token = getBearerToken(req);
        if (!token || !businessId) {
          return res.status(401).json({ error: 'Authenticated business is required for POS subscription checkout' });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData?.user) {
          return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
        }

        const { data: business, error: businessError } = await supabaseAdmin
          .from('businesses')
          .select('id, owner_id, country_code')
          .eq('id', businessId)
          .maybeSingle();
        if (businessError) throw businessError;
        if (!business || business.owner_id !== authData.user.id) {
          return res.status(403).json({ error: 'You are not allowed to subscribe this business.' });
        }

        const { data: plan, error: planError } = await supabaseAdmin
          .from('pos_subscription_plans')
          .select('monthly_price, currency_code')
          .eq('country_code', business.country_code || 'GH')
          .maybeSingle();
        if (planError) throw planError;
        if (!plan) {
          return res.status(400).json({ error: 'No POS subscription plan is configured for this country.' });
        }

        const managedAmount = Math.round(Number(plan.monthly_price) * 100);
        const managedCurrency = String(plan.currency_code || '').toUpperCase();
        if (!Number.isInteger(managedAmount) || managedAmount <= 0 || !/^[A-Z]{3}$/.test(managedCurrency)) {
          return res.status(500).json({ error: 'The POS subscription plan is not configured correctly.' });
        }

        paymentEmail = authData.user.email || paymentEmail;
        paymentAmount = managedAmount;
        paymentCurrency = managedCurrency;
        paymentMetadata = {
          type: 'pos_subscription',
          business_id: businessId,
          country_code: business.country_code || 'GH',
          currency: managedCurrency,
          billing_interval: 'monthly',
        };
      }

      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: paymentEmail,
          amount: paymentAmount,
          currency: paymentCurrency,
          reference,
          callback_url,
          metadata: paymentMetadata,
        },
        { headers: paystackHeaders(PAYSTACK_SECRET_KEY) },
      );

      console.log('[PAYSTACK API] initialize successful');
      if (createdPromotionId && response.data?.data) response.data.data.promotion_id = createdPromotionId;
      return res.status(200).json(response.data);
    }

    if (action === 'verify') {
      if (!reference) {
        return res.status(400).json({ error: 'Reference is required for verification' });
      }

      const verified = await verifyPaystackTransaction(String(reference), PAYSTACK_SECRET_KEY);
      console.log('[PAYSTACK API] verify successful');
      return res.status(200).json(verified);
    }

    if (action === 'confirm_seller_promotion') {
      const promotionId = String(body.promotion_id || '');
      const promotionReference = String(reference || '');
      const token = getBearerToken(req);
      if (!token || !promotionId || !promotionReference) return res.status(400).json({ error: 'Authenticated promotion, reference, and payment are required' });

      const supabaseAdmin = getSupabaseAdmin();
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

      const { data: promotion, error: promotionError } = await supabaseAdmin.from('seller_promotions')
        .select('id, seller_id, store_id, product_id, plan_id, promotion_type, amount_minor, currency, status, payment_reference, target_categories, target_regions, review_status')
        .eq('id', promotionId).maybeSingle();
      if (promotionError) throw promotionError;
      if (!promotion || promotion.seller_id !== authData.user.id) return res.status(403).json({ error: 'You are not allowed to confirm this promotion.' });
      if (promotion.payment_reference !== promotionReference) return res.status(409).json({ error: 'Payment reference does not match this promotion.' });

      const { data: plan, error: planError } = await supabaseAdmin.from('promotion_plans')
        .select('id, code, price_minor, currency, duration_days, is_active').eq('id', promotion.plan_id).maybeSingle();
      if (planError) throw planError;
      if (!plan || Number(plan.price_minor) !== Number(promotion.amount_minor) || String(plan.currency).toUpperCase() !== String(promotion.currency).toUpperCase()) return res.status(409).json({ error: 'Promotion price changed. Please start again.' });

      const verified = await verifyPaystackTransaction(promotionReference, PAYSTACK_SECRET_KEY);
      const transaction = verified?.data;
      const transactionMetadata = transaction?.metadata || {};
      if (!verified?.status || transaction?.status !== 'success' || String(transaction?.reference) !== promotionReference || Number(transaction?.amount) !== Number(promotion.amount_minor) || String(transaction?.currency || '').toUpperCase() !== String(promotion.currency).toUpperCase() || (transactionMetadata.type && transactionMetadata.type !== 'seller_promotion')) {
        await supabaseAdmin.from('seller_promotions').update({ status: 'PAYMENT_FAILED', updated_at: new Date().toISOString() }).eq('id', promotionId).eq('seller_id', authData.user.id);
        return res.status(400).json({ error: 'Paystack payment could not be verified for this promotion.' });
      }

      const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin.from('seller_promotion_payments').select('promotion_id, seller_id').eq('paystack_reference', promotionReference).maybeSingle();
      if (existingPaymentError) throw existingPaymentError;
      if (existingPayment && (existingPayment.promotion_id !== promotionId || existingPayment.seller_id !== authData.user.id)) return res.status(409).json({ error: 'This Paystack reference is already linked to another promotion.' });
      if (!existingPayment) {
        const { error: paymentError } = await supabaseAdmin.from('seller_promotion_payments').insert({ promotion_id: promotionId, seller_id: authData.user.id, paystack_reference: promotionReference, amount_minor: promotion.amount_minor, currency: promotion.currency, status: 'SUCCESS', paid_at: transaction?.paid_at || new Date().toISOString(), metadata: transactionMetadata });
        if (paymentError && paymentError.code !== '23505') throw paymentError;
      }

      const start = new Date();
      const end = new Date(start.getTime() + Number(plan.duration_days) * 86400000);
      const { data: activated, error: activationError } = await supabaseAdmin.from('seller_promotions').update({ status: 'ACTIVE', review_status: 'PENDING_REVIEW', starts_at: start.toISOString(), ends_at: end.toISOString(), payment_paid_at: transaction?.paid_at || start.toISOString(), updated_at: new Date().toISOString() }).eq('id', promotionId).eq('seller_id', authData.user.id).eq('status', 'PENDING_PAYMENT').select('id, status, review_status, starts_at, ends_at, payment_reference').maybeSingle();
      if (activationError) throw activationError;
      return res.status(200).json({ status: true, message: 'Seller promotion confirmed', data: activated || { id: promotionId, status: 'ACTIVE', starts_at: start.toISOString(), ends_at: end.toISOString(), payment_reference: promotionReference } });
    }

    if (action === 'confirm_pos_subscription') {
      const businessId = String(body.business_id || '');
      const expectedAmountMinor = Number(body.expected_amount_minor);
      const expectedCurrency = String(body.currency || '').toUpperCase();
      const token = getBearerToken(req);

      if (!token || !businessId || !reference || !expectedCurrency || !Number.isInteger(expectedAmountMinor) || expectedAmountMinor <= 0) {
        return res.status(400).json({ error: 'Authenticated business, reference, amount, and currency are required' });
      }

      const supabaseAdmin = getSupabaseAdmin();
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authData?.user) {
        return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });
      }

      const { data: business, error: businessError } = await supabaseAdmin
        .from('businesses')
        .select('id, owner_id, country_code, currency_code, pos_subscription_active, pos_subscription_expires_at')
        .eq('id', businessId)
        .maybeSingle();

      if (businessError) throw businessError;
      if (!business || business.owner_id !== authData.user.id) {
        return res.status(403).json({ error: 'You are not allowed to subscribe this business.' });
      }

      const { data: plan, error: planError } = await supabaseAdmin
        .from('pos_subscription_plans')
        .select('monthly_price, currency_code')
        .eq('country_code', business.country_code || 'GH')
        .maybeSingle();

      if (planError) throw planError;
      if (!plan) {
        return res.status(400).json({ error: 'No POS subscription plan is configured for this country.' });
      }

      const planAmountMinor = Math.round(Number(plan.monthly_price) * 100);
      const planCurrency = String(plan.currency_code || '').toUpperCase();
      if (planAmountMinor !== expectedAmountMinor || planCurrency !== expectedCurrency) {
        return res.status(409).json({ error: 'The subscription price changed. Please reload the POS page and try again.' });
      }

      const verified = await verifyPaystackTransaction(String(reference), PAYSTACK_SECRET_KEY);
      const transaction = verified?.data;
      const transactionCurrency = String(transaction?.currency || expectedCurrency).toUpperCase();
      const transactionMetadata = transaction?.metadata || {};

      if (
        !verified?.status ||
        transaction?.status !== 'success' ||
        String(transaction?.reference) !== String(reference) ||
        Number(transaction?.amount) !== expectedAmountMinor ||
        transactionCurrency !== expectedCurrency ||
        (transactionMetadata.type && transactionMetadata.type !== 'pos_subscription') ||
        (transactionMetadata.business_id && String(transactionMetadata.business_id) !== businessId)
      ) {
        return res.status(400).json({ error: 'Paystack payment could not be verified for this subscription.' });
      }

      const { data: existingPayment, error: existingPaymentError } = await supabaseAdmin
        .from('pos_subscription_payments')
        .select('business_id, user_id, paystack_reference')
        .eq('paystack_reference', String(reference))
        .maybeSingle();

      if (existingPaymentError) throw existingPaymentError;
      if (existingPayment && (existingPayment.business_id !== businessId || existingPayment.user_id !== authData.user.id)) {
        return res.status(409).json({ error: 'This Paystack reference is already linked to another business.' });
      }

      if (!existingPayment) {
        const { error: ledgerError } = await supabaseAdmin
          .from('pos_subscription_payments')
          .insert({
            business_id: businessId,
            user_id: authData.user.id,
            paystack_reference: String(reference),
            amount_minor: expectedAmountMinor,
            currency_code: expectedCurrency,
            status: 'success',
            paid_at: transaction?.paid_at || new Date().toISOString(),
          });

        if (ledgerError && ledgerError.code !== '23505') throw ledgerError;
      }

      // A retry for the same reference must not extend the same paid month twice.
      // If the first request stored the ledger but failed before the business update,
      // this retry safely completes the activation.
      let updatedBusiness = business;
      if (!isActiveSubscription(business)) {
        const startDate = business.pos_subscription_expires_at && new Date(business.pos_subscription_expires_at).getTime() > Date.now()
          ? business.pos_subscription_expires_at
          : new Date().toISOString();
        const nextExpiry = addOneMonth(startDate);

        const { data: activatedBusiness, error: activationError } = await supabaseAdmin
          .from('businesses')
          .update({
            pos_subscription_active: true,
            pos_subscription_expires_at: nextExpiry,
          })
          .eq('id', businessId)
          .eq('owner_id', authData.user.id)
          .select('id, pos_subscription_active, pos_subscription_expires_at')
          .single();

        if (activationError) throw activationError;
        updatedBusiness = { ...business, ...activatedBusiness };
      }

      return res.status(200).json({
        status: true,
        message: 'POS subscription confirmed',
        data: {
          business_id: businessId,
          reference: String(reference),
          pos_subscription_active: updatedBusiness.pos_subscription_active,
          pos_subscription_expires_at: updatedBusiness.pos_subscription_expires_at,
        },
      });
    }

    return res.status(400).json({ error: 'Invalid payment action.' });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error(`[PAYSTACK API] ${action} failed:`, errorData);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message || 'Payment operation failed',
    });
  }
};
