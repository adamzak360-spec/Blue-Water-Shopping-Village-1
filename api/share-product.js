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

function absoluteUrl(value, origin) {
  if (!value) return '';
  try { return new URL(value, origin).toString(); } catch { return ''; }
}

function imageType(value) {
  const extension = value.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const productId = req.query?.id;
  if (!productId) return res.status(400).send('Product id is required');

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return res.status(500).send('Share service is not configured');

  try {
    const endpoint = `${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(productId)}&select=id,name,description,price,currency,image_url,category,status`;
    const products = await fetchJson(endpoint, { apikey: anonKey, Authorization: `Bearer ${anonKey}` });
    const product = products?.[0];
    if (!product || product.status !== 'active') return res.status(404).send('Product not found');

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const productUrl = `${origin}/product/${encodeURIComponent(product.id)}`;
    const image = absoluteUrl(product.image_url, origin);
    const name = escapeHtml(product.name);
    const rawDescription = (product.description || 'Shop this product on Reliable.').replace(/\s+/g, ' ').trim();
    const description = escapeHtml(rawDescription.length > 180 ? `${rawDescription.slice(0, 177).trim()}…` : rawDescription);
    const category = escapeHtml(product.category || 'Marketplace product');
    const currency = product.currency || 'GHS';
    const price = new Intl.NumberFormat('en-GH', { style: 'currency', currency }).format(Number(product.price || 0));
    const safePrice = escapeHtml(price);
    const title = `${name} | Reliable Premium Marketplace`;
    const shareDescription = `${description} Price: ${safePrice}. Shop securely on Reliable.`;

    // Social crawlers read these tags without running the React application.
    // The human visitor is redirected to the canonical product page below.
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${shareDescription}">
<link rel="canonical" href="${productUrl}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="Reliable Premium Marketplace">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${shareDescription}">
<meta property="og:url" content="${productUrl}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="${imageType(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="1200">
<meta property="og:image:alt" content="${name}">` : ''}
<meta property="product:category" content="${category}">
<meta property="product:price:amount" content="${escapeHtml(Number(product.price || 0).toFixed(2))}">
<meta property="product:price:currency" content="${escapeHtml(currency)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${shareDescription}">
${image ? `<meta name="twitter:image" content="${escapeHtml(image)}">
<meta name="twitter:image:alt" content="${name}">` : ''}
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#f3f8f6,#eef3f8);color:#163b66;font-family:Inter,Arial,sans-serif}.wrap{max-width:680px;margin:40px auto;padding:0 18px}.card{overflow:hidden;border:1px solid #e4ebe8;border-radius:22px;background:#fff;box-shadow:0 18px 50px #163b6622}.image{display:flex;align-items:center;justify-content:center;min-height:350px;background:#f7faf9}.image img{display:block;width:100%;height:350px;object-fit:contain}.body{padding:26px 28px 24px}.brand{color:#059669;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.category{margin-top:8px;color:#667085;font-size:13px}.name{margin:8px 0 7px;font-size:30px;line-height:1.15}.price{color:#059669;font-size:22px;font-weight:800}.description{color:#667085;font-size:16px;line-height:1.6}.button{display:inline-block;margin-top:12px;padding:13px 18px;border-radius:9px;background:#059669;color:#fff;font-weight:800;text-decoration:none}.hint{color:#667085;font-size:13px}
</style>
</head>
<body>
<main class="wrap"><article class="card"><div class="image">${image ? `<img src="${escapeHtml(image)}" alt="${name}">` : '<span>Reliable product</span>'}</div><div class="body"><div class="brand">Reliable Premium Marketplace</div><div class="category">${category}</div><h1 class="name">${name}</h1><div class="price">${safePrice}</div><p class="description">${description}</p><a class="button" href="${productUrl}">View product on Reliable</a><p class="hint">Shared from Reliable. Shop with confidence.</p></div></article></main>
<script>window.setTimeout(function(){window.location.replace(${JSON.stringify(productUrl)});},1200);</script>
</body>
</html>`);
  } catch (error) {
    console.error('[SHARE PRODUCT]', error);
    return res.status(500).send('Unable to prepare product share preview');
  }
};
