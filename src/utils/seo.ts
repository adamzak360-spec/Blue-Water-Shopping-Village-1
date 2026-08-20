import type { Product } from '../types'

const DEFAULT_DESCRIPTION = 'Reliable Premium Marketplace — quality products from trusted stores, delivered to your doorstep.'
const DEFAULT_IMAGE = '/logo512.png'

function setMeta(selector: string, attributes: Record<string, string>, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value))
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', rel)
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
}

function setJsonLd(id: string, value: unknown) {
  let element = document.head.querySelector<HTMLScriptElement>(`script#${id}`)
  if (!element) {
    element = document.createElement('script')
    element.id = id
    element.type = 'application/ld+json'
    document.head.appendChild(element)
  }
  element.textContent = JSON.stringify(value)
}

function removeJsonLd(id: string) {
  document.head.querySelector<HTMLScriptElement>(`script#${id}`)?.remove()
}

function cleanDescription(description: string | undefined) {
  const cleaned = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim()
  return cleaned.length > 155 ? `${cleaned.slice(0, 152).trim()}...` : cleaned
}

function absoluteUrl(url: string | undefined, origin: string) {
  if (!url) return `${origin}${DEFAULT_IMAGE}`
  try {
    return new URL(url, origin).toString()
  } catch {
    return `${origin}${DEFAULT_IMAGE}`
  }
}

export function applyProductSeo(product: Product, averageRating: number, totalReviews: number) {
  const origin = window.location.origin
  const productUrl = `${origin}/product/${encodeURIComponent(product.id)}`
  const title = `${product.name} | Reliable Premium Marketplace`
  const description = cleanDescription(product.description)
  const imageUrls = [product.image_url, ...(product.gallery_urls || [])]
    .filter(Boolean)
    .map(image => absoluteUrl(image, origin))
  const currency = product.currency || 'GHS'
  const isAvailable = product.status === 'active' && Number(product.stock_quantity) > 0

  document.title = title
  setMeta('meta[name="description"]', { name: 'description' }, description)
  setLink('canonical', productUrl)

  setMeta('meta[property="og:title"]', { property: 'og:title' }, title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, description)
  setMeta('meta[property="og:url"]', { property: 'og:url' }, productUrl)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, 'product')
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Reliable Premium Marketplace')
  setMeta('meta[property="og:image"]', { property: 'og:image' }, imageUrls[0] || `${origin}${DEFAULT_IMAGE}`)
  setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, product.name)
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, imageUrls[0] || `${origin}${DEFAULT_IMAGE}`)

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || description,
    image: imageUrls,
    url: productUrl,
    category: product.category,
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.sku || product.product_code ? { sku: product.sku || product.product_code } : {}),
    ...(product.product_code ? { identifier: product.product_code } : product.sku ? { identifier: product.sku } : { identifier: product.id }),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: currency,
      price: Number(product.price).toFixed(2),
      availability: `https://schema.org/${isAvailable ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition',
      seller: {
        '@type': 'Organization',
        name: 'Reliable Premium Marketplace',
      },
      hasMerchantReturnPolicy: {
        '@type': 'MerchantReturnPolicy',
        applicableCountry: 'GH',
        returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
        merchantReturnDays: 7,
        returnMethod: 'https://schema.org/ReturnByMail',
        returnFees: 'https://schema.org/FreeReturn',
      },
      shippingDetails: {
        '@type': 'OfferShippingDetails',
        shippingRate: {
          '@type': 'MonetaryAmount',
          value: '0.00',
          currency: currency,
        },
        shippingDestination: {
          '@type': 'DefinedRegion',
          addressCountry: 'GH',
        },
        deliveryTime: {
          '@type': 'ShippingDeliveryTime',
          handlingTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 2,
            unitCode: 'DAY',
          },
          transitTime: {
            '@type': 'QuantitativeValue',
            minValue: 1,
            maxValue: 5,
            unitCode: 'DAY',
          },
        },
      },
    },
  }

  if (totalReviews > 0 && averageRating > 0) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(averageRating.toFixed(1)),
      reviewCount: totalReviews,
      bestRating: 5,
      worstRating: 1,
    }
  }

  setJsonLd('reliable-product-jsonld', productSchema)
  setJsonLd('reliable-breadcrumb-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${origin}/products` },
      { '@type': 'ListItem', position: 3, name: product.category, item: `${origin}/products?category=${encodeURIComponent(product.category)}` },
      { '@type': 'ListItem', position: 4, name: product.name, item: productUrl },
    ],
  })
}

export function resetProductSeo() {
  document.title = 'Reliable Premium Marketplace'
  setMeta('meta[name="description"]', { name: 'description' }, DEFAULT_DESCRIPTION)
  setLink('canonical', window.location.origin)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, 'Reliable Premium Marketplace')
  setMeta('meta[property="og:description"]', { property: 'og:description' }, DEFAULT_DESCRIPTION)
  setMeta('meta[property="og:url"]', { property: 'og:url' }, window.location.origin)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
  setMeta('meta[property="og:image"]', { property: 'og:image' }, `${window.location.origin}${DEFAULT_IMAGE}`)
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, 'Reliable Premium Marketplace')
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, DEFAULT_DESCRIPTION)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, `${window.location.origin}${DEFAULT_IMAGE}`)
  removeJsonLd('reliable-product-jsonld')
  removeJsonLd('reliable-breadcrumb-jsonld')
}
