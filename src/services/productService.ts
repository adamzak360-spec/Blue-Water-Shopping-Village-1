import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Product, DashboardStats, ProductVariant } from '../types'

const STORAGE_BUCKET = 'product-images'
const VIDEO_STORAGE_BUCKET = 'product-videos'

// In-memory cache for products to speed up page transitions
let productsCache: Product[] | null = null
let activeProductsCache: Product[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const PUBLIC_CATALOG_CACHE_DURATION = 60 * 1000 // 1 minute
const publicCatalogCache = new Map<string, { data: Product[]; timestamp: number }>()
const publicCatalogRequests = new Map<string, Promise<Product[]>>()

// Fields required by ProductCard and cart/delivery calculations; intentionally excludes
// detail-only specifications, galleries, and other large product payloads.
const PUBLIC_CARD_SELECT = [
  'id', 'name', 'description', 'price', 'currency', 'category', 'image_url', 'video_urls',
  'stock_quantity', 'low_stock_threshold', 'status', 'created_at', 'updated_at',
  'business_id', 'brand', 'original_price', 'has_sizes',
  'delivery_fee_tamale', 'delivery_fee_greater_accra', 'delivery_fee_lesser_accra',
  'delivery_fee_dhl', 'delivery_fee_ups', 'delivery_fee_fedex',
].join(', ')

function isCacheValid() {
  return productsCache !== null && (Date.now() - cacheTimestamp) < CACHE_DURATION
}

function clearCache() {
  productsCache = null
  activeProductsCache = null
}

// Supported video formats
const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm']
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm']

export async function getAllProducts(businessId?: string): Promise<Product[]> {
  if (!businessId && isCacheValid() && productsCache) {
    return productsCache
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (businessId) {
    query = query.eq('business_id', businessId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const products = (data as Product[]) || []
  
  if (!businessId) {
    productsCache = products
    cacheTimestamp = Date.now()
  }
  
  return products
}

export type PublicCatalogDestination = 'HOME' | 'PRODUCTS'

export async function getPublicCatalogProducts(destination: PublicCatalogDestination, searchTerm = ''): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const cacheKey = `${destination}:${normalizedSearch}`
  const cached = publicCatalogCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < PUBLIC_CATALOG_CACHE_DURATION) {
    return cached.data
  }

  const existingRequest = publicCatalogRequests.get(cacheKey)
  if (existingRequest) return existingRequest

  const request = Promise.resolve(supabase.rpc('get_public_catalog_products', {
    p_destination: destination,
    p_search: normalizedSearch || null,
  })).then(({ data, error }) => {
    if (error) throw new Error(error.message)
    const products = (data as Product[]) || []
    publicCatalogCache.set(cacheKey, { data: products, timestamp: Date.now() })
    return products
  }).finally(() => {
    publicCatalogRequests.delete(cacheKey)
  })

  publicCatalogRequests.set(cacheKey, request)
  return request
}

export async function getBoundedPublicCatalogProducts(
  destination: PublicCatalogDestination,
  options: { searchTerm?: string; category?: string; limit?: number; offset?: number; businessId?: string } = {},
): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }
  const client = supabase

  const normalizedSearch = options.searchTerm?.trim().toLowerCase() || ''
  const normalizedCategory = options.category?.trim() || ''
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 60)
  const offset = Math.max(options.offset ?? 0, 0)
  const normalizedBusinessId = options.businessId?.trim() || ''
  const cacheKey = `bounded:${destination}:${normalizedSearch}:${normalizedCategory}:${limit}:${offset}:${normalizedBusinessId}`
  const cached = publicCatalogCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < PUBLIC_CATALOG_CACHE_DURATION) {
    return cached.data
  }

  const existingRequest = publicCatalogRequests.get(cacheKey)
  if (existingRequest) return existingRequest

  const request = Promise.resolve(client.rpc('get_public_catalog_cards_bounded', {
    p_destination: destination,
    p_search: normalizedSearch || null,
    p_category: normalizedCategory || null,
    p_business_id: normalizedBusinessId || null,
    p_limit: limit,
    p_offset: offset,
  })).then(async ({ data, error }) => {
    // Keep the rollout safe: if the additive RPC has not yet been applied,
    // fall back once to the existing bounded function rather than breaking the catalog.
    if (error && (error.code === 'PGRST202' || error.code === '42883')) {
      const fallback = await client.rpc('get_public_catalog_products_bounded', {
        p_destination: destination,
        p_search: normalizedSearch || null,
        p_category: normalizedCategory || null,
        p_limit: limit,
        p_offset: offset,
      })
      if (fallback.error) throw new Error(fallback.error.message)
      const products = (fallback.data as Product[]) || []
      publicCatalogCache.set(cacheKey, { data: products, timestamp: Date.now() })
      return products
    }
    if (error) throw new Error(error.message)
    const products = (data as Product[]) || []
    publicCatalogCache.set(cacheKey, { data: products, timestamp: Date.now() })
    return products
  }).finally(() => {
    publicCatalogRequests.delete(cacheKey)
  })

  publicCatalogRequests.set(cacheKey, request)
  return request
}

