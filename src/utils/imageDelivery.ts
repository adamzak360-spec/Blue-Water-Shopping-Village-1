/**
 * Return the stable public image URL. The current Supabase image-rendering
 * endpoint returns 403 for this public bucket, so direct delivery avoids a
 * failed transform request followed by a fallback request.
 */
export function getOptimizedImageUrl(source: string | null | undefined, _width: number, _quality = 78): string {
  // The current Reliable Supabase project does not have the image-rendering
  // endpoint enabled for its public bucket: transformed URLs return 403 and
  // force a second request through the fallback handler. Returning the stable
  // public object URL avoids that failed round trip and keeps the existing
  // lazy-loading behavior intact until a verified image CDN is configured.
  return source || ''
}

export function getResponsiveImageSet(_source: string | null | undefined, _widths = [240, 360, 540]): string | undefined {
  // Do not emit srcset entries that point to the unavailable transform API.
  return undefined
}

export function getOriginalImageUrl(source: string | null | undefined): string {
  return source || ''
}
