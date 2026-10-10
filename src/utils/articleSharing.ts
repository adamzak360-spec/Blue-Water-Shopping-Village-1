import type { ArticleCard } from '../types/articles'

export function getArticlePageUrl(slug: string) {
  return new URL(`/articles/${encodeURIComponent(slug)}`, window.location.origin).toString()
}

/** Social crawlers read the article image and excerpt from this endpoint before redirecting to the article. */
export function getArticleShareUrl(slug: string) {
  return new URL(`/api/share-product?article=${encodeURIComponent(slug)}`, window.location.origin).toString()
}

export function getArticleShareText(article: Pick<ArticleCard, 'title' | 'excerpt'>) {
  const excerpt = (article.excerpt || '').replace(/\s+/g, ' ').trim()
  return [`📰 ${article.title}`, excerpt].filter(Boolean).join('\n')
}

export function getArticleWhatsAppUrl(article: Pick<ArticleCard, 'title' | 'excerpt' | 'slug'>) {
  const text = encodeURIComponent(getArticleShareText(article))
  const shareUrl = encodeURIComponent(getArticleShareUrl(article.slug))
  return `https://wa.me/?text=${text}%0A${shareUrl}`
}
