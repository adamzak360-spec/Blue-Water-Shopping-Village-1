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
    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const path = (req.url || '/').split('?')[0];

    const queryMode = (req.query && req.query.mode) || new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`).searchParams.get('mode');
    const mode = queryMode || 'urls';

    // Sitemap index: /sitemap.xml without a mode param lists the two child sitemaps
    if (path === '/sitemap.xml' && !queryMode) {
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<sitemap><loc>${escapeXml(origin)}/sitemap.xml?mode=urls</loc></sitemap>
<sitemap><loc>${escapeXml(origin)}/sitemap.xml?mode=images</loc></sitemap>
</sitemapindex>`;
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.status(200).send(indexXml);
    }
    const endpoint = `${supabaseUrl}/rest/v1/products?status=eq.active&select=id,name,description,category,image_url,gallery_urls,brand,updated_at&order=updated_at.desc&limit=5000`;
    const products = await fetchJson(endpoint, { apikey: anonKey, Authorization: `Bearer ${anonKey}` });
    const urls = [
      `<url><loc>${escapeXml(origin)}/</loc></url>`,
      `<url><loc>${escapeXml(origin)}/products</loc></url>`,
      ...(Array.isArray(products) ? products.map(product => {
        const lastmod = product.updated_at ? `<lastmod>${escapeXml(new Date(product.updated_at).toISOString())}</lastmod>` : '';
        return `<url><loc>${escapeXml(`${origin}/product/${encodeURIComponent(product.id)}`)}</loc>${lastmod}<changefreq>daily</changefreq></url>`;
      }) : []),
    ];

    let xml;
    if (mode === 'images') {
      // Image sitemap: every product's images get discoverable by Google Images
      const imageEntries = [];
      for (const product of Array.isArray(products) ? products : []) {
        const imageUrls = [
          ...(product.image_url ? [product.image_url] : []),
          ...((product.gallery_urls && Array.isArray(product.gallery_urls)) ? product.gallery_urls : []),
        ].filter(Boolean).slice(0, 6);
        if (imageUrls.length === 0) continue;
        const loc = `${origin}/product/${encodeURIComponent(product.id)}`;
        const imgs = imageUrls.map((img, idx) => {
          const abs = absoluteXmlUrl(img);
          const caption = escapeXml((product.name + (idx > 0 ? ` image ${idx + 1}` : '')));
          return `<image:image><image:loc>${escapeXml(abs)}</image:loc><image:title>${caption}</image:title>${product.description ? `<image:caption>${escapeXml((product.description || '').slice(0, 1000))}</image:caption>` : ''}</image:image>`;
        }).join('');
        imageEntries.push(`<url><loc>${escapeXml(loc)}</loc>${imgs}</url>`);
      }
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${imageEntries.join('')}</urlset>`;
    } else {
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
    }
    res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    return req.method === 'HEAD' ? res.status(200).end() : res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap generation failed:', error);
    return res.status(500).send('Unable to generate sitemap');
  }
};

function absoluteXmlUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  if (url.startsWith('/storage/v1/')) return `${supabaseUrl}${url}`;
  return url;
};
