const crypto = require('crypto');

const MAX_REQUEST_BYTES = 14_000;
const MAX_TEXT_LENGTH = 600;
const MAX_OUTPUT_LENGTH = 4_000;
const MAX_RESEARCH_LENGTH = 8_000;
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

function buildPrompt(input, research) {
  const fields = [
    ['Product name', input.name],
    ['Category', input.category],
    ['Price supplied by seller', input.price],
    ['Brand', input.brand],
    ['Material', input.material],
    ['Sizes', input.sizes],
    ['Colors', input.colors],
    ['Key features supplied by seller', input.keyFeatures],
    ['Condition', input.condition],
    ['Seller notes', input.notes],
  ].filter(([, value]) => value);

  const sellerFacts = fields.map(([label, value]) => `${label}: ${value}`).join('\n');
  const researchNotes = research
    ? `\n\nWEB RESEARCH NOTES (reference context only; do not treat uncertain claims as confirmed seller facts):\n${research}`
    : '\n\nNo live web research was available. Use only cautious, broadly applicable product language and do not invent specifications.';

  return `${sellerFacts}${researchNotes}`;
}

function buildFallbackDraft(input) {
  const facts = [input.name, input.category, input.keyFeatures, input.material, input.condition].filter(Boolean);
  const description = `${input.name} is a ${input.category} product${input.keyFeatures ? ` featuring ${input.keyFeatures}` : ''}${input.material ? `, made with ${input.material}` : ''}. ${input.condition ? `Condition: ${input.condition}. ` : ''}Add the exact specifications, included items, and usage details before publishing so customers can buy with confidence.`;
  return {
    description: text(description, 1_500),
    shortDescription: text(`${input.name} — ${input.category}${input.condition ? `, ${input.condition}` : ''}.`, 150),
    highlights: facts.slice(0, 5).map(item => text(item, 180)).filter(Boolean),
    seoTitle: text(`${input.name} | ${input.category}`, 60),
    keywords: [input.name, input.category].filter(Boolean).map(item => text(item, 60)),
  };
}

function extractChatContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('');
  return '';
}

async function researchProduct(input) {
  if (!process.env.OPENAI_API_KEY || process.env.RELIABLE_AI_WEB_RESEARCH === 'false') return '';

  const researchModel = process.env.RELIABLE_AI_RESEARCH_MODEL || 'gpt-4o-search-preview';
  const query = [input.name, input.brand, input.category].filter(Boolean).join(' ');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: researchModel,
      web_search_options: { search_context_size: 'high' },
      messages: [
        {
          role: 'system',
          content: 'You are a product research assistant. Search the web for reliable, current information about the named product. Prefer the manufacturer or official product page, then reputable retailers or documentation. Return concise research notes with source title and URL. Separate confirmed product facts from uncertain or model-dependent details. Never guess an exact specification.',
        },
        {
          role: 'user',
          content: `Research this marketplace product before a seller publishes it:\nProduct: ${query}\nCategory: ${input.category}\nSeller-provided details: ${input.keyFeatures || 'none supplied'}`,
        },
      ],
      max_tokens: 1_200,
    }),
  });

  if (!response.ok) {
    console.warn('[RELIABLE_AI] Web research unavailable', response.status);
    return '';
  }
  const payload = await response.json();
  return text(extractChatContent(payload), MAX_RESEARCH_LENGTH);
}

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rawLength = Number(req.headers['content-length'] || 0);
  if (rawLength > MAX_REQUEST_BYTES) return res.status(413).json({ error: 'Request is too large.' });

  try {
    const user = await getAuthenticatedUser(req);
    if (!user?.id) return res.status(401).json({ error: 'You must be signed in as a seller or admin to use Reliable AI.' });
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

    let research = '';
    try {
      research = await researchProduct(input);
    } catch (error) {
      console.warn('[RELIABLE_AI] Research request failed', error?.message || error);
    }

    const provider = process.env.GROQ_API_KEY ? 'groq' : process.env.OPENAI_API_KEY ? 'openai' : process.env.BUILT_IN_FORGE_API_KEY ? 'legacy' : 'fallback';
    const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY;
    const apiBaseUrl = (provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : process.env.OPENAI_BASE_URL || process.env.BUILT_IN_FORGE_API_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
    if (!apiKey) {
      return res.status(200).json({ success: true, draft: buildFallbackDraft(input), draftOnly: true, fallback: true, researchUsed: false, provider: 'offline-template' });
    }

    const completion = await fetch(`${apiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.RELIABLE_AI_MODEL || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
        messages: [
          {
            role: 'system',
            content: 'You write persuasive but truthful marketplace product drafts for sellers and admins. Use seller-provided facts first. You may use a research note only when it clearly matches the named product, and you must omit uncertain or model-dependent claims. Never invent prices, stock, brands, materials, certifications, medical benefits, warranties, guarantees, discounts, delivery promises, or specifications. Write customer-focused copy that explains what the item is, its practical value, and why it may suit the buyer, without hype or unsupported promises. Return JSON only with description, shortDescription, highlights, seoTitle, and keywords. Keep description 100-180 words, shortDescription under 150 characters, highlights as 3-5 short factual or clearly qualified benefits, seoTitle under 60 characters, and keywords as 5-10 plain strings. This is a draft for seller review, not a published listing.',
          }, 
          { role: 'user', content: buildPrompt(input, research) },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1_100,
      }),
    });

    if (!completion.ok) {
      const providerText = await completion.text();
      console.error('[RELIABLE_AI] Provider error', completion.status, providerText.slice(0, 500));
      return res.status(200).json({ success: true, draft: buildFallbackDraft(input), draftOnly: true, fallback: true, researchUsed: Boolean(research), provider: 'offline-template' });
    }

    const payload = await completion.json();
    const content = extractChatContent(payload);
    if (!content || content.length > MAX_OUTPUT_LENGTH) {
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

    return res.status(200).json({ success: true, draft: safeDraft, draftOnly: true, fallback: false, researchUsed: Boolean(research), provider, requestId: crypto.randomUUID() });
  } catch (error) {
    console.error('[RELIABLE_AI] Request failed', error?.message || error);
    return res.status(500).json({ error: 'Reliable AI is temporarily unavailable.' });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '16kb' } } };
