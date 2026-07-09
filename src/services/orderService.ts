import { supabase } from '../supabaseClient'
import { Order } from '../types'

// Guard: Supabase must be configured for order operations
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

export const createOrder = async (orderData: Omit<Order, 'id' | 'created_at'>) => {
  const { data, error } = await getSupabase()
    .from('orders')
    .insert([orderData])
    .select()

  if (error) {
    console.error('Error creating order:', error)
    throw error
  }
  return data[0]
}

export const getAllOrders = async () => {
  const { data, error } = await getSupabase()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
  return data as Order[]
}

export const updateOrderStatus = async (orderId: string, status: Order['status']) => {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()

  if (error) {
    console.error('Error updating order status:', error)
    throw error
  }
  return data[0]
}

export const updatePaymentStatus = async (orderId: string, payment_status: Order['payment_status']) => {
  const { data, error } = await getSupabase()
    .from('orders')
    .update({ payment_status })
    .eq('id', orderId)
    .select()

  if (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
  return data[0]
}
