import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfYear, isWithinInterval } from 'date-fns'

/**
 * Admin Analytics Service
 * Provides data aggregation for sales and financial reporting
 */

const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }
  return supabase
}

export interface SalesStats {
  todaySales: number
  yesterdaySales: number
  thisWeekSales: number
  thisMonthSales: number
  thisYearSales: number
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
  totalProductsSold: number
}

export const getSalesAnalytics = async (): Promise<SalesStats> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const now = new Date()
  const today = { start: startOfDay(now), end: endOfDay(now) }
  const yesterday = { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
  const thisWeek = { start: startOfWeek(now), end: now }
  const thisMonth = { start: startOfMonth(now), end: now }
  const thisYear = { start: startOfYear(now), end: now }

  let todaySales = 0
  let yesterdaySales = 0
  let thisWeekSales = 0
  let thisMonthSales = 0
  let thisYearSales = 0
  let totalRevenue = 0
  let totalProductsSold = 0

  orders?.forEach((order: Order) => {
    const orderDate = new Date(order.created_at!)
    const amount = order.total

    totalRevenue += amount
    
    // Calculate total products sold
    order.items.forEach(item => {
      totalProductsSold += item.quantity
    })

    if (isWithinInterval(orderDate, today)) todaySales += amount
    if (isWithinInterval(orderDate, yesterday)) yesterdaySales += amount
    if (isWithinInterval(orderDate, thisWeek)) thisWeekSales += amount
    if (isWithinInterval(orderDate, thisMonth)) thisMonthSales += amount
    if (isWithinInterval(orderDate, thisYear)) thisYearSales += amount
  })

  const totalOrders = orders?.length || 0
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return {
    todaySales,
    yesterdaySales,
    thisWeekSales,
    thisMonthSales,
    thisYearSales,
    totalRevenue,
    totalOrders,
    averageOrderValue,
    totalProductsSold
  }
}

export const getSalesReport = async (_period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
  // Implementation for Sprint 2
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true })

  if (error) throw error
  return orders as Order[]
}

export const exportOrdersCSV = (orders: Order[]): string => {
  const headers = ['Order ID', 'Customer', 'Email', 'Total', 'Status', 'Payment', 'Date']
  const rows = orders.map(o => [
    o.id,
    o.customer_name,
    o.customer_email,
    o.total.toFixed(2),
    o.status,
    o.payment_status,
    o.created_at
  ])
  
  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')
}
