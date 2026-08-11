export interface ProductSize {
  size: string
  stock: number
}

export interface ProductVariant {
  id: string
  product_id: string
  variant_type: string
  variant_value: string
  stock_quantity: number
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface Currency {
  code: string
  name: string
  symbol: string
  is_active: boolean
}

export interface Country {
  code: string
  name: string
  currency_code: string
  status: 'COMING_SOON' | 'PAYMENTS_ONLY' | 'FULLY_SUPPORTED' | 'DISABLED'
  payment_provider?: string
  payments_enabled: boolean
  payouts_enabled: boolean
  identity_verification_enabled: boolean
  business_verification_enabled: boolean
  store_enabled: boolean
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency?: string
  category: string
  image_url: string
  gallery_urls?: string[]
  video_urls?: string[]
  stock_quantity: number
  low_stock_threshold?: number
  status: 'active' | 'inactive' | 'out-of-stock'
  created_at: string
  updated_at: string
  // Multi-store scoping
  business_id?: string
  average_rating?: number
  review_count?: number
  // Extended fields
  brand?: string
  original_price?: number
  discount_percentage?: number
  sku?: string
  product_code?: string
  condition?: string
  material?: string
  colour?: string
  weight?: string
  dimensions?: string
  warranty?: string
  specifications?: any
  features?: string
  // Size system
  has_sizes?: boolean
  sizes?: ProductSize[]
  variants?: ProductVariant[]
  // Delivery Fees (matching actual database columns)
  delivery_fee_tamale?: number
  delivery_fee_greater_accra?: number  // Used for STC Transport
  delivery_fee_lesser_accra?: number   // Used for VIP Transport
  delivery_fee_dhl?: number            // Used for OA Transport
  delivery_fee_ups?: number            // Used for VVIP Transport
  delivery_fee_fedex?: number
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
  image: File | null
  gallery_images: File[]
  videos: File[]
  existingVideoUrls: string[]
  // Extended fields
  brand?: string
  original_price?: string
  discount_percentage?: string
  sku?: string
  product_code?: string
  condition?: string
  material?: string
  colour?: string
  weight?: string
  dimensions?: string
  warranty?: string
  specifications?: any
  features?: string
  // Size system
  has_sizes?: boolean
  sizes?: ProductSize[]
  variants?: ProductVariant[]
  // Delivery Fees (matching actual database columns)
  delivery_fee_tamale?: string
  delivery_fee_greater_accra?: string  // Used for STC Transport
  delivery_fee_lesser_accra?: string   // Used for VIP Transport
  delivery_fee_dhl?: string            // Used for OA Transport
  delivery_fee_ups?: string            // Used for VVIP Transport
  delivery_fee_fedex?: string
}

export type DashboardStats = {
  total: number
  active: number
  outOfStock: number
}

export type ProductStatus = Product['status']

export interface CartItem extends Product {
  quantity: number
  selected_size?: string
}

export type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'

export interface IdentityVerification {
  id: string
  user_id: string
  id_type: 'passport' | 'national_id' | 'driver_license'
  id_number?: string
  id_image_front_url: string
  id_image_back_url?: string
  status: VerificationStatus
  rejection_reason?: string
  verified_at?: string
  verified_by?: string
  created_at?: string
  updated_at?: string
}

export interface CustomerProfile {
  id: string
  full_name?: string
  middle_name?: string
  phone_number?: string
  country_code?: string
  currency_code?: string
  delivery_address?: string
  digital_address?: string
  city?: string
  region?: string
  profile_picture_url?: string
  identity_status?: VerificationStatus
  identity_verification_status?: string // Legacy field
  role?: 'admin' | 'seller' | 'customer'
  created_at?: string
  updated_at?: string
}

export type DeliveryConfirmation = 'PENDING' | 'CONFIRMED' | 'NOT_RECEIVED' | 'DISPUTED'
export type PayoutStatus = 'HELD' | 'ELIGIBLE' | 'QUEUED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REVERSED'

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
  status: 'pending' | 'approved' | 'processing' | 'ready-for-pickup' | 'out-for-delivery' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed'
  payment_method?: string
  paystack_reference?: string
  amount_paid?: number
  payment_date?: string
  paid_at?: string
  transaction_id?: string
  delivery_method?: string
  delivery_area?: string
  delivery_currency?: string
  currency?: string
  country_code?: string
  source?: string
  business_id?: string
  created_at?: string
  customer_delivery_confirmation?: DeliveryConfirmation
  customer_delivery_confirmation_at?: string
  customer_delivery_confirmation_reason?: string
  admin_delivery_confirmation?: boolean
  admin_delivery_confirmation_at?: string
  admin_delivery_confirmation_by?: string
  admin_delivery_confirmation_notes?: string
  payout_status?: PayoutStatus
  payout_id?: string
  seller_payout_amount_minor?: number
  payout_currency?: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'order_update' | 'promotion'
  is_read: boolean
  order_id?: string
  created_at: string
}
