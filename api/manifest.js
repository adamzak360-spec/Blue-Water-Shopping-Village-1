const { createClient } = require('@supabase/supabase-js')

const DEFAULT_ICON = '/android-chrome-512x512.png'
const MARKETPLACE_ID = '00000000-0000-0000-0000-000000000001'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://iwouhwizzwwykchgflyk.supabase.co'
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null
}

module.exports = async function handler(_req, res) {
  let icon = DEFAULT_ICON

  try {
    const supabase = getSupabase()
    if (supabase) {
      const { data } = await supabase
        .from('businesses')
        .select('favicon_url')
        .eq('id', MARKETPLACE_ID)
        .maybeSingle()
      if (data?.favicon_url) {
        const separator = data.favicon_url.includes('?') ? '&' : '?'
        icon = `${data.favicon_url}${separator}v=${Date.now()}`
      }
    }
  } catch (error) {
    console.error('[MANIFEST] Falling back to default icon:', error?.message || error)
  }

  const manifest = {
    name: 'Reliable Premium Marketplace',
    short_name: 'Reliable',
    description: 'Reliable Premium Marketplace — quality products from trusted stores, delivered to your doorstep.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: '#032D61',
    background_color: '#032D61',
    icons: [
      { src: icon, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: icon, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    categories: ['shopping'],
  }

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
  res.status(200).json(manifest)
}

module.exports = module.exports
module.exports.config = { runtime: 'nodejs20.x' }

