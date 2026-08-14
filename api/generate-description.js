const crypto = require('crypto');

const MAX_REQUEST_BYTES = 14_000;
const MAX_TEXT_LENGTH = 600;
const MAX_OUTPUT_LENGTH = 4_000;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const rateBuckets = new Map();

function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function text(value, max = MAX_TEXT_LENGTH) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function getBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function rateLimit(identity) {
  const now = Date.now();
  const bucket = rateBuckets.get(identity) || { startedAt: now, count: 0 };
  if (now - bucket.startedAt >= RATE_WINDOW_MS) {
    bucket.startedAt = now;
    bucket.count = 0;
  }
  bucket.count += 1;
  rateBuckets.set(identity, bucket);
  return bucket.count <= RATE_LIMIT;
}

async function getAuthenticatedUser(req) {
  const token = getBearer(req);
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return response.json();
}

function buildPrompt(input) {
  const fields = [
    ['Product name', input.name],
    ['Category', input.category],
    ['Price supplied by seller', input.price],
    ['Brand', input.brand],
    ['Material', input.material],
    ['Sizes', input.sizes],
    ['Colors', input.colors],
    ['Key features', input.keyFeatures],
    ['Condition', input.condition],
    ['Seller notes', input.notes],
  ].filter(([, value]) => value);

  return fields.map(([label, value]) => `${label}: ${value}`).join('\n');
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawLength = Number(req.headers['content-length'] || 0);
  if (rawLength > MAX_REQUEST_BYTES) return res.status(413).json({ error: 'Request is too large.' });

  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) return res.status(401).json({ error: 'You must be signed in as a seller to use Reliable AI.' });
    if (!rateLimit(user.id)) return res.status(429).json({ error: 'Too many generation requests. Please wait a minute and try again.' });

    const body = req.body || {};
    const input = {
      name: text(body.name),
      category: text(body.category),
      price: text(body.price, 80),
      brand: text(body.brand),
      material: text(body.material),
      sizes: text(body.sizes),
      colors: text(body.colors),
      keyFeatures: text(body.keyFeatures),
      condition: text(body.condition),
      notes: text(body.notes),
    };

    if (!input.name || !input.category) return res.status(400).json({ error: 'Product name and category are required.' });

    // Keep the provider credential server-side. Vercel injects OPENAI_API_KEY
    // into this function; it must never be exposed through VITE_* variables.
    const apiKey = process.env.OPENAI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;
    const apiBaseUrl = (process.env.OPENAI_BASE_URL || process.env.BUILT_IN_FORGE_API_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    if (!apiKey) {
      return res.status(503).json({ error: 'Reliable AI is not configured on this deployment yet.' });
    }

    const completion = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.RELIABLE_AI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You write cautious marketplace product drafts. Use only seller-provided facts. Never invent prices, stock, brands, materials, certifications, medical benefits, warranties, guarantees, discounts, delivery promises, or specifications. If a fact is missing, omit it. Return JSON only with description, shortDescription, highlights, seoTitle, and keywords. Keep description 80-140 words, shortDescription under 150 characters, highlights as 3-5 short factual bullets, seoTitle under 60 characters, and keywords as 5-10 plain strings. This is a draft for seller review, not a published listing.',
          },
          { role: 'user', content: buildPrompt(input) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'reliable_product_draft',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                shortDescription: { type: 'string' },
                highlights: { type: 'array', items: { type: 'string' } },
                seoTitle: { type: 'string' },
                keywords: { type: 'array', items: { type: 'string' } },
              },
              required: ['description', 'shortDescription', 'highlights', 'seoTitle', 'keywords'],
              additionalProperties: false,
            },
          },
        },
        max_completion_tokens: 900,
      }),
    });

    if (!completion.ok) {
      const providerText = await completion.text();
      console.error('[RELIABLE_AI] Provider error', completion.status, providerText.slice(0, 500));
      return res.status(502).json({ error: 'Reliable AI could not generate a draft right now.' });
    }

    const payload = await completion.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string' || content.length > MAX_OUTPUT_LENGTH) {
      return res.status(502).json({ error: 'Reliable AI returned an invalid draft.' });
    }

    let draft;
    try { draft = JSON.parse(content); } catch (_) { return res.status(502).json({ error: 'Reliable AI returned an invalid draft.' }); }
    const safeDraft = {
      description: text(draft.description, 1_500),
      shortDescription: text(draft.shortDescription, 150),
      highlights: Array.isArray(draft.highlights) ? draft.highlights.slice(0, 5).map(item => text(item, 180)).filter(Boolean) : [],
      seoTitle: text(draft.seoTitle, 60),
      keywords: Array.isArray(draft.keywords) ? draft.keywords.slice(0, 10).map(item => text(item, 60)).filter(Boolean) : [],
    };

    return res.status(200).json({ success: true, draft: safeDraft, draftOnly: true, requestId: crypto.randomUUID() });
  } catch (error) {
    console.error('[RELIABLE_AI] Request failed', error?.message || error);
    return res.status(500).json({ error: 'Reliable AI is temporarily unavailable.' });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '16kb' } } };
