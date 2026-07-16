import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { validateCartStock } from './inventoryService'
import { sendNewOrderNotifications } from './emailNotifications'

/**
 * Guest Order Service
 * Handles order creation for anonymous customers without authentication.
 * This service is isolated from admin authentication and operates independently.
 */

interface GuestOrderPayload {
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  city: string
  region: string
  notes?: string
  items: any[]
  subtotal: number
  delivery_fee: number
  total: number
}

/**
 * Validates all required fields for a guest order
 * @throws Error with specific validation message if validation fails
 */
function validateGuestOrder(payload: GuestOrderPayload): void {
  const errors: string[] = []

  // Check required fields
  if (!payload.customer_name || payload.customer_name.trim() === '') {
    errors.push('Full Name is required')
  }
  if (!payload.customer_phone || payload.customer_phone.trim() === '') {
    errors.push('Phone Number is required')
  }
  if (!payload.delivery_address || payload.delivery_address.trim() === '') {
    errors.push('Delivery Address is required')
  }
  if (!payload.city || payload.city.trim() === '') {
    errors.push('City is required')
  }
  if (!payload.region || payload.region.trim() === '') {
    errors.push('Region is required')
  }

  // Validate email if provided
  if (payload.customer_email && payload.customer_email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(payload.customer_email)) {
      errors.push('Email format is invalid')
    }
  }

  // Validate cart items
  if (!payload.items || payload.items.length === 0) {
    errors.push('Cart is empty')
  }
  
  // Note: Stock validation will be performed separately in createGuestOrder
  // to allow for async database queries

  // Validate amounts
  if (payload.subtotal < 0) {
    errors.push('Subtotal cannot be negative')
  }
  if (payload.delivery_fee < 0) {
    errors.push('Delivery fee cannot be negative')
  }
  if (payload.total < 0) {
    errors.push('Total cannot be negative')
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '))
  }
}

/**
 * Creates a guest order in Supabase
 * This function is completely independent of admin authentication.
 * It uses the anonymous Supabase client to insert the order.
 * 
 * @param payload Guest order data
 * @returns Created order data with ID
 * @throws Error with detailed message if creation fails
 */
export async function createGuestOrder(
  payload: GuestOrderPayload
): Promise<any> {
  console.log('[Guest Order] Starting guest order creation...')

  // Validate Supabase configuration
  if (!isSupabaseConfigured || !supabase) {
    console.error('[Guest Order] Supabase is not configured')
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }

  // Validate payload
  console.log('[Guest Order] Validating payload...')
  validateGuestOrder(payload)
  console.log('[Guest Order] Validation successful')
  
  // Validate stock availability before creating order
  console.log('[Guest Order] Validating stock for order items')
  const stockValidation = await validateCartStock(payload.items)
  
  if (!stockValidation.isValid) {
    const errorMessage = stockValidation.insufficientStock.join('; ')
    console.error('[Guest Order] Stock validation failed:', errorMessage)
    throw new Error(`Stock validation failed: ${errorMessage}`)
  }
  
  if (stockValidation.lowStockWarnings.length > 0) {
    console.warn('[Guest Order] Low stock warnings:', stockValidation.lowStockWarnings)
  }
  console.log('[Guest Order] Stock validation successful')

  // Prepare order data for insertion
  const orderData = {
    customer_name: payload.customer_name.trim(),
    customer_email: payload.customer_email?.trim() || null,
    customer_phone: payload.customer_phone.trim(),
    delivery_address: payload.delivery_address.trim(),
    city: payload.city.trim(),
    region: payload.region.trim(),
    notes: payload.notes?.trim() || null,
    items: payload.items,
    subtotal: payload.subtotal,
    delivery_fee: payload.delivery_fee,
    total: payload.total,
    status: 'pending',
    payment_status: 'pending',
    user_id: null,
  }

  console.log('[Guest Order] Preparing to insert order:', {
    customer_name: orderData.customer_name,
    customer_phone: orderData.customer_phone,
    city: orderData.city,
    total: orderData.total,
    items_count: orderData.items.length,
  })

  try {
    console.log('[Guest Order] Connecting to Supabase...')
    const { data, error, status, statusText } = await supabase
      .from('orders')
      .insert([orderData])
      .select()

    if (error) {
      console.error('[Guest Order] Supabase insert error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        status,
        statusText,
      })

      // Provide more helpful error messages
      console.error("RAW SUPABASE ERROR:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.error('[Guest Order] No data returned from insert')
      throw new Error('Order creation failed: Server returned no data')
    }

    const createdOrder = data[0]
    console.log('[Guest Order] Order created successfully:', {
      id: createdOrder.id,
      customer_name: createdOrder.customer_name,
      total: createdOrder.total,
    })
    console.log('[Guest Order] Stock reduction will be handled by database trigger.')

    // Trigger email notifications in the background
    if (createdOrder.customer_email) {
      sendNewOrderNotifications(createdOrder, createdOrder.customer_email).catch(err => {
        console.error('[GuestOrderService] Error sending new order notifications:', err);
      });
    }

    return createdOrder
  } catch (error: any) {
    console.error('[Guest Order] Unexpected error during order creation:', error)
    
    console.error("RAW SUPABASE ERROR (catch block):", error);
    throw error;
  }
}
