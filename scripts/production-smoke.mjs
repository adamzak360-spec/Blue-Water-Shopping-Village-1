import { writeFile } from 'node:fs/promises'

const origin = process.env.PRODUCTION_ORIGIN || 'https://reliable-now.vercel.app'
const productId = process.env.TEST_PRODUCT_ID || 'c3f79325-f143-4104-90ef-3f79d384f69a'

const checks = [
  { name: 'homepage', path: '/', markers: ['RELIABLE', 'id="root"'] },
  { name: 'catalog shell', path: '/products', markers: ['RELIABLE', 'id="root"'] },
  { name: 'stores shell', path: '/stores', markers: ['RELIABLE', 'id="root"'] },
  { name: 'product detail shell', path: `/product/${productId}`, markers: ['RELIABLE', 'id="root"'] },
  { name: 'checkout shell', path: '/checkout', markers: ['RELIABLE', 'id="root"'] },
  { name: 'login shell', path: '/login', markers: ['RELIABLE', 'id="root"'] },
  { name: 'seller registration shell', path: '/seller/register', markers: ['RELIABLE', 'id="root"'] },
  { name: 'about shell', path: '/about', markers: ['RELIABLE', 'id="root"'] },
  { name: 'contact shell', path: '/contact', markers: ['RELIABLE', 'id="root"'] },
  { name: 'faq shell', path: '/faq', markers: ['RELIABLE', 'id="root"'] },
  { name: 'delivery shell', path: '/delivery', markers: ['RELIABLE', 'id="root"'] },
  { name: 'terms shell', path: '/terms', markers: ['RELIABLE', 'id="root"'] },
  { name: 'returns shell', path: '/returns', markers: ['RELIABLE', 'id="root"'] },
  { name: 'privacy shell', path: '/privacy-policy', markers: ['RELIABLE', 'id="root"'] },
  { name: 'protected dashboard fallback', path: '/dashboard', markers: ['RELIABLE', 'id="root"'] },
  { name: 'sitemap', path: '/api/sitemap', markers: ['urlset', 'sitemap'] },
  { name: 'share preview', path: `/api/share-product?id=${encodeURIComponent(productId)}`, markers: ['og:site_name', 'Reliable', 'og:image'] },
]

const results = []
for (const check of checks) {
  const url = new URL(check.path, origin)
  const started = performance.now()
  try {
    const response = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Reliable-production-smoke/1.0' } })
    const body = await response.text()
    const durationMs = Math.round((performance.now() - started) * 10) / 10
    const markerFailures = check.markers.filter(marker => !body.toLowerCase().includes(marker.toLowerCase()))
    results.push({
      ...check,
      url: url.toString(),
      status: response.status,
      contentType: response.headers.get('content-type'),
      cacheControl: response.headers.get('cache-control'),
      durationMs,
      bytes: Buffer.byteLength(body),
      markerFailures,
      pass: response.status >= 200 && response.status < 400 && markerFailures.length === 0,
    })
  } catch (error) {
    results.push({ ...check, url: url.toString(), pass: false, error: String(error) })
  }
}

const homepage = results.find(result => result.name === 'homepage')
const report = {
  capturedAt: new Date().toISOString(),
  origin,
  productId,
  pass: results.every(result => result.pass),
  passed: results.filter(result => result.pass).length,
  failed: results.filter(result => !result.pass).length,
  homepageDurationMs: homepage?.durationMs ?? null,
  results,
}

await writeFile('/tmp/reliable-production-smoke.json', JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
