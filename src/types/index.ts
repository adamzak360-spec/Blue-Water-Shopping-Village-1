export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  stock_quantity: number
  low_stock_threshold?: number
  status: 'active' | 'inactive' | 'out-of-stock'
  created_at: string
  updated_at: string
}

export interface ProductFormData {
  name: string
  description: string
  price: string
  category: string
  stock_quantity: string
  status: 'active' | 'inactive' | 'out-of-stock'
  image: File | null
}

export type DashboardStats = {
  total: number
  active: number
  outOfStock: number
}

export type ProductStatus = Product['status']

export interface CartItem extends Product {
  quantity: number
}

export interface CustomerProfile {
  id: string
  full_name?: string
  phone_number?: string
  delivery_address?: string
  city?: string
  region?: string
  created_at?: string
  updated_at?: string
}

export interface Order {
  id?: string
  user_id?: string
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  city: string
  region: string
  notes?: string
  items: CartItem[]
  subtotal: number
  delivery_fee: number
  total: number
  status: 'pending' | 'confirmed' | 'processing' | 'out-of-delivery' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  payment_method?: string
  paystack_reference?: string
  amount_paid?: number
  payment_date?: string
  created_at?: string
}
