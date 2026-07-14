import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, startOfYear, isWithinInterval, format } from 'date-fns'

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

export interface DailySalesReport {
  date: string
  sales: number
  orders: number
  averageOrderValue: number
}

export interface CategorySalesReport {
  category: string
  totalSales: number
  totalOrders: number
  totalProductsSold: number
}

export interface ProductPerformance {
  productId: string
  productName: string
  category: string
  totalSold: number
  totalRevenue: number
  averagePrice: number
}

export interface CustomerSpending {
  customerName: string
  customerEmail: string
  totalSpent: number
  orderCount: number
  averageOrderValue: number
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

export const getDailySalesReport = async (days: number = 30): Promise<DailySalesReport[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')
    .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())

  if (error) throw error

  const dailyData: { [key: string]: { sales: number; orders: number; revenue: number } } = {}

  orders?.forEach((order: Order) => {
    const date = format(new Date(order.created_at!), 'yyyy-MM-dd')
    if (!dailyData[date]) {
      dailyData[date] = { sales: 0, orders: 0, revenue: 0 }
    }
    dailyData[date].orders += 1
    dailyData[date].revenue += order.total
    dailyData[date].sales += 1
  })

  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    sales: data.revenue,
    orders: data.orders,
    averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
  }))
}

export const getWeeklySalesReport = async (): Promise<DailySalesReport[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')
    .gte('created_at', new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000).toISOString())

  if (error) throw error

  const weeklyData: { [key: string]: { sales: number; orders: number; revenue: number } } = {}

  orders?.forEach((order: Order) => {
    const date = new Date(order.created_at!)
    const weekStart = startOfWeek(date)
    const weekKey = format(weekStart, 'yyyy-MM-dd')
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { sales: 0, orders: 0, revenue: 0 }
    }
    weeklyData[weekKey].orders += 1
    weeklyData[weekKey].revenue += order.total
    weeklyData[weekKey].sales += 1
  })

  return Object.entries(weeklyData).map(([date, data]) => ({
    date,
    sales: data.revenue,
    orders: data.orders,
    averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
  }))
}

export const getMonthlySalesReport = async (): Promise<DailySalesReport[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const monthlyData: { [key: string]: { sales: number; orders: number; revenue: number } } = {}

  orders?.forEach((order: Order) => {
    const date = format(new Date(order.created_at!), 'yyyy-MM')
    if (!monthlyData[date]) {
      monthlyData[date] = { sales: 0, orders: 0, revenue: 0 }
    }
    monthlyData[date].orders += 1
    monthlyData[date].revenue += order.total
    monthlyData[date].sales += 1
  })

  return Object.entries(monthlyData).map(([date, data]) => ({
    date,
    sales: data.revenue,
    orders: data.orders,
    averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
  }))
}

export const getYearlySalesReport = async (): Promise<DailySalesReport[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const yearlyData: { [key: string]: { sales: number; orders: number; revenue: number } } = {}

  orders?.forEach((order: Order) => {
    const date = format(new Date(order.created_at!), 'yyyy')
    if (!yearlyData[date]) {
      yearlyData[date] = { sales: 0, orders: 0, revenue: 0 }
    }
    yearlyData[date].orders += 1
    yearlyData[date].revenue += order.total
    yearlyData[date].sales += 1
  })

  return Object.entries(yearlyData).map(([date, data]) => ({
    date,
    sales: data.revenue,
    orders: data.orders,
    averageOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
  }))
}

export const getSalesByCategory = async (): Promise<CategorySalesReport[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const categoryData: { [key: string]: { sales: number; orders: number; productsSold: number } } = {}

  orders?.forEach((order: Order) => {
    order.items.forEach(item => {
      const category = item.category
      if (!categoryData[category]) {
        categoryData[category] = { sales: 0, orders: 0, productsSold: 0 }
      }
      categoryData[category].sales += item.price * item.quantity
      categoryData[category].orders += 1
      categoryData[category].productsSold += item.quantity
    })
  })

  return Object.entries(categoryData).map(([category, data]) => ({
    category,
    totalSales: data.sales,
    totalOrders: data.orders,
    totalProductsSold: data.productsSold
  }))
}

export const getBestSellingProducts = async (limit: number = 10): Promise<ProductPerformance[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const productData: { [key: string]: { name: string; category: string; sold: number; revenue: number; price: number } } = {}

  orders?.forEach((order: Order) => {
    order.items.forEach(item => {
      if (!productData[item.id]) {
        productData[item.id] = { name: item.name, category: item.category, sold: 0, revenue: 0, price: item.price }
      }
      productData[item.id].sold += item.quantity
      productData[item.id].revenue += item.price * item.quantity
    })
  })

  return Object.entries(productData)
    .map(([id, data]) => ({
      productId: id,
      productName: data.name,
      category: data.category,
      totalSold: data.sold,
      totalRevenue: data.revenue,
      averagePrice: data.price
    }))
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, limit)
}

export const getLeastSellingProducts = async (limit: number = 10): Promise<ProductPerformance[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const productData: { [key: string]: { name: string; category: string; sold: number; revenue: number; price: number } } = {}

  orders?.forEach((order: Order) => {
    order.items.forEach(item => {
      if (!productData[item.id]) {
        productData[item.id] = { name: item.name, category: item.category, sold: 0, revenue: 0, price: item.price }
      }
      productData[item.id].sold += item.quantity
      productData[item.id].revenue += item.price * item.quantity
    })
  })

  return Object.entries(productData)
    .map(([id, data]) => ({
      productId: id,
      productName: data.name,
      category: data.category,
      totalSold: data.sold,
      totalRevenue: data.revenue,
      averagePrice: data.price
    }))
    .sort((a, b) => a.totalSold - b.totalSold)
    .slice(0, limit)
}

export const getTopCustomersBySpending = async (limit: number = 10): Promise<CustomerSpending[]> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  const customerData: { [key: string]: { name: string; email: string; spent: number; orders: number } } = {}

  orders?.forEach((order: Order) => {
    const key = order.customer_email
    if (!customerData[key]) {
      customerData[key] = { name: order.customer_name, email: order.customer_email, spent: 0, orders: 0 }
    }
    customerData[key].spent += order.total
    customerData[key].orders += 1
  })

  return Object.entries(customerData)
    .map(([_key, data]) => ({
      customerName: data.name,
      customerEmail: data.email,
      totalSpent: data.spent,
      orderCount: data.orders,
      averageOrderValue: data.orders > 0 ? data.spent / data.orders : 0
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit)
}

export const getRevenueReport = async (): Promise<{ totalRevenue: number; totalOrders: number; averageOrderValue: number }> => {
  const { data: orders, error } = await getSupabase()
    .from('orders')
    .select('*')
    .neq('status', 'cancelled')

  if (error) throw error

  let totalRevenue = 0
  const totalOrders = orders?.length || 0

  orders?.forEach((order: Order) => {
    totalRevenue += order.total
  })

  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  return { totalRevenue, totalOrders, averageOrderValue }
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
