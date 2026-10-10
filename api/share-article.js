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
  if (!value) return `${origin}/logo512.png`;
  try { return new URL(value, origin).toString(); } catch { return `${origin}/logo512.png`; }
}

function imageType(value) {
  const extension = value.split('?')[0].split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  const slug = String(req.query?.slug || '').trim();
  if (!slug) return res.status(400).send('Article slug is required');

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const anonKey = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!supabaseUrl || !anonKey) return res.status(500).send('Share service is not configured');

  try {
    const now = new Date().toISOString();
    const endpoint = `${supabaseUrl}/rest/v1/articles?slug=eq.${encodeURIComponent(slug)}&status=eq.published&published_at=lte.${encodeURIComponent(now)}&select=id,title,slug,excerpt,featured_image,category,author_name,published_at,updated_at,reading_time_minutes&limit=1`;
    const articles = await fetchJson(endpoint, { apikey: anonKey, Authorization: `Bearer ${anonKey}` });
    const article = articles?.[0];
    if (!article) return res.status(404).send('Article not found');

    const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
    const articleUrl = `${origin}/articles/${encodeURIComponent(article.slug)}`;
    const image = absoluteUrl(article.featured_image, origin);
    const title = escapeHtml(article.title);
    const category = escapeHtml(article.category || 'Reliable Guide');
    const author = escapeHtml(article.author_name || 'Reliable Premium Marketplace');
    const rawExcerpt = (article.excerpt || 'Read this practical guide from Reliable Premium Marketplace.').replace(/\s+/g, ' ').trim();
    const excerpt = escapeHtml(rawExcerpt.length > 220 ? `${rawExcerpt.slice(0, 217).trim()}…` : rawExcerpt);
    const shareDescription = `${excerpt} Read more on Reliable Premium Marketplace.`;
    const pageTitle = `${title} | Reliable Premium Marketplace`;

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${pageTitle}</title>
<meta name="description" content="${shareDescription}">
<link rel="canonical" href="${articleUrl}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Reliable Premium Marketplace">
<meta property="og:title" content="${pageTitle}">
<meta property="og:description" content="${shareDescription}">
<meta property="og:url" content="${articleUrl}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="${imageType(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title}">
<meta property="article:section" content="${category}">
<meta property="article:author" content="${author}">
${article.published_at ? `<meta property="article:published_time" content="${escapeHtml(article.published_at)}">` : ''}
${article.updated_at ? `<meta property="article:modified_time" content="${escapeHtml(article.updated_at)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${pageTitle}">
<meta name="twitter:description" content="${shareDescription}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<meta name="twitter:image:alt" content="${title}">
<style>
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:linear-gradient(145deg,#f3f8f6,#eef3f8);color:#163b66;font-family:Inter,Arial,sans-serif}.wrap{max-width:720px;margin:40px auto;padding:0 18px}.card{overflow:hidden;border:1px solid #e4ebe8;border-radius:22px;background:#fff;box-shadow:0 18px 50px #163b6622}.image{display:flex;align-items:center;justify-content:center;min-height:360px;background:#f7faf9}.image img{display:block;width:100%;height:360px;object-fit:cover}.body{padding:26px 28px 24px}.brand{color:#059669;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.category{margin-top:8px;color:#667085;font-size:13px}.name{margin:8px 0 10px;font-size:30px;line-height:1.15}.description{color:#667085;font-size:16px;line-height:1.6}.button{display:inline-block;margin-top:12px;padding:13px 18px;border-radius:9px;background:#059669;color:#fff;font-weight:800;text-decoration:none}.hint{color:#667085;font-size:13px}
</style>
</head>
<body>
<main class="wrap"><article class="card"><div class="image"><img src="${escapeHtml(image)}" alt="${title}"></div><div class="body"><div class="brand">Reliable Premium Marketplace</div><div class="category">${category} · ${author}</div><h1 class="name">${title}</h1><p class="description">${excerpt}</p><a class="button" href="${articleUrl}">Read article on Reliable</a><p class="hint">Shared from Reliable. Discover practical guides and trusted marketplace insights.</p></div></article></main>
<script>window.setTimeout(function(){window.location.replace(${JSON.stringify(articleUrl)});},1200);</script>
</body>
</html>`);
  } catch (error) {
    console.error('[SHARE ARTICLE]', error);
    return res.status(500).send('Unable to prepare article share preview');
  }
};
