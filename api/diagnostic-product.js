const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwouhwizzwwykchgflyk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const ADMIN_EMAIL = String(process.env.VITE_ADMIN_EMAIL || 'adamzak360@gmail.com').toLowerCase();

function describeValue(value) {
  if (typeof value !== 'string') return { type: typeof value, value };
  const controls = [];
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code < 32 || code === 127) controls.push({ index: i, code, hex: `0x${code.toString(16).padStart(2, '0')}` });
  }
  return { type: 'string', length: value.length, controls };
}

function summarizePayload(payload) {
  return Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, Array.isArray(value) ? { type: 'array', length: value.length } : describeValue(value)]));
}

async function runProbe(admin, label, payload) {
  const startedAt = Date.now();
  const { error } = await admin.from('products').insert(payload);
  const result = {
    label,
    durationMs: Date.now() - startedAt,
    payload: summarizePayload(payload),
    error: error ? { name: error.name, message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
  };
  if (!error) {
    const { error: cleanupError } = await admin.from('products').delete().eq('id', payload.id);
    result.cleanupError = cleanupError ? { message: cleanupError.message, code: cleanupError.code, details: cleanupError.details, hint: cleanupError.hint } : null;
  }
  return result;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Diagnostic service is not configured.' });

  const accessToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!accessToken) return res.status(401).json({ error: 'Authorization required.' });

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  const email = String(userData?.user?.email || '').toLowerCase();
  if (userError || !email || email !== ADMIN_EMAIL) return res.status(403).json({ error: 'Admin authorization required.' });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const baseId = '00000000-0000-0000-0000-000000000000'.replace(/0/g, () => Math.floor(Math.random() * 16).toString(16));
  const base = { id: baseId, name: 'Temporary schema diagnostic', price: 1, category: 'Games', stock_quantity: 1, status: 'active', currency: 'GHS' };
  const probes = [
    await runProbe(admin, 'minimal-core', base),
    await runProbe(admin, 'core-with-description', { ...base, id: baseId.replace(/.$/, '1'), description: 'Temporary diagnostic' }),
    await runProbe(admin, 'core-with-json-array', { ...base, id: baseId.replace(/.$/, '2'), specifications: [] }),
    await runProbe(admin, 'core-with-null-optionals', { ...base, id: baseId.replace(/.$/, '3'), description: null, image_url: null, gallery_urls: [], video_urls: [] }),
  ];

  return res.status(200).json({
    diagnostic: 'temporary-product-insert',
    projectHost: new URL(SUPABASE_URL).host,
    authenticatedEmail: email,
    probes,
    note: 'No credentials are returned. Successful probe rows are deleted immediately.',
  });
};
