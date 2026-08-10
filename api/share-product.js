const https = require('https');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const productId = req.query?.id;
  if (!productId) return res.status(400).send('Product id is required');

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return res.status(500).send('Share service is not configured');

  try {
    const endpoint = `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,name,description,price,image_url,category,status`;
    const products = await fetchJson(endpoint, { apikey: anonKey, Authorization: `Bearer ${anonKey}` });
    const product = products?.[0];
    if (!product || product.status !== 'active') return res.status(404).send('Product not found');

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const productUrl = `${origin}/product/${encodeURIComponent(product.id)}`;
    const shareUrl = `${origin}/api/share-product?id=${encodeURIComponent(product.id)}`;
    const name = escapeHtml(product.name);
    const description = escapeHtml((product.description || 'Shop this product on Reliable.').replace(/\s+/g, ' ').trim().slice(0, 220));
    const image = escapeHtml(product.image_url || '');
    const price = new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(product.price || 0));
    const title = `${name} | Reliable`;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${productUrl}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Reliable">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description} Price: ${escapeHtml(price)}.">
<meta property="og:url" content="${shareUrl}">
${image ? `<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="${name}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description} Price: ${escapeHtml(price)}.">
${image ? `<meta name="twitter:image" content="${image}">` : ''}
<style>
body{margin:0;background:#f4f7fb;color:#163b66;font-family:Arial,sans-serif}.wrap{max-width:680px;margin:40px auto;padding:0 18px}.card{overflow:hidden;border-radius:20px;background:#fff;box-shadow:0 16px 45px #163b6620}.image{display:flex;align-items:center;justify-content:center;min-height:340px;background:#f8fafc}.image img{display:block;width:100%;height:340px;object-fit:contain}.body{padding:28px}.brand{color:#059669;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.name{margin:10px 0 8px;font-size:30px}.price{color:#059669;font-size:23px;font-weight:800}.description{color:#667085;font-size:16px;line-height:1.6}.button{display:inline-block;margin-top:16px;padding:13px 18px;border-radius:9px;background:#059669;color:#fff;font-weight:800;text-decoration:none}.hint{color:#667085;font-size:13px}
</style>
</head>
<body>
<main class="wrap"><article class="card"><div class="image">${image ? `<img src="${image}" alt="${name}">` : '<span>Reliable product</span>'}</div><div class="body"><div class="brand">Reliable marketplace</div><h1 class="name">${name}</h1><div class="price">${escapeHtml(price)}</div><p class="description">${description}</p><a class="button" href="${productUrl}">View product on Reliable</a><p class="hint">Shared from Reliable. Shop with confidence.</p></div></article></main>
<script>window.setTimeout(function(){window.location.replace(${JSON.stringify(productUrl)});}, 1200);</script>
</body>
</html>`);
  } catch (error) {
    console.error('[SHARE PRODUCT]', error);
    return res.status(500).send('Unable to prepare product share preview');
  }
};
