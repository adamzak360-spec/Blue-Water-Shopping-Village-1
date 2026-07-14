import { supabase } from '../supabaseClient'
import { Product } from '../types'
import { 
  updateProductStock, 
  adjustProductStock, 
  getLowStockProducts, 
  getInventorySummary 
} from './inventoryService'

/**
 * Admin Inventory Service
 * Provides admin-specific inventory management functions
 */

// Guard: Supabase must be configured
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

/**
 * Get all products with inventory details
 * @returns Array of products with stock information
 */
export const getAllProductsWithInventory = async (): Promise<Product[]> => {
  try {
    console.log('[AdminInventory] Fetching all products with inventory')
    
    const { data, error } = await getSupabase()
      .from('products')
      .select('*')
      .order('name', { ascending: true })
    
    if (error) {
      console.error('[AdminInventory] Error fetching products:', error)
      throw error
    }
    
    return (data || []) as Product[]
  } catch (error: any) {
    console.error('[AdminInventory] Error getting products:', error)
    throw error
  }
}

/**
 * Update product stock via admin interface
 * @param productId - ID of the product
 * @param newStock - New stock quantity
 * @returns Updated product
 */
export const adminUpdateProductStock = async (productId: string, newStock: number): Promise<Product> => {
  try {
    console.log(`[AdminInventory] Admin updating stock for product ${productId} to ${newStock}`)
    return await updateProductStock(productId, newStock)
  } catch (error: any) {
    console.error('[AdminInventory] Error updating stock:', error)
    throw error
  }
}

/**
 * Adjust product stock by a delta amount
 * @param productId - ID of the product
 * @param delta - Amount to adjust (positive or negative)
 * @returns Updated product
 */
export const adminAdjustProductStock = async (productId: string, delta: number): Promise<Product> => {
  try {
    console.log(`[AdminInventory] Admin adjusting stock for product ${productId} by ${delta}`)
    return await adjustProductStock(productId, delta)
  } catch (error: any) {
    console.error('[AdminInventory] Error adjusting stock:', error)
    throw error
  }
}

/**
 * Get low stock alert products
 * @returns Array of products with low stock
 */
export const adminGetLowStockProducts = async (): Promise<Product[]> => {
  try {
    console.log('[AdminInventory] Fetching low stock products')
    return await getLowStockProducts()
  } catch (error: any) {
    console.error('[AdminInventory] Error getting low stock products:', error)
    throw error
  }
}

/**
 * Get inventory summary for dashboard
 * @returns Inventory statistics
 */
export const adminGetInventorySummary = async () => {
  try {
    console.log('[AdminInventory] Fetching inventory summary')
    return await getInventorySummary()
  } catch (error: any) {
    console.error('[AdminInventory] Error getting inventory summary:', error)
    throw error
  }
}

/**
 * Bulk update product stock
 * @param updates - Array of {productId, newStock} objects
 * @returns Array of updated products
 */
export const adminBulkUpdateStock = async (
  updates: Array<{ productId: string; newStock: number }>
): Promise<Product[]> => {
  try {
    console.log('[AdminInventory] Bulk updating stock for', updates.length, 'products')
    
    const results: Product[] = []
    
    for (const update of updates) {
      try {
        const updated = await updateProductStock(update.productId, update.newStock)
        results.push(updated)
      } catch (error) {
        console.error(`[AdminInventory] Failed to update product ${update.productId}:`, error)
        // Continue with other updates even if one fails
      }
    }
    
    console.log('[AdminInventory] Bulk update completed. Updated:', results.length, 'products')
    return results
  } catch (error: any) {
    console.error('[AdminInventory] Error in bulk update:', error)
    throw error
  }
}

/**
 * Get detailed inventory report
 * @returns Detailed inventory statistics
 */
export const adminGetInventoryReport = async () => {
  try {
    console.log('[AdminInventory] Generating inventory report')
    
    const products = await getAllProductsWithInventory()
    const summary = await getInventorySummary()
    
    // Calculate additional metrics
    const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.price), 0)
    const averageStock = products.length > 0 
      ? products.reduce((sum, p) => sum + p.stock_quantity, 0) / products.length 
      : 0
    
    const report = {
      summary,
      totalValue,
      averageStock,
      products: products.map(p => {
        let stockStatus = 'In Stock'
        if (p.status === 'out-of-stock' || p.stock_quantity === 0) {
          stockStatus = 'Out of Stock'
        } else if (p.low_stock_threshold && p.stock_quantity <= p.low_stock_threshold) {
          stockStatus = 'Low Stock'
        }
        return {
          id: p.id,
          name: p.name,
          stock: p.stock_quantity,
          price: p.price,
          value: p.stock_quantity * p.price,
          status: p.status,
          category: p.category,
          lowStockThreshold: p.low_stock_threshold || 0,
          stockStatus: stockStatus
        }
      })
    }
    
    console.log('[AdminInventory] Inventory report generated')
    return report
  } catch (error: any) {
    console.error('[AdminInventory] Error generating report:', error)
    throw error
  }
}

/**
 * Export inventory data as CSV format
 * @returns CSV string
 */
export const adminExportInventoryCSV = async (): Promise<string> => {
  try {
    console.log('[AdminInventory] Exporting inventory as CSV')
    
    const report = await adminGetInventoryReport()
    
    // Create CSV header - matching spec: Product, Category, Current Stock, Low Stock Threshold, Stock Status
    const headers = ['Product', 'Category', 'Current Stock', 'Low Stock Threshold', 'Stock Status']
    const rows = report.products.map(p => [
      p.name,
      p.category,
      p.stock.toString(),
      p.lowStockThreshold.toString(),
      p.stockStatus
    ])
    
    // Create CSV content
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    console.log('[AdminInventory] CSV export completed')
    return csv
  } catch (error: any) {
    console.error('[AdminInventory] Error exporting CSV:', error)
    throw error
  }
}