export async function getPublicCatalogProductsByIds(ids: string[]): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const normalizedIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean))).slice(0, 60)
  if (normalizedIds.length === 0) return []

  const { data, error } = await supabase
    .from('products')
    .select(PUBLIC_CARD_SELECT)
    .in('id', normalizedIds)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  return (data as unknown as Product[]) || []
}

export async function getActiveProducts(): Promise<Product[]> {
  if (isCacheValid() && activeProductsCache) {
    return activeProductsCache
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  activeProductsCache = (data as Product[]) || []
  if (!productsCache) {
    // If we don't have the full cache, we don't set the global timestamp yet
    // to ensure getAllProducts still fetches fresh data if needed
  }
  return activeProductsCache
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as Product
}

export async function createProduct(
  productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
): Promise<Product> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  clearCache()
  return data as Product
}

export async function updateProduct(
  id: string,
  updates: Partial<Omit<Product, 'id' | 'created_at'>>
): Promise<Product> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  clearCache()
  return data as Product
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  clearCache()
}

export async function uploadProductImage(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const uploadFile = await compressProductImage(file)
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${uploadFile.name}`

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, uploadFile, {
      cacheControl: '31536000',
      upsert: false,
    })

  if (error) {
    throw new Error(error.message)
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

async function compressProductImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || typeof createImageBitmap !== 'function') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const maxDimension = 1600
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82))
    if (!compressed || compressed.size >= file.size) return file
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'product-image'
    return new File([compressed], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() })
  } catch {
    return file
  }
}

export async function deleteProductImage(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) {
    throw new Error(error.message)
  }
}

export async function getDashboardStats(businessId?: string): Promise<DashboardStats> {
  const allProducts = await getAllProducts(businessId)

  return {
    total: allProducts.length,
    active: allProducts.filter(p => p.status === 'active').length,
    outOfStock: allProducts.filter(p => p.status === 'out-of-stock' || p.stock_quantity === 0).length,
  }
}


// Video upload and validation functions
export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 500MB)
  const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `Video file is too large. Maximum size is 500MB, but got ${(file.size / 1024 / 1024).toFixed(2)}MB.` }
  }

  // Check MIME type
  if (!SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    return { valid: false, error: `Unsupported video format: ${file.type}. Supported formats are: MP4, MOV, WEBM.` }
  }

  // Check file extension as additional validation
  const fileName = file.name.toLowerCase()
  const hasValidExtension = SUPPORTED_VIDEO_EXTENSIONS.some(ext => fileName.endsWith(ext))
  if (!hasValidExtension) {
    return { valid: false, error: `Unsupported file extension. Supported formats are: ${SUPPORTED_VIDEO_EXTENSIONS.join(', ')}` }
  }

  return { valid: true }
}

export async function uploadProductVideo(file: File): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  // Validate video file
  const validation = validateVideoFile(file)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid video file')
  }

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`

  try {
    const { data, error } = await supabase.storage
      .from(VIDEO_STORAGE_BUCKET)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw new Error(error.message)
    }

    const { data: urlData } = supabase.storage
      .from(VIDEO_STORAGE_BUCKET)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (err) {
    throw new Error(`Failed to upload video: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export async function deleteProductVideo(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  try {
    const { error } = await supabase.storage
      .from(VIDEO_STORAGE_BUCKET)
      .remove([storagePath])

    if (error) {
      throw new Error(error.message)
    }
  } catch (err) {
    throw new Error(`Failed to delete video: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('active', true)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data as ProductVariant[]) || []
}

export async function createProductVariant(
  variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>
): Promise<ProductVariant> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('product_variants')
    .insert(variant)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ProductVariant
}

export async function updateProductVariant(
  id: string,
  updates: Partial<Omit<ProductVariant, 'id' | 'created_at'>>
): Promise<ProductVariant> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('product_variants')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data as ProductVariant
}

export async function deleteProductVariant(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncProductVariants(productId: string, variants: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  // Delete existing variants
  const { error: deleteError } = await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', productId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  // Insert new variants if any
  if (variants.length > 0) {
    const { error: insertError } = await supabase
      .from('product_variants')
      .insert(variants.map(v => ({ ...v, product_id: productId })))

    if (insertError) {
      throw new Error(insertError.message)
    }
  }
}
