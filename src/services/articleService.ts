import { isSupabaseConfigured, supabase, supabaseUrl } from '../supabaseClient'
import type {
  Article,
  ArticleAdminSummary,
  ArticleCard,
  ArticleDetail,
  ArticleInput,
  ArticleProductCard,
  ArticleRelationSelection,
  ArticleStoreCard,
} from '../types/articles'

const ARTICLE_CARD_FIELDS = 'id,title,slug,excerpt,featured_image,category,author_name,published_at,updated_at,reading_time_minutes,featured'
const ARTICLE_DETAIL_FIELDS = `${ARTICLE_CARD_FIELDS},content_html,author_id,status,primary_keyword,secondary_topics,seo_title,seo_description,canonical_url,created_at`
const PRODUCT_CARD_FIELDS = 'id,name,price,currency,image_url,status,stock_quantity,business_id'
const STORE_CARD_FIELDS = 'id,name,slug,logo_url,description,location,category'
const MAX_ARTICLE_RESULTS = 24

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function cleanSearchTerm(value: string) {
  return value.trim().replace(/[%,]/g, ' ').replace(/\s+/g, ' ').slice(0, 80)
}

export function slugifyArticleTitle(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'reliable-article'
}

export async function listPublishedArticles(options: { search?: string; category?: string; limit?: number } = {}): Promise<ArticleCard[]> {
  const client = requireSupabase()
  const limit = Math.max(1, Math.min(options.limit || MAX_ARTICLE_RESULTS, 48))
  const now = new Date().toISOString()
  let query = client
    .from('articles')
    .select(ARTICLE_CARD_FIELDS)
    .eq('status', 'published')
    .lte('published_at', now)
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit)

  if (options.category) query = query.eq('category', options.category)
  const search = cleanSearchTerm(options.search || '')
  if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,category.ilike.%${search}%`)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data || []) as ArticleCard[]
}

export async function getPublishedArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  const client = requireSupabase()
  const now = new Date().toISOString()
  const { data, error } = await client
    .from('articles')
    .select(ARTICLE_DETAIL_FIELDS)
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', now)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return loadArticleRelations(data as Article)
}

async function loadArticleRelations(article: Article): Promise<ArticleDetail> {
  const client = requireSupabase()
  const [{ data: productLinks, error: productLinkError }, { data: storeLinks, error: storeLinkError }, { data: relatedLinks, error: relatedLinkError }] = await Promise.all([
    client.from('article_products').select('product_id,sort_order').eq('article_id', article.id).order('sort_order', { ascending: true }).limit(8),
    client.from('article_stores').select('business_id,sort_order').eq('article_id', article.id).order('sort_order', { ascending: true }).limit(6),
    client.from('article_related_articles').select('related_article_id,sort_order').eq('article_id', article.id).order('sort_order', { ascending: true }).limit(6),
  ])
  if (productLinkError || storeLinkError || relatedLinkError) {
    throw new Error((productLinkError || storeLinkError || relatedLinkError)?.message || 'Unable to load article recommendations.')
  }

  const productIds = (productLinks || []).map((item) => item.product_id).filter(Boolean)
  const storeIds = (storeLinks || []).map((item) => item.business_id).filter(Boolean)
  const relatedIds = (relatedLinks || []).map((item) => item.related_article_id).filter(Boolean)

  const [productResult, storeResult, relatedResult] = await Promise.all([
    productIds.length
      ? client.from('products').select(PRODUCT_CARD_FIELDS).in('id', productIds).limit(8)
      : Promise.resolve({ data: [], error: null }),
    storeIds.length
      ? client.from('businesses').select(STORE_CARD_FIELDS).in('id', storeIds).limit(6)
      : Promise.resolve({ data: [], error: null }),
    relatedIds.length
      ? client.from('articles').select(ARTICLE_CARD_FIELDS).in('id', relatedIds).eq('status', 'published').lte('published_at', new Date().toISOString()).limit(6)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (productResult.error || storeResult.error || relatedResult.error) {
    throw new Error((productResult.error || storeResult.error || relatedResult.error)?.message || 'Unable to load article recommendations.')
  }

  const byId = <T extends { id: string }>(rows: T[] | null | undefined) => new Map((rows || []).map((row) => [row.id, row]))
  const productMap = byId((productResult.data || []) as ArticleProductCard[])
  const storeMap = byId((storeResult.data || []) as ArticleStoreCard[])
  const relatedMap = byId((relatedResult.data || []) as ArticleCard[])

  return {
    ...article,
    related_products: productIds.map((id) => productMap.get(id)).filter(Boolean) as ArticleProductCard[],
    related_stores: storeIds.map((id) => storeMap.get(id)).filter(Boolean) as ArticleStoreCard[],
    related_articles: relatedIds.map((id) => relatedMap.get(id)).filter(Boolean) as ArticleCard[],
  }
}

export async function listArticlesForAdmin(): Promise<ArticleAdminSummary[]> {
  const client = requireSupabase()
  const { data, error } = await client.from('articles').select(ARTICLE_CARD_FIELDS + ',status,primary_keyword,secondary_topics,seo_title,seo_description,canonical_url,created_at,author_id').order('updated_at', { ascending: false }).limit(250)
  if (error) throw new Error(error.message)
  return (data || []) as unknown as ArticleAdminSummary[]
}

export async function getArticleForAdmin(articleId: string): Promise<Article> {
  const client = requireSupabase()
  const { data, error } = await client.from('articles').select(ARTICLE_DETAIL_FIELDS).eq('id', articleId).single()
  if (error) throw new Error(error.message)
  return data as Article
}

export async function listArticleProductOptions() {
  const client = requireSupabase()
  const { data, error } = await client.from('products').select(PRODUCT_CARD_FIELDS).order('name', { ascending: true }).limit(250)
  if (error) throw new Error(error.message)
  return (data || []) as ArticleProductCard[]
}

export async function listArticleStoreOptions() {
  const client = requireSupabase()
  const { data, error } = await client.from('businesses').select(STORE_CARD_FIELDS).order('name', { ascending: true }).limit(120)
  if (error) throw new Error(error.message)
  return (data || []) as ArticleStoreCard[]
}

export async function saveArticle(input: ArticleInput, editingId?: string | null): Promise<Article> {
  const client = requireSupabase()
  const payload = {
    ...input,
    title: input.title.trim(),
    slug: slugifyArticleTitle(input.slug || input.title),
    excerpt: input.excerpt.trim(),
    content_html: input.content_html.trim(),
    category: input.category.trim() || 'Shopping Guides',
    author_name: input.author_name.trim() || 'Reliable Editorial Team',
    primary_keyword: input.primary_keyword?.trim() || null,
    secondary_topics: (input.secondary_topics || []).map((item) => item.trim()).filter(Boolean).slice(0, 12),
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    canonical_url: input.canonical_url?.trim() || null,
    reading_time_minutes: input.reading_time_minutes ? Math.max(1, Math.min(180, Math.round(input.reading_time_minutes))) : null,
    published_at: input.status === 'published' ? (input.published_at || new Date().toISOString()) : null,
  }

  const result = editingId
    ? await client.from('articles').update(payload).eq('id', editingId).select(ARTICLE_DETAIL_FIELDS).single()
    : await client.from('articles').insert(payload).select(ARTICLE_DETAIL_FIELDS).single()
  if (result.error) throw new Error(result.error.message)
  return result.data as Article
}

export async function replaceArticleRelations(articleId: string, selection: ArticleRelationSelection) {
  const client = requireSupabase()
  const relationSets = [
    { table: 'article_products', key: 'product_id', ids: selection.product_ids.slice(0, 8) },
    { table: 'article_stores', key: 'business_id', ids: selection.store_ids.slice(0, 6) },
    { table: 'article_related_articles', key: 'related_article_id', ids: selection.related_article_ids.filter((id) => id !== articleId).slice(0, 6) },
  ] as const

  for (const relation of relationSets) {
    const { error: deleteError } = await client.from(relation.table).delete().eq('article_id', articleId)
    if (deleteError) throw new Error(deleteError.message)
    if (relation.ids.length === 0) continue
    const rows = relation.ids.map((id, index) => ({ article_id: articleId, [relation.key]: id, sort_order: index }))
    const { error: insertError } = await client.from(relation.table).insert(rows)
    if (insertError) throw new Error(insertError.message)
  }
}

export async function getArticleRelationSelection(articleId: string): Promise<ArticleRelationSelection> {
  const client = requireSupabase()
  const [{ data: products, error: productError }, { data: stores, error: storeError }, { data: related, error: relatedError }] = await Promise.all([
    client.from('article_products').select('product_id,sort_order').eq('article_id', articleId).order('sort_order', { ascending: true }).limit(8),
    client.from('article_stores').select('business_id,sort_order').eq('article_id', articleId).order('sort_order', { ascending: true }).limit(6),
    client.from('article_related_articles').select('related_article_id,sort_order').eq('article_id', articleId).order('sort_order', { ascending: true }).limit(6),
  ])
  if (productError || storeError || relatedError) throw new Error((productError || storeError || relatedError)?.message || 'Unable to load article links.')
  return {
    product_ids: (products || []).map((row) => row.product_id),
    store_ids: (stores || []).map((row) => row.business_id),
    related_article_ids: (related || []).map((row) => row.related_article_id),
  }
}

export async function deleteArticle(articleId: string) {
  const client = requireSupabase()
  const { error } = await client.from('articles').delete().eq('id', articleId)
  if (error) throw new Error(error.message)
}

async function compressArticleImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file)
    const maxDimension = 1800
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82))
    if (!compressed || compressed.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'article-image'
    return new File([compressed], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } catch {
    return file
  }
}

export async function uploadArticleImage(file: File): Promise<string> {
  const client = requireSupabase()
  const { data: userResult } = await client.auth.getUser()
  if (!userResult.user) throw new Error('You must be signed in as an administrator to upload an article image.')
  const prepared = await compressArticleImage(file)
  const token = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${userResult.user.id}/${token}-${prepared.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  const { error } = await client.storage.from('article-assets').upload(path, prepared, {
    cacheControl: '31536000',
    contentType: prepared.type,
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return client.storage.from('article-assets').getPublicUrl(path).data.publicUrl
}

export function absoluteArticleImageUrl(value?: string | null) {
  if (!value) return `${window.location.origin}/logo512.png`
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('/storage/v1/')) return `${supabaseUrl.replace(/\/$/, '')}${value}`
  return new URL(value, window.location.origin).toString()
}
