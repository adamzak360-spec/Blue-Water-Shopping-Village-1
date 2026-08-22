const DEFAULT_ICON = '/logo-square.png'
const BRAND_BLUE = '#032D61'
module.exports = async function handler(req, res) {
  let icon = DEFAULT_ICON
  const requestedBackground = typeof req?.query?.bg === 'string' ? req.query.bg : ''
  const backgroundColor = /^#[0-9a-fA-F]{6}$/.test(requestedBackground) ? requestedBackground : BRAND_BLUE

  const manifest = {
    name: 'Reliable Premium Marketplace',
    short_name: 'Reliable',
    description: 'Reliable Premium Marketplace — quality products from trusted stores, delivered to your doorstep.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: backgroundColor,
    background_color: backgroundColor,
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

