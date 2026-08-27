import type { ArticleCard } from '../types/articles'

const ARTICLE_IMAGE_FALLBACKS: Record<string, string> = {
  'Shopping Guides': '/article-images/online-shopping.jpg',
  'Seller Guides': '/article-images/african-seller.jpg',
  Business: '/article-images/business-team.jpg',
  'Product Advice': '/article-images/digital-shopping-payment.jpg',
  'Ghana Marketplace': '/article-images/courier-delivery.jpg',
  'Reliable Guides': '/article-images/digital-payment.jpg',
  'News & Insights': '/article-images/package-delivery.jpg',
}

export function getArticleFallbackImage(article: Pick<ArticleCard, 'category' | 'title'>): string {
  const categoryImage = ARTICLE_IMAGE_FALLBACKS[article.category]
  if (categoryImage) return categoryImage

  const title = `${article.title} ${article.category}`.toLowerCase()
  if (/payment|pay|checkout|transfer|card/.test(title)) return '/article-images/digital-payment.jpg'
  if (/deliver|delivery|order|shipping|package|track/.test(title)) return '/article-images/package-delivery.jpg'
  if (/sell|seller|business|store|entrepreneur/.test(title)) return '/article-images/african-seller.jpg'
  return '/article-images/entrepreneur.jpg'
}

export function getArticleImage(article: Pick<ArticleCard, 'category' | 'title' | 'featured_image'>): string {
  return article.featured_image || getArticleFallbackImage(article)
}
