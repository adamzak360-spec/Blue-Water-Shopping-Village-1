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

function fetchCount(url, headers = {}) {
  return new Promise((resolve) => {
    const request = https.request(url, { method: 'HEAD', headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } }, (response) => {
      const range = response.headers['content-range'] || '';
      const total = Number(String(range).split('/')[1]);
      resolve(Number.isFinite(total) ? total : 0);
    });
    request.on('error', () => resolve(0));
    request.end();
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

    const baseHeaders = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    const countEndpoint = `${supabaseUrl}/rest/v1/products?status=eq.active&select=id`;

    // Partition product URLs and image URLs so crawlers never receive thousands
    // of rows in one response or one large Supabase egress event.
    if (path === '/sitemap.xml' && !queryMode) {
      const total = await fetchCount(countEndpoint, baseHeaders);
      const pageCount = Math.max(1, Math.ceil(total / 1000));
      const sitemapLinks = [];
      for (const modeName of ['urls', 'images']) {
        for (let page = 0; page < pageCount; page += 1) {
          sitemapLinks.push(`<sitemap><loc>${escapeXml(`${origin}/sitemap.xml?mode=${modeName}&page=${page}`)}</loc></sitemap>`);
        }
      }
      const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapLinks.join('')}</sitemapindex>`;
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=86400');
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      return res.status(200).send(indexXml);
    }

    const page = Math.max(0, Number((req.query && req.query.page) || 0) || 0);
    const offset = page * 1000;
    const select = mode === 'images'
      ? 'id,name,description,image_url,gallery_urls,updated_at'
      : 'id,updated_at';
    const endpoint = `${supabaseUrl}/rest/v1/products?status=eq.active&select=${select}&order=updated_at.desc&limit=1000&offset=${offset}`;
    const products = await fetchJson(endpoint, baseHeaders);
    const urls = mode === 'urls' ? [
      ...(Array.isArray(products) ? products.map(product => {
        const lastmod = product.updated_at ? `<lastmod>${escapeXml(new Date(product.updated_at).toISOString())}</lastmod>` : '';
        return `<url><loc>${escapeXml(`${origin}/product/${encodeURIComponent(product.id)}`)}</loc>${lastmod}<changefreq>daily</changefreq></url>`;
      }) : []),
    ] : [];

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
      xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(page === 0 ? [`<url><loc>${escapeXml(origin)}/</loc></url>`, `<url><loc>${escapeXml(origin)}/products</loc></url>`, ...urls] : urls).join('')}</urlset>`;
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
