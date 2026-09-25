const rateBuckets = new Map()
const MAX_ITEMS = 20
const MAX_TEXT = 800
const WINDOW_MS = 60_000
const LIMIT = 30

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}
function clean(value, max = MAX_TEXT) { return typeof value === 'string' ? value.trim().slice(0, max) : '' }
function allowed(ip) {
  const now = Date.now(); const current = rateBuckets.get(ip) || { start: now, count: 0 }
  if (now - current.start > WINDOW_MS) { current.start = now; current.count = 0 }
  current.count += 1; rateBuckets.set(ip, current); return current.count <= LIMIT
}
function extract(payload) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(part => part?.text || '').join('')
  return ''
}

module.exports = async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  if (!allowed(ip)) return res.status(429).json({ error: 'Translation rate limit reached.' })
  const language = clean(req.body?.language, 12)
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, MAX_ITEMS).map(item => ({
    id: clean(item?.id, 100), name: clean(item?.name), description: clean(item?.description), category: clean(item?.category, 120),
  })).filter(item => item.id && (item.name || item.description || item.category)) : []
  if (!language || language === 'en' || !items.length) return res.status(200).json({ translations: {} })
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.BUILT_IN_FORGE_API_KEY
  if (!apiKey) return res.status(200).json({ translations: {} })
  const provider = process.env.GROQ_API_KEY ? 'groq' : 'openai'
  const base = (provider === 'groq' ? 'https://api.groq.com/openai/v1' : process.env.OPENAI_BASE_URL || process.env.BUILT_IN_FORGE_API_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.RELIABLE_TRANSLATION_MODEL || (provider === 'groq' ? 'openai/gpt-oss-20b' : 'gpt-4o-mini')
  const localeName = ({ zh:'Simplified Chinese', es:'Spanish', fr:'French', pt:'Brazilian Portuguese', ar:'Arabic', hi:'Hindi', bn:'Bengali', ru:'Russian', ja:'Japanese', ko:'Korean', de:'German', it:'Italian', tr:'Turkish', vi:'Vietnamese', id:'Indonesian', nl:'Dutch', pl:'Polish', sw:'Swahili', ha:'Hausa', mg:'Malagasy' })[language] || language
  try {
    const response = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({
      model, messages: [
        { role: 'system', content: `Translate marketplace product content into ${localeName}. Return JSON only as an array with one object per input, preserving each id. Translate name, description, and category. Preserve product facts, numbers, measurements, currency codes, brand names, URLs, and SKU-like codes. Do not invent or omit information.` },
        { role: 'user', content: JSON.stringify(items) },
      ], response_format: { type: 'json_object' }, max_tokens: 5000,
    }) })
    if (!response.ok) return res.status(200).json({ translations: {} })
    const raw = extract(await response.json())
    const parsed = JSON.parse(raw)
    const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.translations) ? parsed.translations : [])
    const translations = Object.fromEntries(rows.map(row => [clean(row?.id, 100), { name: clean(row?.name), description: clean(row?.description), category: clean(row?.category, 120) }]).filter(([id]) => id))
    return res.status(200).json({ translations })
  } catch (error) {
    console.error('[RELIABLE_TRANSLATION]', error?.message || error)
    return res.status(200).json({ translations: {} })
  }
}
module.exports.config = { api: { bodyParser: { sizeLimit: '32kb' } } }
