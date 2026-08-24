import type { Product } from '../types'
import type { Article, ArticleCard } from '../types/articles'

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

// Catalog page SEO: gives Google a rich description of the whole product listing,
// with an ItemList schema and social tags so /products ranks for shopping queries.
export function applyCatalogSeo(pageTitle: string, pageDescription: string, products: Product[]) {
  const origin = window.location.origin
  document.title = `${pageTitle} | Reliable Premium Marketplace`
  setMeta('meta[name="description"]', { name: 'description' }, cleanDescription(pageDescription))
  setLink('canonical', `${origin}/products`)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, document.title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, cleanDescription(pageDescription))
  setMeta('meta[property="og:url"]', { property: 'og:url' }, `${origin}/products`)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Reliable Premium Marketplace')
  if (products.length > 0) {
    setMeta('meta[property="og:image"]', { property: 'og:image' }, absoluteUrl(products[0].image_url, origin))
    setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, products[0].name)
  }
  const itemList: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageTitle,
    description: cleanDescription(pageDescription),
    url: `${origin}/products`,
    itemListElement: products.slice(0, 100).map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        url: `${origin}/product/${encodeURIComponent(product.id)}`,
        image: absoluteUrl(product.image_url, origin),
        ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
        ...(product.sku || product.product_code ? { sku: product.sku || product.product_code } : {}),
        ...(product.product_code ? { identifier: product.product_code } : product.sku ? { identifier: product.sku } : { identifier: product.id }),
        offers: {
          '@type': 'Offer',
          priceCurrency: product.currency || 'GHS',
          price: Number(product.price).toFixed(2),
          availability: product.status === 'active' && Number(product.stock_quantity) > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        },
      },
    })),
  }
  setJsonLd('reliable-catalog-jsonld', itemList)
}

export function applyArticlesListingSeo(articles: ArticleCard[]) {
  const origin = window.location.origin
  const url = `${origin}/articles`
  const title = 'Articles & Shopping Guides | Reliable Premium Marketplace'
  const description = 'Practical Ghana-focused shopping guides, seller education, product advice, and marketplace insights from Reliable Premium Marketplace.'
  document.title = title
  setMeta('meta[name="description"]', { name: 'description' }, description)
  setLink('canonical', url)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, description)
  setMeta('meta[property="og:url"]', { property: 'og:url' }, url)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Reliable Premium Marketplace')
  const listingImage = articles.find((article) => article.featured_image)?.featured_image || undefined
  setMeta('meta[property="og:image"]', { property: 'og:image' }, absoluteUrl(listingImage, origin))
  setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, 'Reliable Articles and Shopping Guides')
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, absoluteUrl(listingImage, origin))
  setJsonLd('reliable-articles-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.slice(0, 24).map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/articles/${encodeURIComponent(article.slug)}`,
        name: article.title,
      })),
    },
  })
  removeJsonLd('reliable-article-jsonld')
  removeJsonLd('reliable-breadcrumb-jsonld')
}

export function applyArticleSeo(article: Article) {
  const origin = window.location.origin
  const articleUrl = `${origin}/articles/${encodeURIComponent(article.slug)}`
  const title = article.seo_title?.trim() || `${article.title} | Reliable Premium Marketplace`
  const description = cleanDescription(article.seo_description || article.excerpt)
  const image = absoluteUrl(article.featured_image || undefined, origin)
  document.title = title
  setMeta('meta[name="description"]', { name: 'description' }, description)
  setLink('canonical', article.canonical_url?.trim() || articleUrl)
  setMeta('meta[property="og:title"]', { property: 'og:title' }, title)
  setMeta('meta[property="og:description"]', { property: 'og:description' }, description)
  setMeta('meta[property="og:url"]', { property: 'og:url' }, articleUrl)
  setMeta('meta[property="og:type"]', { property: 'og:type' }, 'article')
  setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Reliable Premium Marketplace')
  setMeta('meta[property="og:image"]', { property: 'og:image' }, image)
  setMeta('meta[property="og:image:alt"]', { property: 'og:image:alt' }, article.title)
  setMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image')
  setMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title)
  setMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description)
  setMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, image)
  setJsonLd('reliable-article-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description,
    image: [image],
    url: articleUrl,
    datePublished: article.published_at,
    dateModified: article.updated_at || article.published_at,
    articleSection: article.category,
    author: { '@type': 'Person', name: article.author_name },
    publisher: { '@type': 'Organization', name: 'Reliable Premium Marketplace', logo: { '@type': 'ImageObject', url: `${origin}/logo512.png` } },
  })
  setJsonLd('reliable-breadcrumb-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: origin },
      { '@type': 'ListItem', position: 2, name: 'Articles', item: `${origin}/articles` },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
    ],
  })
  removeJsonLd('reliable-articles-jsonld')
}

export function resetArticleSeo() {
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
  removeJsonLd('reliable-article-jsonld')
  removeJsonLd('reliable-articles-jsonld')
  removeJsonLd('reliable-breadcrumb-jsonld')
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
