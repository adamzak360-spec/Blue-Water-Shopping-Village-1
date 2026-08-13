module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.status(200).send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /dashboard',
    'Disallow: /customer',
    'Disallow: /checkout',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /reset-password',
    'Disallow: /forgot-password',
    'Disallow: /chat/',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n'));
};
