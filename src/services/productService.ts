import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Product, DashboardStats, ProductVariant } from '../types'

const STORAGE_BUCKET = 'product-images'
const VIDEO_STORAGE_BUCKET = 'product-videos'

// In-memory cache for products to speed up page transitions
let productsCache: Product[] | null = null
let activeProductsCache: Product[] | null = null
let cacheTimestamp = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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

export async function getAllProducts(): Promise<Product[]> {
  if (isCacheValid() && productsCache) {
    return productsCache
  }

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  productsCache = (data as Product[]) || []
  cacheTimestamp = Date.now()
  return productsCache
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

  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name}`

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const allProducts = await getAllProducts()

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
