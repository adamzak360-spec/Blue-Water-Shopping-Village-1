export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string // This will be the cover image
  gallery_urls?: string[] // Additional images
  stock_quantity: number
  low_stock_threshold?: number
  status: 'active' | 'inactive' | 'out-of-stock'
  created_at: string
  updated_at: string
  average_rating?: number
  review_count?: number
}

export interface Review {
  id: string
  product_id: string
  customer_name: string
  rating: number
  title?: string
  message: string
  status: 'pending' | 'approved' | 'hidden'
  created_at: string
}

export interface ProductFormData {
  name: string
  description: string
  price: string
  category: string
  stock_quantity: string
  status: 'active' | 'inactive' | 'out-of-stock'
  image: File | null // Primary image
  gallery_images: File[] // Additional images
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
  paid_at?: string
  transaction_id?: string
  created_at?: string
}
