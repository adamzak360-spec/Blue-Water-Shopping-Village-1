import type { Product } from '../types'

export function getProductPageUrl(productId: string) {
  return new URL(`/product/${encodeURIComponent(productId)}`, window.location.origin).toString()
}

export function getProductShareUrl(productId: string) {
  return new URL(`/api/share-product?id=${encodeURIComponent(productId)}`, window.location.origin).toString()
}

export function getProductShareText(product: Product) {
  const description = product.description?.replace(/\s+/g, ' ').trim()
  return `${product.name} — ${product.price.toLocaleString('en-GH', { style: 'currency', currency: 'GHS' })}\n${description ? `${description.slice(0, 180)}${description.length > 180 ? '…' : ''}\n` : ''}Shop on Reliable: ${getProductPageUrl(product.id)}`
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
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
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
