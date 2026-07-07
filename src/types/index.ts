export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  stock_quantity: number
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
