const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwouhwizzwwykchgflyk.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server configuration is missing.');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function sendEmail({ to, subject, html, text }) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.VITE_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
  const fromName = process.env.BREVO_FROM_NAME || 'Reliable Premium Marketplace';
  if (!brevoApiKey && !resendApiKey) return { sent: false, reason: 'Email provider is not configured.' };

  if (brevoApiKey) {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', {
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }], subject, htmlContent: html, textContent: text,
    }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'api-key': brevoApiKey } });
    return { sent: true, provider: 'brevo', id: response.data?.messageId };
  }

  const response = await axios.post('https://api.resend.com/emails', {
    from: `${fromName} <${fromEmail}>`, to: [to], subject, html, text,
  }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` } });
  return { sent: true, provider: 'resend', id: response.data?.id };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const promotionId = String(req.body?.promotion_id || '');
  const decision = String(req.body?.decision || '').toUpperCase();
  const reviewNotes = String(req.body?.review_notes || '').trim().slice(0, 500);
  if (!promotionId || !['APPROVED', 'REJECTED'].includes(decision)) return res.status(400).json({ error: 'Promotion and review decision are required.' });

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'Administrator authentication is required.' });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user) return res.status(401).json({ error: 'Authentication expired. Please sign in again.' });

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Only administrators can review promotions.' });

    const { data: promotion, error: promotionError } = await supabaseAdmin.from('seller_promotions').select('id, seller_id, store_id, product_id, status, review_status, target_categories, target_regions').eq('id', promotionId).maybeSingle();
    if (promotionError) throw promotionError;
    if (!promotion) return res.status(404).json({ error: 'Promotion not found.' });

    const nextStatus = decision === 'REJECTED' ? 'SUSPENDED' : 'ACTIVE';
    const { error: updateError } = await supabaseAdmin.from('seller_promotions').update({ review_status: decision, status: nextStatus, review_notes: decision === 'REJECTED' ? (reviewNotes || 'Rejected by administrator.') : null, reviewed_at: new Date().toISOString(), reviewed_by: authData.user.id, updated_at: new Date().toISOString() }).eq('id', promotionId);
    if (updateError) throw updateError;

    const [{ data: seller }, { data: store }, { data: product }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(promotion.seller_id),
      supabaseAdmin.from('businesses').select('name').eq('id', promotion.store_id).maybeSingle(),
      promotion.product_id ? supabaseAdmin.from('products').select('name').eq('id', promotion.product_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const sellerEmail = seller?.user?.email;
    if (!sellerEmail) return res.status(200).json({ success: true, email_sent: false, message: 'Promotion updated; seller email was not available.' });

    const subject = decision === 'APPROVED' ? 'Your Reliable product promotion was approved' : 'Update about your Reliable product promotion';
    const title = decision === 'APPROVED' ? 'Promotion approved' : 'Promotion rejected';
    const explanation = decision === 'APPROVED' ? 'Your paid product promotion has been approved and is now eligible to appear in sponsored placements.' : `Your paid product promotion was not approved for public display${reviewNotes ? `: ${reviewNotes}` : '.'}`;
    const categories = promotion.target_categories?.length ? promotion.target_categories.join(', ') : 'All categories';
    const regions = promotion.target_regions?.length ? promotion.target_regions.join(', ') : 'All regions';
    const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(explanation)}</p><p><strong>Product:</strong> ${escapeHtml(product?.name || 'Promoted product')}<br><strong>Store:</strong> ${escapeHtml(store?.name || 'Your store')}<br><strong>Categories:</strong> ${escapeHtml(categories)}<br><strong>Regions:</strong> ${escapeHtml(regions)}</p><p>Sign in to your Reliable seller dashboard to review your promotion.</p></div>`;
    const text = `${title}\n\n${explanation}\n\nProduct: ${product?.name || 'Promoted product'}\nStore: ${store?.name || 'Your store'}\nCategories: ${categories}\nRegions: ${regions}`;
    const email = await sendEmail({ to: sellerEmail, subject, html, text });
    return res.status(200).json({ success: true, email_sent: email.sent, provider: email.provider || null, warning: email.reason || null });
  } catch (error) {
    console.error('[PROMOTION REVIEW EMAIL] error:', error.message || error);
    return res.status(500).json({ error: error.message || 'Could not process promotion review.' });
  }
};
