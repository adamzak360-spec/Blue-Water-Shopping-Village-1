import { supabase } from '../supabaseClient'
import { Product, CartItem } from '../types'

// Guard: Supabase must be configured for inventory operations
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

/**
 * Validate that all items in the cart have sufficient stock
 * @param cartItems - Array of cart items to validate
 * @returns Object with isValid flag and any error messages
 */
export const validateCartStock = async (cartItems: CartItem[]) => {
  try {
    console.log('[InventoryService] Validating stock for', cartItems.length, 'items')
    
    // Fetch current stock levels for all items in the cart
    const productIds = cartItems.map(item => item.id)
    
    const { data: products, error } = await getSupabase()
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .in('id', productIds)
    
    if (error) {
      console.error('[InventoryService] Error fetching product stock:', error)
      throw new Error('Failed to validate stock availability')
    }
    
    if (!products) {
      throw new Error('No product data returned')
    }
    
    // Create a map of product stock for quick lookup
    const stockMap = new Map<string, { name: string; stock: number; threshold: number }>()
    products.forEach(p => {
      stockMap.set(p.id, {
        name: p.name,
        stock: p.stock_quantity || 0,
        threshold: p.low_stock_threshold || 5
      })
    })
    
    // Check each cart item against available stock
    const insufficientStock: string[] = []
    const lowStockWarnings: string[] = []
    
    cartItems.forEach(item => {
      const productStock = stockMap.get(item.id)
      
      if (!productStock) {
        insufficientStock.push(`${item.name} is no longer available`)
        return
      }
      
      if (item.quantity > productStock.stock) {
        insufficientStock.push(
          `${item.name}: Only ${productStock.stock} in stock, but you requested ${item.quantity}`
        )
      } else if (item.quantity > productStock.stock - productStock.threshold) {
        lowStockWarnings.push(
          `${item.name}: Low stock! Only ${productStock.stock} available.`
        )
      }
    })
    
    return {
      isValid: insufficientStock.length === 0,
      insufficientStock,
      lowStockWarnings,
      stockMap
    }
  } catch (error: any) {
    console.error('[InventoryService] Stock validation error:', error)
    throw error
  }
}

/**
 * Get current stock level for a specific product
 * @param productId - ID of the product
 * @returns Current stock quantity
 */
export const getProductStock = async (productId: string): Promise<number> => {
  try {
    const { data, error } = await getSupabase()
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single()
    
    if (error) {
      console.error('[InventoryService] Error fetching product stock:', error)
      throw error
    }
    
    return data?.stock_quantity || 0
  } catch (error: any) {
    console.error('[InventoryService] Error getting product stock:', error)
    throw error
  }
}

/**
 * Manually update product stock (admin function)
 * @param productId - ID of the product
 * @param newStock - New stock quantity
 * @returns Updated product
 */
export const updateProductStock = async (productId: string, newStock: number): Promise<Product> => {
  try {
    console.log(`[InventoryService] Updating stock for product ${productId} to ${newStock}`)
    
    const { data, error } = await getSupabase()
      .from('products')
      .update({ stock_quantity: Math.max(0, newStock) })
      .eq('id', productId)
      .select()
      .single()
    
    if (error) {
      console.error('[InventoryService] Error updating product stock:', error)
      throw error
    }
    
    console.log('[InventoryService] Stock updated successfully:', data)
    return data as Product
  } catch (error: any) {
    console.error('[InventoryService] Error updating stock:', error)
    throw error
  }
}

/**
 * Adjust product stock by a delta amount (increase or decrease)
 * @param productId - ID of the product
 * @param delta - Amount to adjust (positive or negative)
 * @returns Updated product
 */
export const adjustProductStock = async (productId: string, delta: number): Promise<Product> => {
  try {
    console.log(`[InventoryService] Adjusting stock for product ${productId} by ${delta}`)
    
    // First get current stock
    const currentStock = await getProductStock(productId)
    const newStock = Math.max(0, currentStock + delta)
    
    return await updateProductStock(productId, newStock)
  } catch (error: any) {
    console.error('[InventoryService] Error adjusting stock:', error)
    throw error
  }
}

/**
 * Get all products with low stock (below threshold)
 * @returns Array of products with low stock
 */
export const getLowStockProducts = async (): Promise<Product[]> => {
  try {
    // Note: Supabase doesn't support column-to-column comparison in filters directly.
    // We fetch all products and filter client-side for low stock.
    const { data, error } = await getSupabase()
      .from('products')
      .select('*')
      .order('stock_quantity', { ascending: true })
    
    if (error) {
      console.error('[InventoryService] Error fetching products for low stock check:', error)
      throw error
    }
    
    const products = (data || []) as Product[]
    return products.filter(p => (p.stock_quantity || 0) <= (p.low_stock_threshold || 5))
  } catch (error: any) {
    console.error('[InventoryService] Error getting low stock products:', error)
    throw error
  }
}

/**
 * Get inventory summary statistics
 * @returns Object with inventory stats
 */
export const getInventorySummary = async () => {
  try {
    const { data, error } = await getSupabase()
      .from('products')
      .select('stock_quantity, low_stock_threshold, status')
    
    if (error) {
      console.error('[InventoryService] Error fetching inventory summary:', error)
      throw error
    }
    
    const products = (data || []) as any[]
    const totalItems = products.reduce((sum, p) => sum + (Number(p.stock_quantity) || 0), 0)
    const lowStockCount = products.filter(
      p => (Number(p.stock_quantity) || 0) <= (Number(p.low_stock_threshold) || 5)
    ).length
    const outOfStockCount = products.filter(p => (Number(p.stock_quantity) || 0) === 0).length
    
    return {
      totalItems,
      lowStockCount,
      outOfStockCount,
      totalProducts: products.length
    }
  } catch (error: any) {
    console.error('[InventoryService] Error getting inventory summary:', error)
    throw error
  }
}
