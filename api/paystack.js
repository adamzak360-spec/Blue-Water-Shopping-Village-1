const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase server configuration is missing');
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

async function verifyPaystackTransaction(reference, secret) {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders(secret) },
  );
  return response.data;
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
        paymentMetadata = { type: 'seller_promotion', promotion_type: promotionType, plan_id: planId, business_id: businessId, product_id: productId };

        const { data: createdPromotion, error: promotionError } = await supabaseAdmin.from('seller_promotions').insert({
          seller_id: authData.user.id, store_id: businessId, product_id: productId, plan_id: planId,
          promotion_type: promotionType, amount_minor: paymentAmount, currency: paymentCurrency,
          payment_reference: reference, status: 'PENDING_PAYMENT',
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
        .select('id, seller_id, store_id, product_id, plan_id, promotion_type, amount_minor, currency, status, payment_reference')
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
      const { data: activated, error: activationError } = await supabaseAdmin.from('seller_promotions').update({ status: 'ACTIVE', starts_at: start.toISOString(), ends_at: end.toISOString(), payment_paid_at: transaction?.paid_at || start.toISOString(), updated_at: new Date().toISOString() }).eq('id', promotionId).eq('seller_id', authData.user.id).eq('status', 'PENDING_PAYMENT').select('id, status, starts_at, ends_at, payment_reference').maybeSingle();
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

    return res.status(400).json({ error: 'Invalid action. Use "initialize", "verify", "confirm_pos_subscription", or "confirm_seller_promotion"' });
  } catch (error) {
    const errorData = error.response?.data || error.message;
    console.error(`[PAYSTACK API] ${action} failed:`, errorData);
    return res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || error.message || 'Payment operation failed',
    });
  }
};
