const PUBLIC_OBJECT_PREFIX = '/storage/v1/object/public/'
const RENDER_OBJECT_PREFIX = '/storage/v1/render/image/public/'

/**
 * Return a size-appropriate Supabase Storage image URL without creating a
 * duplicate object. Non-Supabase URLs are returned unchanged.
 */
export function getOptimizedImageUrl(source: string | null | undefined, width: number, quality = 78): string {
  if (!source) return ''

  try {
    const url = new URL(source)
    const publicIndex = url.pathname.indexOf(PUBLIC_OBJECT_PREFIX)
    if (publicIndex < 0 || !url.hostname.endsWith('.supabase.co')) return source

    const objectPath = url.pathname.slice(publicIndex + PUBLIC_OBJECT_PREFIX.length)
    if (!objectPath) return source

    const renderUrl = new URL(url.origin)
    renderUrl.pathname = `${RENDER_OBJECT_PREFIX}${objectPath}`
    renderUrl.searchParams.set('width', String(Math.max(160, Math.round(width))))
    renderUrl.searchParams.set('quality', String(Math.min(90, Math.max(45, Math.round(quality)))))
    renderUrl.searchParams.set('resize', 'contain')
    return renderUrl.toString()
  } catch {
    return source
  }
}

export function getResponsiveImageSet(source: string | null | undefined, widths = [240, 360, 540]): string | undefined {
  if (!source) return undefined
  const values = widths.map(width => `${getOptimizedImageUrl(source, width)} ${width}w`)
  return values.join(', ')
}

export function getOriginalImageUrl(source: string | null | undefined): string {
  return source || ''
}
