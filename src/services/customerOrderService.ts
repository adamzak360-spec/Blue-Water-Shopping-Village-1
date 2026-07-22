import { supabase } from '../supabaseClient'
import { Order, CartItem } from '../types'
import { validateCartStock } from './inventoryService'

const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

export const getCustomerOrders = async (userId: string): Promise<Order[]> => {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customer orders:', error)
    throw error
  }

  return data as Order[]
}

export const getCustomerOrderById = async (orderId: string, userId: string): Promise<Order | null> => {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows found
    console.error('Error fetching customer order:', error)
    throw error
  }

  return data as Order | null
}

export const reorderPreviousOrder = async (
  orderId: string,
  userId: string,
  newOrderData: Omit<Order, 'id' | 'created_at'>
): Promise<Order> => {
  // First verify the order belongs to the customer
  const originalOrder = await getCustomerOrderById(orderId, userId)
  if (!originalOrder) {
    throw new Error('Order not found or does not belong to this customer')
  }

  // Validate stock availability for the items
  console.log('[ReorderService] Validating stock for reorder items')
  const stockValidation = await validateCartStock(newOrderData.items as CartItem[])

  if (!stockValidation.isValid) {
    const errorMessage = stockValidation.insufficientStock.join('; ')
    console.error('[ReorderService] Stock validation failed:', errorMessage)
    throw new Error(`Stock validation failed: ${errorMessage}`)
  }

  if (stockValidation.lowStockWarnings.length > 0) {
    console.warn('[ReorderService] Low stock warnings:', stockValidation.lowStockWarnings)
  }

  // Create new order with the same items
  const { data, error } = await getSupabase()
    .from('orders')
    .insert([newOrderData])
    .select()

  if (error) {
    console.error('Supabase error creating reorder:', error)
    throw error
  }

  if (!data || data.length === 0) {
    throw new Error('Reorder creation failed: No data returned from server')
  }

  console.log('[ReorderService] Reorder created successfully')
  return data[0] as Order
}

export const getOrderStatusTimeline = (
  status: Order['status']
): { stage: string; completed: boolean }[] => {
  const stages = [
    { stage: 'Pending', status: 'pending' },
    { stage: 'Approved', status: 'approved' },
    { stage: 'Processing', status: 'processing' },
    { stage: 'Ready for Pickup', status: 'ready-for-pickup' },
    { stage: 'Out for Delivery', status: 'out-for-delivery' },
    { stage: 'Delivered', status: 'delivered' },
  ]

  const statusOrder = ['pending', 'approved', 'processing', 'ready-for-pickup', 'out-for-delivery', 'delivered', 'cancelled']
  const currentStatusIndex = statusOrder.indexOf(status)

  return stages.map(({ stage, status: stageStatus }) => ({
    stage,
    completed: statusOrder.indexOf(stageStatus) <= currentStatusIndex && status !== 'cancelled',
  }))
}
