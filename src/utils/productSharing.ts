import type { Product } from '../types'

export function getProductPageUrl(productId: string) {
  return new URL(`/product/${encodeURIComponent(productId)}`, window.location.origin).toString()
}

/**
 * This endpoint returns crawler-friendly Open Graph metadata before redirecting
 * people to the real product page. Social platforms use it to build the image
 * card shown beside the caption.
 */
export function getProductShareUrl(productId: string) {
  return new URL(`/api/share-product?id=${encodeURIComponent(productId)}`, window.location.origin).toString()
}

function cleanShareDescription(description: string | undefined) {
  const cleaned = (description || '').replace(/\s+/g, ' ').trim()
  return cleaned.length > 180 ? `${cleaned.slice(0, 177).trim()}…` : cleaned
}

export function getProductShareText(product: Product) {
  const description = cleanShareDescription(product.description)
  const price = product.price.toLocaleString('en-GH', { style: 'currency', currency: product.currency || 'GHS' })
  return [
    `🛍️ ${product.name}`,
    `${price} on Reliable Premium Marketplace`,
    description,
  ].filter(Boolean).join('\n')
}

export async function shareProduct(product: Product) {
  const shareUrl = getProductShareUrl(product.id)
  const text = getProductShareText(product)
  const navigatorWithShare = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
    share?: (data?: ShareData) => Promise<void>
  }

  if (!navigatorWithShare.share) return false

  let imageFile: File | undefined
  if (product.image_url && navigatorWithShare.canShare) {
    try {
      const response = await fetch(product.image_url, { mode: 'cors' })
      if (response.ok) {
        const blob = await response.blob()
        const extension = blob.type.split('/')[1] || 'jpg'
        const candidate = new File([blob], `${product.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${extension}`, { type: blob.type || 'image/jpeg' })
        if (navigatorWithShare.canShare({ files: [candidate] })) imageFile = candidate
      }
    } catch (error) {
      console.info('Product image could not be attached to native share:', error)
    }
  }

  await navigatorWithShare.share({
    title: `${product.name} | Reliable`,
    text,
    url: shareUrl,
    ...(imageFile ? { files: [imageFile] } : {}),
  })
  return true
}

export function getSocialShareLinks(product: Product) {
  const shareUrl = getProductShareUrl(product.id)
  const text = getProductShareText(product)
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(shareUrl)
  return {
    // Keep the caption and preview URL separate so WhatsApp renders one clean
    // image card instead of showing duplicate product links in the message.
    whatsapp: `https://wa.me/?text=${encodedText}%0A${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    email: `mailto:?subject=${encodeURIComponent(`${product.name} | Reliable`)}&body=${encodedText}%0A${encodedUrl}`,
  }
}

export async function copyProductShareLink(product: Product) {
  const shareUrl = getProductShareUrl(product.id)
  await navigator.clipboard.writeText(shareUrl)
  return shareUrl
}
