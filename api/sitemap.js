const https = require('https');

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (response) => {
      let body = '';
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Supabase returned ${response.statusCode}`));
          return;
        }
        try { resolve(JSON.parse(body)); } catch (error) { reject(error); }
      });
    }).on('error', reject);
  });
}

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).send('Method not allowed');

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return res.status(500).send('Sitemap service is not configured');

  try {
    const endpoint = `${supabaseUrl}/rest/v1/products?status=eq.active&select=id,updated_at&order=updated_at.desc&limit=5000`;
    const products = await fetchJson(endpoint, { apikey: anonKey, Authorization: `Bearer ${anonKey}` });
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const urls = [
      `<url><loc>${escapeXml(origin)}/</loc></url>`,
      `<url><loc>${escapeXml(origin)}/products</loc></url>`,
      ...(Array.isArray(products) ? products.map(product => {
        const lastmod = product.updated_at ? `<lastmod>${escapeXml(new Date(product.updated_at).toISOString())}</lastmod>` : '';
        return `<url><loc>${escapeXml(`${origin}/product/${encodeURIComponent(product.id)}`)}</loc>${lastmod}<changefreq>daily</changefreq></url>`;
      }) : []),
    ];

    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
    return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return res.status(500).send('Unable to generate sitemap');
  }
};
