export type ArticleStatus = 'draft' | 'published'

export const ARTICLE_CATEGORIES = [
  'Shopping Guides',
  'Seller Guides',
  'Business',
  'Product Advice',
  'Ghana Marketplace',
  'Reliable Guides',
  'News & Insights',
] as const

export type ArticleCategory = typeof ARTICLE_CATEGORIES[number] | string

export interface ArticleCard {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image?: string | null
  category: ArticleCategory
  author_name: string
  published_at?: string | null
  updated_at: string
  reading_time_minutes?: number | null
  featured: boolean
}

export type ArticleAdminSummary = Omit<Article, 'content_html'>

export interface Article extends ArticleCard {
  content_html: string
  author_id?: string | null
  status: ArticleStatus
  primary_keyword?: string | null
  secondary_topics: string[]
  seo_title?: string | null
  seo_description?: string | null
  canonical_url?: string | null
  created_at: string
}

export interface ArticleProductCard {
  id: string
  name: string
  price: number
  currency?: string | null
  image_url?: string | null
  status: string
  stock_quantity?: number | null
  business_id?: string | null
}

export interface ArticleStoreCard {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  description?: string | null
  location?: string | null
  category?: string | null
}

export interface ArticleDetail extends Article {
  related_products: ArticleProductCard[]
  related_stores: ArticleStoreCard[]
  related_articles: ArticleCard[]
}

export interface ArticleInput {
  title: string
  slug: string
  excerpt: string
  content_html: string
  featured_image?: string | null
  category: string
  author_name: string
  status: ArticleStatus
  featured: boolean
  reading_time_minutes?: number | null
  primary_keyword?: string | null
  secondary_topics?: string[]
  seo_title?: string | null
  seo_description?: string | null
  canonical_url?: string | null
  published_at?: string | null
}

export interface ArticleRelationSelection {
  product_ids: string[]
  store_ids: string[]
  related_article_ids: string[]
}
