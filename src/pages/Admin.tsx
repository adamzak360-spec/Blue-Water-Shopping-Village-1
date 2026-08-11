import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getBusinessByOwner, getAllBusinessesByOwner, updateBusinessProfile, uploadBusinessAsset, type Business } from '../services/businessService'
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  uploadProductVideo,
  validateVideoFile,
  getDashboardStats,
  getProductVariants,
  syncProductVariants,
} from '../services/productService'
import {
  getAllOrders,
  updateOrderStatus,
} from '../services/orderService'
import {
  getAllReviews,
  updateReviewStatus,
  deleteReview,
} from '../services/reviewService'
import {
  exportOrdersCSV,
  exportProductsCSV,
  exportCustomersCSV,
} from '../services/adminAnalyticsService'
import { testEmailSending } from '../api/emailNotificationHandler'
import type { Product, DashboardStats, Order, Review, ProductVariant } from '../types'
import { formatCurrency } from '../utils/currency'
import { lazy, Suspense } from 'react'
import { BusinessVerificationForm } from '../components/BusinessVerificationForm'
import { PayoutProfileForm } from '../components/PayoutProfileForm'
import './Admin.css'

  // Lazy load admin sub-components for better performance
  const InventoryManagement = lazy(() => import('../components/InventoryManagement'))
  const AdminAnalytics = lazy(() => import('../components/AdminAnalytics'))
  const FinancialReports = lazy(() => import('../components/FinancialReports'))
  const SupplierManagement = lazy(() => import('../components/SupplierManagement'))
  const RegisteredSellerManagement = lazy(() => import('../components/RegisteredSellerManagement'))
  const POS = lazy(() => import('./POS'))
  const SellerPayouts = lazy(() => import('../components/SellerPayouts'))

  // Prefetch functions for near-instant transitions
  const prefetchInventory = () => import('../components/InventoryManagement')
  const prefetchAnalytics = () => import('../components/AdminAnalytics')
  const prefetchReports = () => import('../components/FinancialReports')
  const prefetchSuppliers = () => import('../components/SupplierManagement')
  const prefetchRegisteredSellers = () => import('../components/RegisteredSellerManagement')
  const prefetchPOS = () => import('./POS')
  const prefetchSellerPayouts = () => import('../components/SellerPayouts')

type AdminView = 'dashboard' | 'products' | 'add' | 'edit' | 'orders' | 'inventory' | 'analytics' | 'reports' | 'suppliers' | 'reviews' | 'registered-sellers' | 'pos' | 'payouts' | 'settings' | 'marketplace'

interface ProductFormErrors {
  name?: string
  description?: string
  price?: string
  category?: string
  stock_quantity?: string
}

const defaultFormState = {
  name: '',
  description: '',
  price: '',
  category: '',
  currency: 'GHS',
  stock_quantity: '',
  status: 'active' as 'active' | 'inactive' | 'out-of-stock',
  image: null as File | null,
  existingImageUrl: '',
  galleryImages: [] as File[],
  existingGalleryUrls: [] as string[],
  videos: [] as File[],
  existingVideoUrls: [] as string[],
  videoUploadErrors: {} as Record<number, string>,
  has_sizes: false,
  variants: [] as Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>[],
  // Delivery Fees (must match database column names)
  // Tamale, STC (greater_accra), VIP (lesser_accra), OA (dhl), VVIP (ups), FedEx
  delivery_fee_tamale: '',
  delivery_fee_greater_accra: '',
  delivery_fee_lesser_accra: '',
  delivery_fee_dhl: '',
  delivery_fee_ups: '',
  delivery_fee_fedex: '',
  specifications: [] as { label: string; value: string }[],
}

export default function Admin() {
  const { user, signOut, role } = useAuth()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<Business | null>(null)
  const [view, setView] = useState<AdminView>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, outOfStock: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [reviewSearchTerm, setReviewSearchTerm] = useState('')
  const [orderFilterStatus, setOrderFilterStatus] = useState('')
  const [orderFilterSource, setOrderFilterSource] = useState('')
  const [reviewFilterProduct, setReviewFilterProduct] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(defaultFormState)
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const [sellerBusinessIds, setSellerBusinessIds] = useState<string[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [ordersError, setOrdersError] = useState('')
  const [reviewsError, setReviewsError] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [isUpdatingStore, setIsUpdatingStore] = useState(false)
  const [storeSettings, setStoreSettings] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    location: '',
  })

  // Suppress unused variable warnings for build
  console.log('Loading states:', { productsLoading, ordersLoading, reviewsLoading })
  console.log('Error states:', { ordersError, reviewsError })

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    
    setIsLoading(true)
    setError('')
    
    let currentBusiness = business
    if (!currentBusiness) {
      try {
        let b: Business | null = null;
        if (role === 'seller') {
          b = await getBusinessByOwner(user.id)
        } else if (role === 'admin') {
          // Admins manage the default marketplace business
          const { data } = await supabase!.from('businesses').select('*').eq('id', '00000000-0000-0000-0000-000000000001').single();
          b = data as Business;
        }

        if (b) {
          setBusiness(b)
          currentBusiness = b
          setStoreSettings({
            name: b.name || '',
            description: b.description || '',
            contact_email: b.contact_email || '',
            contact_phone: b.contact_phone || '',
            location: b.location || '',
          })
        }
      } catch (err) {
        console.error('Error fetching business:', err)
      }
    }

    // Sellers can own multiple businesses: aggregate orders (and stats)
    // across every store they own so nothing is hidden from them.
    if (role === 'seller') {
      try {
        const owned = await getAllBusinessesByOwner(user.id)
        setSellerBusinessIds(owned.map((b) => b.id))
      } catch (err) {
        console.error('Error fetching owned businesses:', err)
      }
    } else {
      setSellerBusinessIds([])
    }

    const businessId = role === 'admin' ? undefined : currentBusiness?.id
    
    // Load profile for onboarding status
    try {
      const { data: profileData } = await supabase!
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)
    } catch (err) {
      console.error('Error loading profile:', err)
    }

    // Load products and stats independently. Never allow an unresolved seller
    // business to fall through to the global marketplace query.
    setProductsLoading(true)
    setProductsError('')
    try {
      if (role === 'seller' && !businessId) {
        setProducts([])
        setStats({ total: 0, active: 0, outOfStock: 0 })
      } else {
        const [allProducts, statsData] = await Promise.all([
          getAllProducts(businessId),
          getDashboardStats(businessId)
        ])
        setProducts(allProducts)
        setStats(statsData)
      }
      setProductsError('')
    } catch (err) {
      console.error('Error loading products/stats:', err)
          setProductsError('Failed to load products')
      setProducts([])
      setStats({ total: 0, active: 0, outOfStock: 0 })
    } finally {
      setProductsLoading(false)
    }

    // Load orders independently
    setOrdersLoading(true)
    setOrdersError('')
    try {
      const ordersData = await getAllOrders(businessId, role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined)
      setOrders(ordersData)
      setOrdersError('')
    } catch (err) {
      console.error('Error loading orders:', err)
      setOrdersError('Failed to load orders')
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }

    // Load reviews independently
    setReviewsLoading(true)
    setReviewsError('')
    try {
          const reviewsData = await getAllReviews()
      setReviews(reviewsData)
      setReviewsError('')
    } catch (err) {
      console.error('Error loading reviews:', err)
      setReviewsError('Failed to load reviews')
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }

    setIsLoading(false)
  }, [user, role, business])

  useEffect(() => {
    loadData()
  }, [user, role, business])

  const businessId = role === 'admin' ? undefined : business?.id

  const filteredReviewsByStore = reviews.filter(review => {
    // Seller activity cards stay at zero until at least one seller-owned order exists.
    if (role === 'seller' && orders.length === 0) return false
    if (!businessId) return true
    const businessProductIds = new Set(products.map(p => p.id))
    return businessProductIds.has(review.product_id)
  })

  const validateForm = (): boolean => {
    const errors: ProductFormErrors = {}
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required'
    if (!formData.category.trim()) errors.category = 'Category is required'
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) errors.stock_quantity = 'Valid stock quantity is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      let imageUrl = formData.existingImageUrl
      if (formData.image) {
        imageUrl = await uploadProductImage(formData.image)
      }

      // Upload gallery images
      const newGalleryUrls = await Promise.all(
        formData.galleryImages.map(file => uploadProductImage(file))
      )
      
      const gallery_urls = [...formData.existingGalleryUrls, ...newGalleryUrls]

      // Upload product videos
      const newVideoUrls = await Promise.all(
        formData.videos.map(file => uploadProductVideo(file))
      )
      
      const video_urls = [...formData.existingVideoUrls, ...newVideoUrls]

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        stock_quantity: parseInt(formData.stock_quantity),
        status: formData.status,
        image_url: imageUrl,
        gallery_urls: gallery_urls,
        video_urls: video_urls,
        currency: formData.currency,
        has_sizes: formData.has_sizes,
        // Delivery Fees (must match database column names)
        // Tamale, STC (greater_accra), VIP (lesser_accra), OA (dhl), VVIP (ups), FedEx
        delivery_fee_tamale: formData.delivery_fee_tamale ? parseFloat(formData.delivery_fee_tamale) : 0,
        delivery_fee_greater_accra: formData.delivery_fee_greater_accra ? parseFloat(formData.delivery_fee_greater_accra) : 0,
        delivery_fee_lesser_accra: formData.delivery_fee_lesser_accra ? parseFloat(formData.delivery_fee_lesser_accra) : 0,
        delivery_fee_dhl: formData.delivery_fee_dhl ? parseFloat(formData.delivery_fee_dhl) : 0,
        delivery_fee_ups: formData.delivery_fee_ups ? parseFloat(formData.delivery_fee_ups) : 0,
        delivery_fee_fedex: formData.delivery_fee_fedex ? parseFloat(formData.delivery_fee_fedex) : 0,
        specifications: formData.specifications,
        business_id: business?.id
      }

      let savedProduct: Product
      if (view === 'edit' && editProduct) {
        savedProduct = await updateProduct(editProduct.id, productData)
        if (formData.has_sizes) {
          await syncProductVariants(editProduct.id, formData.variants)
        }
        showNotification('Product updated successfully!')
      } else {
        savedProduct = await createProduct(productData)
        if (formData.has_sizes) {
          await syncProductVariants(savedProduct.id, formData.variants)
        }
        showNotification('Product added successfully!')
      }

      setFormData(defaultFormState)
      setView('products')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await deleteProduct(id)
      showNotification(`"${name}" has been deleted.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleEdit = async (product: Product) => {
    setEditProduct(product)
    
    let variants: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>[] = []
    if (product.has_sizes) {
      try {
        const variantData = await getProductVariants(product.id)
        variants = variantData.map(v => ({
          product_id: v.product_id,
          variant_type: v.variant_type,
          variant_value: v.variant_value,
          stock_quantity: v.stock_quantity,
          active: v.active
        }))
      } catch (err) {
        console.error('Failed to load variants:', err)
      }
    }

    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      currency: product.currency || 'GHS',
      stock_quantity: product.stock_quantity.toString(),
      status: product.status,
      image: null,
      existingImageUrl: product.image_url,
      galleryImages: [],
      existingGalleryUrls: product.gallery_urls || [],
      videos: [],
      existingVideoUrls: product.video_urls || [],
      videoUploadErrors: {},
      has_sizes: product.has_sizes || false,
      variants: variants,
      delivery_fee_tamale: (product.delivery_fee_tamale || 0).toString(),
      delivery_fee_greater_accra: (product.delivery_fee_greater_accra || 0).toString(),
      delivery_fee_lesser_accra: (product.delivery_fee_lesser_accra || 0).toString(),
      delivery_fee_dhl: (product.delivery_fee_dhl || 0).toString(),
      delivery_fee_ups: (product.delivery_fee_ups || 0).toString(),
      delivery_fee_fedex: (product.delivery_fee_fedex || 0).toString(),
      specifications: Array.isArray(product.specifications) ? product.specifications : [],
    })
    setView('edit')
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map(p => p.category))]

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.customer_name?.toLowerCase() || '').includes(orderSearchTerm.toLowerCase()) ||
      (order.customer_email?.toLowerCase() || '').includes(orderSearchTerm.toLowerCase()) ||
      (order.id?.toLowerCase() || '').includes(orderSearchTerm.toLowerCase())
    const matchesStatus = !orderFilterStatus || order.status === orderFilterStatus
    const matchesSource = !orderFilterSource || order.source === orderFilterSource
    return matchesSearch && matchesStatus && matchesSource
  })

  const filteredReviews = filteredReviewsByStore.filter(review => {
    const product = products.find(p => p.id === review.product_id)
    const productName = product ? product.name.toLowerCase() : ''
    const matchesSearch = 
      review.customer_name.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
      review.message.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
      productName.includes(reviewSearchTerm.toLowerCase())
    const matchesProduct = !reviewFilterProduct || review.product_id === reviewFilterProduct
    return matchesSearch && matchesProduct
  })

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) {
        setError('Order not found')
        return
      }
      await updateOrderStatus(orderId, newStatus)
      showNotification('Order status updated successfully!')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleReviewStatusUpdate = async (reviewId: string, status: 'approved' | 'hidden') => {
    try {
      await updateReviewStatus(reviewId, status)
      showNotification(`Review ${status} successfully!`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review status')
    }
  }

  const handleReviewDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await deleteReview(reviewId)
      showNotification('Review deleted successfully!')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
    }
  }

  const handleTestEmail = async () => {
    if (!user?.email) return
    setIsTestingEmail(true)
    try {
      const result = await testEmailSending(user.email)
      if (result.success) {
        showNotification(result.message, 'success')
      } else {
        setError(result.error || result.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setIsTestingEmail(false)
    }
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExportOrders = async () => {
    try {
      const csv = exportOrdersCSV(orders)
      downloadCSV(csv, `orders-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Orders exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export orders')
    }
  }

  const handleExportProducts = async () => {
    try {
      const csv = await exportProductsCSV(products)
      downloadCSV(csv, `products-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Products exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export products')
    }
  }

  const handleExportCustomers = async () => {
    try {
      const csv = await exportCustomersCSV()
      downloadCSV(csv, `customers-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Customers exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export customers')
    }
  }

  if (isLoading && products.length === 0) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}

      {/* Error Banner - Only show critical errors */}
      {(error || productsError) && (
        <div className="error-banner">
          <span>{error || productsError}</span>
          <button onClick={() => { setError(''); setProductsError(''); }}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="admin-header animate-fade-in">
        <div className="header-title-group">
          <h2>{role === 'seller' ? 'Seller Dashboard' : 'Admin Dashboard'}</h2>
          <p className="admin-subtitle">
            {role === 'seller'
              ? (business ? `Manage your store: ${business.name}` : 'Manage your store')
              : 'Manage your marketplace operations'}
          </p>
        </div>
        <div className="admin-user-info">
          <div className="user-badge">
            <span className="user-email">{user?.email}</span>
            <span className="badge badge-primary">{role === 'seller' ? 'Seller' : 'Admin'}</span>
          </div>
          {role === 'seller' && business && (
            <a href={`/store/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
              Visit Public Store
            </a>
          )}
          <button 
            onClick={handleTestEmail} 
            className="btn-secondary btn-sm" 
            disabled={isTestingEmail}
          >
            {isTestingEmail ? 'Testing...' : 'Test Email'}
          </button>
          <button onClick={() => signOut()} className="btn-delete btn-sm">Sign Out</button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${view === 'products' ? 'active' : ''}`}
          onClick={() => { setView('products'); setEditProduct(null); }}
        >
          Products ({products.length})
        </button>
        <button
          className={`tab ${view === 'add' ? 'active' : ''}`}
          onClick={() => { setView('add'); setFormData(defaultFormState); setFormErrors({}); }}
        >
          + Add Product
        </button>
        <button
          className={`tab ${view === 'orders' ? 'active' : ''}`}
          onClick={() => setView('orders')}
        >
          Orders ({orders.length})
        </button>
        <button
          className={`tab ${view === 'reviews' ? 'active' : ''}`}
          onClick={() => setView('reviews')}
        >
          Reviews ({filteredReviewsByStore.length})
        </button>
        <button
          className={`tab ${view === 'inventory' ? 'active' : ''}`}
          onClick={() => setView('inventory')}
          onMouseEnter={prefetchInventory}
        >
          Inventory
        </button>
        <button
          className={`tab ${view === 'analytics' ? 'active' : ''}`}
          onClick={() => setView('analytics')}
          onMouseEnter={prefetchAnalytics}
        >
          Analytics
        </button>
        <button
          className={`tab ${view === 'reports' ? 'active' : ''}`}
          onClick={() => setView('reports')}
          onMouseEnter={prefetchReports}
        >
          Reports
        </button>
        <button
          className={`tab ${view === 'suppliers' ? 'active' : ''}`}
          onClick={() => setView('suppliers')}
          onMouseEnter={prefetchSuppliers}
        >
          Suppliers
        </button>
        {role === 'admin' && (
          <>
            <button
              className={`tab ${view === 'registered-sellers' ? 'active' : ''}`}
              onClick={() => setView('registered-sellers')}
              onMouseEnter={prefetchRegisteredSellers}
            >
              Registered Sellers
            </button>
            <button
              className={`tab ${view === 'marketplace' ? 'active' : ''}`}
              onClick={() => setView('marketplace')}
            >
              🌍 Marketplace Settings
            </button>
          </>
        )}
        <button
          className={`tab ${view === 'payouts' ? 'active' : ''}`}
          onClick={() => setView('payouts')}
          onMouseEnter={prefetchSellerPayouts}
        >
          Seller Payouts
        </button>
        <button
          className={`tab ${view === 'pos' ? 'active' : ''}`}
          onClick={() => setView('pos')}
          onMouseEnter={prefetchPOS}
        >
          🛒 POS
        </button>
        <button
          className={`tab ${view === 'settings' ? 'active' : ''}`}
          onClick={() => setView('settings')}
        >
          ⚙️ Store Settings
        </button>
      </div>

      <Suspense fallback={<div className="admin-loading">Loading view...</div>}>
        {/* Analytics View */}
        {view === 'analytics' && <AdminAnalytics businessIds={role === 'seller' ? sellerBusinessIds : undefined} />}

        {/* Inventory Management View */}
        {view === 'inventory' && <InventoryManagement businessIds={role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined} />}

        {/* Financial Reports View */}
        {view === 'reports' && <FinancialReports businessIds={role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined} />}

        {/* Supplier Management View */}
        {view === 'suppliers' && (
          <SupplierManagement
            productIds={role === 'seller'
              ? (orders.length > 0 ? products.map((product) => product.id) : [])
              : undefined}
          />
        )}

        {/* Registered Sellers Management View */}
        {view === 'registered-sellers' && role === 'admin' && <RegisteredSellerManagement />}

        {/* Seller Payouts View */}
        {view === 'payouts' && <SellerPayouts businessIds={role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined} />}

        {/* POS View */}
        {view === 'pos' && <POS businessIds={role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined} />}

        {/* Marketplace Settings View */}
        {view === 'marketplace' && role === 'admin' && (
          <div className="marketplace-settings-content animate-fade-in">
            <div className="section-title-wrapper">
              <h2 className="section-title">Global Marketplace Settings</h2>
              <p>Manage supported countries, currencies, and platform-wide configurations.</p>
            </div>

            <div className="settings-grid">
              <div className="settings-card">
                <h3>Supported Countries</h3>
                <div className="countries-list">
                  <p>Configure which countries can access the marketplace.</p>
                  <button className="btn-secondary btn-sm" onClick={() => alert('Country management coming soon!')}>+ Add Country</button>
                </div>
              </div>
              <div className="settings-card">
                <h3>Platform Commissions</h3>
                <form className="admin-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-group">
                    <label>Default Commission (BPS)</label>
                    <input type="number" defaultValue="500" />
                    <small>500 BPS = 5%</small>
                  </div>
                  <button className="btn-primary">Update Commission</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Store Settings View */}
        {view === 'settings' && (business || role === 'admin') && (
          <div className="store-settings-content animate-fade-in">
            <div className="section-title-wrapper">
              <h2 className="section-title">Store Settings</h2>
              <p>Customize your storefront and contact information.</p>
            </div>

            <div className="settings-grid">
              <div className="settings-card">
                <h3>Store Profile</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsUpdatingStore(true);
                  try {
                    if (business) await updateBusinessProfile(business.id, storeSettings);
                    showNotification('Store profile updated!');
                    loadData();
                  } catch (err: any) {
                    setError(err.message);
                  } finally {
                    setIsUpdatingStore(false);
                  }
                }} className="admin-form">
                  <div className="form-group">
                    <label>Store Name</label>
                    <input 
                      type="text" 
                      value={storeSettings.name}
                      onChange={e => setStoreSettings({...storeSettings, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      value={storeSettings.description}
                      onChange={e => setStoreSettings({...storeSettings, description: e.target.value})}
                      rows={4}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Contact Email</label>
                      <input 
                        type="email" 
                        value={storeSettings.contact_email}
                        onChange={e => setStoreSettings({...storeSettings, contact_email: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Phone</label>
                      <input 
                        type="tel" 
                        value={storeSettings.contact_phone}
                        onChange={e => setStoreSettings({...storeSettings, contact_phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input 
                      type="text" 
                      value={storeSettings.location}
                      onChange={e => setStoreSettings({...storeSettings, location: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={isUpdatingStore}>
                    {isUpdatingStore ? 'Updating...' : 'Save Changes'}
                  </button>
                </form>
              </div>

              <div className="settings-card">
                <h3>Payout Settings</h3>
                {user && business && (
                  <PayoutProfileForm 
                    sellerId={user.id} 
                    storeId={business.id} 
                    onSuccess={() => showNotification('Payout profile updated!')}
                  />
                )}
              </div>

              <div className="settings-card">
                <h3>Branding Assets</h3>
                <div className="branding-upload-group">
                  <label>Store Logo</label>
                  <div className="asset-preview-container">
                    {business?.logo_url ? <img src={business.logo_url} alt="Logo" className="logo-preview" /> : <div className="placeholder-preview">No Logo</div>}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0] && business) {
                        try {
                          setIsLoading(true);
                          const url = await uploadBusinessAsset(e.target.files[0], business.id, 'logo');
                          await updateBusinessProfile(business.id, { logo_url: url });
                          showNotification('Logo updated!');
                          loadData();
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }} />
                  </div>
                </div>

                <div className="branding-upload-group" style={{ marginTop: '2rem' }}>
                  <label>Store Banner</label>
                  <div className="asset-preview-container banner">
                    {business?.banner_url ? <img src={business.banner_url} alt="Banner" className="banner-preview" /> : <div className="placeholder-preview">No Banner</div>}
                    <input type="file" accept="image/*" onChange={async (e) => {
                      if (e.target.files?.[0] && business) {
                        try {
                          setIsLoading(true);
                          const url = await uploadBusinessAsset(e.target.files[0], business.id, 'banner');
                          await updateBusinessProfile(business.id, { banner_url: url });
                          showNotification('Banner updated!');
                          loadData();
                        } catch (err: any) {
                          setError(err.message);
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Suspense>

      {/* Reviews Management View */}
      {view === 'reviews' && (
        <div className="reviews-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search reviews by customer, message or product..."
              value={reviewSearchTerm}
              onChange={(e) => setReviewSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={reviewFilterProduct}
              onChange={(e) => setReviewFilterProduct(e.target.value)}
              className="filter-select"
            >
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="empty-state">
              <h3>{filteredReviewsByStore.length === 0 ? 'No reviews yet' : 'No reviews match your search'}</h3>
              <p>{filteredReviewsByStore.length === 0 ? 'Reviews will appear here once customers submit them.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="reviews-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map(review => {
                    const product = products.find(p => p.id === review.product_id)
                    return (
                      <tr key={review.id}>
                        <td>{product ? product.name : 'Unknown Product'}</td>
                        <td>{review.customer_name}</td>
                        <td>
                          <div style={{ color: '#fbbf24' }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '300px' }}>
                            {review.title && <div style={{ fontWeight: 600 }}>{review.title}</div>}
                            <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>{review.message}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              {new Date(review.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${review.status}`}>
                            {review.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {review.status !== 'approved' && (
                            <button
                              onClick={() => handleReviewStatusUpdate(review.id, 'approved')}
                              className="btn-edit"
                              style={{ backgroundColor: '#16a34a' }}
                            >
                              Approve
                            </button>
                          )}
                          {review.status !== 'hidden' && (
                            <button
                              onClick={() => handleReviewStatusUpdate(review.id, 'hidden')}
                              className="btn-edit"
                              style={{ backgroundColor: '#6b7280' }}
                            >
                              Hide
                            </button>
                          )}
                          <button
                            onClick={() => handleReviewDelete(review.id)}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Overview */}
      {view === 'dashboard' && (
        <div className="dashboard-content">
          {role === 'seller' && (
            <div className="onboarding-checklist animate-fade-in">
              <h3>🚀 Welcome to Reliable! Let's get you ready to sell.</h3>
              <div className="checklist-items">
                <div className={`checklist-item ${profile?.identity_status === 'approved' ? 'completed' : ''}`}>
                  <div className="check-icon">{profile?.identity_status === 'approved' ? '✅' : '⭕'}</div>
                  <div className="check-text">
                    <strong>Verify your Identity</strong>
                    <p>Required for security and payouts.</p>
                    {profile?.identity_status !== 'approved' && (
                      <button onClick={() => navigate('/customer/profile')} className="btn-sm btn-secondary">Go to Verification</button>
                    )}
                  </div>
                </div>
                <div className={`checklist-item ${products.length > 0 ? 'completed' : ''}`}>
                  <div className="check-icon">{products.length > 0 ? '✅' : '⭕'}</div>
                  <div className="check-text">
                    <strong>Add your first Product</strong>
                    <p>Start listing your items for the world to see.</p>
                    {products.length === 0 && (
                      <button onClick={() => setView('add')} className="btn-sm btn-secondary">Add Product</button>
                    )}
                  </div>
                </div>
                <div className={`checklist-item ${business?.logo_url ? 'completed' : ''}`}>
                  <div className="check-icon">{business?.logo_url ? '✅' : '⭕'}</div>
                  <div className="check-text">
                    <strong>Brand your Store</strong>
                    <p>Add a logo and banner to stand out.</p>
                    {!business?.logo_url && (
                      <p><small>Go to Store Settings to upload assets.</small></p>
                    )}
                  </div>
                </div>
                <div className={`checklist-item ${business?.verification_status === 'approved' ? 'completed' : ''}`}>
                  <div className="check-icon">{business?.verification_status === 'approved' ? '✅' : '⭕'}</div>
                  <div className="check-text">
                    <strong>Verify your Business</strong>
                    <p>Unlock higher limits and a verified badge.</p>
                    {business?.verification_status !== 'approved' && (
                      <button onClick={() => setView('dashboard')} className="btn-sm btn-secondary">Submit Documents</button>
                    )}
                  </div>
                </div>
              </div>

              {business && business.verification_status !== 'approved' && (
                <div className="verification-form-overlay animate-fade-in" style={{ marginTop: '2rem' }}>
                  <BusinessVerificationForm business={business} onSuccess={loadData} />
                </div>
              )}
            </div>
          )}

          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon">&#128230;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Products</span>
              </div>
            </div>
            <div className="stat-card stat-active">
              <div className="stat-icon">&#9989;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.active}</span>
                <span className="stat-label">Active Products</span>
              </div>
            </div>
            <div className="stat-card stat-out-of-stock">
              <div className="stat-icon">&#9888;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.outOfStock}</span>
                <span className="stat-label">Out of Stock</span>
              </div>
            </div>
          </div>

          <div className="recent-products">
            <h3>Recent Products</h3>
            {products.length === 0 ? (
              <div className="empty-state">
                <h3>No products yet</h3>
                <p>Start by adding your first product.</p>
                <button onClick={() => setView('add')} className="btn-primary">
                  Add Product
                </button>
              </div>
            ) : (
              <div className="products-table">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 5).map(product => (
                      <tr key={product.id}>
                        <td className="product-image-cell">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="product-thumb" />
                          ) : (
                            <div className="product-thumb-placeholder">No image</div>
                          )}
                        </td>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.stock_quantity}</td>
                        <td>
                          <span className={`status-badge ${product.status}`}>
                            {product.status === 'active' ? 'Active' : product.status === 'out-of-stock' ? 'Out of Stock' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products Management */}
      {view === 'products' && (
        <div className="products-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button onClick={handleExportProducts} className="btn-export" title="Export products as CSV">
              Export Products
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>{products.length === 0 ? 'No products yet' : 'No products match your search'}</h3>
              <p>{products.length === 0 ? 'Start by adding your first product.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td className="product-image-cell">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="product-thumb" />
                        ) : (
                          <div className="product-thumb-placeholder">No image</div>
                        )}
                      </td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock_quantity}</td>
                      <td>
                        <span className={`status-badge ${product.status}`}>
                          {product.status === 'active' ? 'Active' : product.status === 'out-of-stock' ? 'Out of Stock' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleEdit(product)}
                          className="btn-edit"
                          title="Edit product"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="btn-delete"
                          title="Delete product"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Orders Management */}
      {view === 'orders' && (
        <div className="orders-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search orders by customer or ID..."
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={orderFilterStatus}
              onChange={(e) => setOrderFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="ready-for-pickup">Ready for Pickup</option>
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={orderFilterSource}
              onChange={(e) => setOrderFilterSource(e.target.value)}
              className="filter-select"
            >
              <option value="">All Sources</option>
              <option value="ONLINE">Online</option>
              <option value="POS">POS</option>
            </select>
            <button onClick={handleExportOrders} className="btn-export" title="Export orders as CSV">
              Export Orders
            </button>
            <button onClick={handleExportCustomers} className="btn-export" title="Export customers as CSV">
              Export Customers
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <h3>{orders.length === 0 ? 'No orders yet' : 'No orders match your search'}</h3>
              <p>{orders.length === 0 ? 'Orders will appear here once customers place them.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td className="order-id-cell">
                        <span className="order-id" title={order.id}>
                          {order.id?.substring(0, 8)}...
                        </span>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{order.customer_name}</div>
                          <div className="customer-email">{order.customer_email}</div>
                        </div>
                      </td>
                      <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>{formatCurrency(order.total, order.payout_currency || 'GHS')}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id!, e.target.value as Order['status'])}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="processing">Processing</option>
                          <option value="ready-for-pickup">Ready for Pickup</option>
                          <option value="out-for-delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleViewOrder(order)}
                          className="btn-view"
                          title="View order details"
                          aria-haspopup="dialog"
                          aria-label={`View details for order ${order.id?.substring(0, 8) || ''}`}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => setShowOrderModal(false)}
        >
          <div
            className="modal-content order-details-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-details-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 id="admin-order-details-title">Order Details</h3>
              <button className="close-modal" onClick={() => setShowOrderModal(false)}>&times;</button>
            </div>
            
            <div className="order-details-grid">
              {/* Customer Section */}
              <div className="details-section">
                <h4>Customer Information</h4>
                <div className="details-card">
                  <div className="detail-item">
                    <span className="detail-label">Full Name:</span>
                    <span className="detail-value">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedOrder.customer_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedOrder.delivery_address}, {selectedOrder.city}, {selectedOrder.region}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Type:</span>
                    <span className={`detail-value type-badge ${selectedOrder.user_id ? 'registered' : 'guest'}`}>
                      {selectedOrder.user_id ? 'Registered User' : 'Guest'}
                    </span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="detail-item notes">
                      <span className="detail-label">Notes:</span>
                      <p className="detail-value">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary Section */}
              <div className="details-section">
                <h4>Order Information</h4>
                <div className="details-card">
                  <div className="detail-item">
                    <span className="detail-label">Order ID:</span>
                    <span className="detail-value monospace">{selectedOrder.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">
                      {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge status-${selectedOrder.status}`}>
                      {selectedOrder.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="detail-item summary-row">
                    <span className="detail-label">Subtotal:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.subtotal, selectedOrder.payout_currency || 'GHS')}</span>
                  </div>
                  <div className="detail-item summary-row">
                    <span className="detail-label">Delivery Fee:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.delivery_fee, selectedOrder.payout_currency || 'GHS')}</span>
                  </div>
                  <div className="detail-item summary-row grand-total">
                    <span className="detail-label">Grand Total:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.total, selectedOrder.payout_currency || 'GHS')}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Status:</span>
                    <span className={`status-badge status-${selectedOrder.payment_status}`}>
                      {selectedOrder.payment_status?.replace('-', ' ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              {selectedOrder.payment_method && (
                <div className="details-section">
                  <h4>Payment Information</h4>
                  <div className="details-card">
                    <div className="detail-item">
                      <span className="detail-label">Payment Method:</span>
                      <span className="detail-value">{selectedOrder.payment_method}</span>
                    </div>
                    {selectedOrder.paystack_reference && (
                      <div className="detail-item">
                        <span className="detail-label">Paystack Reference:</span>
                        <span className="detail-value monospace">{selectedOrder.paystack_reference}</span>
                      </div>
                    )}
                    {selectedOrder.amount_paid && (
                      <div className="detail-item">
                        <span className="detail-label">Amount Paid:</span>
                        <span className="detail-value">{formatCurrency(selectedOrder.amount_paid)}</span>
                      </div>
                    )}
                    {selectedOrder.payment_date && (
                      <div className="detail-item">
                        <span className="detail-label">Payment Date:</span>
                        <span className="detail-value">
                          {new Date(selectedOrder.payment_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products Section */}
            <div className="details-section products-section">
              <h4>Products Ordered</h4>
              <div className="order-items-list">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="product-image-cell">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="product-thumb" />
                          ) : (
                            <div className="product-thumb-placeholder">No image</div>
                          )}
                        </td>
                        <td>
                          <div className="product-name">{item.name}</div>
                          {item.selected_size && (
                            <div className="product-variant-small">Size: <strong>{item.selected_size}</strong></div>
                          )}
                          <div className="product-id-small">{item.id}</div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price, selectedOrder.payout_currency || 'GHS')}</td>
                        <td>{formatCurrency(item.quantity * item.price, selectedOrder.payout_currency || 'GHS')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowOrderModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Form */}
      {(view === 'add' || view === 'edit') && (
        <div className="product-form-content">
          <h3>{view === 'edit' ? `Edit: ${editProduct?.name}` : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={formErrors.name ? 'error' : ''}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={formErrors.category ? 'error' : ''}
                  list="category-list"
                />
                <datalist id="category-list">
                  {categories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
                {formErrors.category && <span className="error-text">{formErrors.category}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className={formErrors.price ? 'error' : ''}
                  />
                  {formErrors.price && <span className="error-text">{formErrors.price}</span>}
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  >
                    <option value="GHS">GHS (₵)</option>
                    <option value="USD">USD ($)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className={formErrors.stock_quantity ? 'error' : ''}
                />
                {formErrors.stock_quantity && <span className="error-text">{formErrors.stock_quantity}</span>}
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              <div className="form-group full-width">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="has_sizes"
                    checked={formData.has_sizes}
                    onChange={(e) => setFormData({ ...formData, has_sizes: e.target.checked })}
                  />
                  <label htmlFor="has_sizes">This product has variants (e.g. Sizes)</label>
                </div>
              </div>

              {formData.has_sizes && (
                <div className="form-group full-width variants-section">
                  <h4>Product Variants</h4>
                  <div className="variants-grid">
                    {formData.variants.map((variant, idx) => (
                      <div key={idx} className="variant-row">
                        <div className="variant-inputs">
                          <input
                            type="text"
                            placeholder="Size (e.g. M, XL, 42)"
                            value={variant.variant_value}
                            onChange={(e) => {
                              const updated = [...formData.variants]
                              updated[idx].variant_value = e.target.value
                              setFormData({ ...formData, variants: updated })
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={variant.stock_quantity}
                            onChange={(e) => {
                              const updated = [...formData.variants]
                              updated[idx].stock_quantity = parseInt(e.target.value) || 0
                              setFormData({ ...formData, variants: updated })
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-delete-small"
                          onClick={() => {
                            const updated = [...formData.variants]
                            updated.splice(idx, 1)
                            setFormData({ ...formData, variants: updated })
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="variant-actions">
                    <button
                      type="button"
                      className="btn-add-variant"
                      onClick={() => {
                        const newVariant = {
                          product_id: editProduct?.id || '',
                          variant_type: 'size',
                          variant_value: '',
                          stock_quantity: 0,
                          active: true
                        }
                        setFormData({ ...formData, variants: [...formData.variants, newVariant] })
                      }}
                    >
                      + Add Size Variant
                    </button>
                    <div className="quick-sizes">
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(size => (
                        <button
                          key={size}
                          type="button"
                          className="btn-quick-size"
                          onClick={() => {
                            if (!formData.variants.some(v => v.variant_value === size)) {
                              const newVariant = {
                                product_id: editProduct?.id || '',
                                variant_type: 'size',
                                variant_value: size,
                                stock_quantity: 0,
                                active: true
                              }
                              setFormData({ ...formData, variants: [...formData.variants, newVariant] })
                            }
                          }}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group full-width specifications-editor-section">
                <h4>Product Specifications</h4>
                <p className="help-text">Add custom attributes like Brand, Material, Voltage, etc.</p>
                <div className="specifications-list">
                  {formData.specifications.map((spec, idx) => (
                    <div key={idx} className="spec-row">
                      <input
                        type="text"
                        placeholder="Label (e.g. Brand)"
                        value={spec.label}
                        onChange={(e) => {
                          const updated = [...formData.specifications]
                          updated[idx].label = e.target.value
                          setFormData({ ...formData, specifications: updated })
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. Reliable)"
                        value={spec.value}
                        onChange={(e) => {
                          const updated = [...formData.specifications]
                          updated[idx].value = e.target.value
                          setFormData({ ...formData, specifications: updated })
                        }}
                      />
                      <button
                        type="button"
                        className="btn-delete-small"
                        onClick={() => {
                          const updated = [...formData.specifications]
                          updated.splice(idx, 1)
                          setFormData({ ...formData, specifications: updated })
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-add-spec"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      specifications: [...formData.specifications, { label: '', value: '' }]
                    })
                  }}
                >
                  + Add Specification
                </button>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={formErrors.description ? 'error' : ''}
                  rows={4}
                />
                {formErrors.description && <span className="error-text">{formErrors.description}</span>}
              </div>

              <div className="form-group full-width">
                <label>Cover Image</label>
                <div className="image-upload-container">
                  {formData.existingImageUrl && !formData.image && (
                    <div className="current-image-preview">
                      <img src={formData.existingImageUrl} alt="Current" />
                      <span>Current Cover</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label>Gallery Images</label>
                <div className="gallery-upload-container">
                  <div className="existing-gallery">
                    {formData.existingGalleryUrls.map((url, idx) => (
                      <div key={idx} className="gallery-preview-item">
                        <img src={url} alt={`Gallery ${idx}`} />
                        <button 
                          type="button" 
                          className="remove-image"
                          onClick={() => {
                            const updated = [...formData.existingGalleryUrls]
                            updated.splice(idx, 1)
                            setFormData({ ...formData, existingGalleryUrls: updated })
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {formData.galleryImages.map((file, idx) => (
                      <div key={`new-${idx}`} className="gallery-preview-item new">
                        <img src={URL.createObjectURL(file)} alt={`New Gallery ${idx}`} />
                        <button 
                          type="button" 
                          className="remove-image"
                          onClick={() => {
                            const updated = [...formData.galleryImages]
                            updated.splice(idx, 1)
                            setFormData({ ...formData, galleryImages: updated })
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setFormData({ ...formData, galleryImages: [...formData.galleryImages, ...files] })
                    }}
                  />
                  <p className="help-text">Add more images to the product gallery</p>
                </div>
              </div>
            </div>

            {/* Product Videos Section */}
            <div className="form-group full-width">
              <label>Product Videos (Optional)</label>
              <div className="gallery-upload-container">
                <div className="existing-gallery">
                  {formData.existingVideoUrls.map((url, idx) => (
                    <div key={idx} className="gallery-preview-item">
                      <video src={url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        className="remove-image"
                        onClick={() => {
                          const updated = [...formData.existingVideoUrls]
                          updated.splice(idx, 1)
                          setFormData({ ...formData, existingVideoUrls: updated })
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {formData.videos.map((file, idx) => (
                    <div key={`new-${idx}`} className="gallery-preview-item new">
                      <video src={URL.createObjectURL(file)} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {formData.videoUploadErrors[idx] && (
                        <div className="error-overlay" style={{ color: 'red', fontSize: '0.8rem', padding: '0.5rem' }}>
                          {formData.videoUploadErrors[idx]}
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="remove-image"
                        onClick={() => {
                          const updated = [...formData.videos]
                          updated.splice(idx, 1)
                          const errors = { ...formData.videoUploadErrors }
                          delete errors[idx]
                          setFormData({ ...formData, videos: updated, videoUploadErrors: errors })
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    const errors: Record<number, string> = {}
                    
                    files.forEach((file, idx) => {
                      const validation = validateVideoFile(file)
                      if (!validation.valid) {
                        errors[idx] = validation.error || 'Invalid video'
                      }
                    })
                    
                    setFormData({ 
                      ...formData, 
                      videos: [...formData.videos, ...files],
                      videoUploadErrors: { ...formData.videoUploadErrors, ...errors }
                    })
                  }}
                />
                <p className="help-text">Add product videos (MP4, MOV, WEBM - max 500MB each)</p>
              </div>
            </div>

            {/* Delivery Fees Section */}
            <div className="form-group full-width">
              <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1.1rem', fontWeight: '600' }}>Delivery Fees (Optional)</h4>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Leave empty if delivery option is not available for this product</p>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tamale Delivery Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_tamale}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_tamale: e.target.value })}
                    placeholder="Optional - e.g., 15.00"
                  />
                </div>
                <div className="form-group">
                  <label>STC Transport Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_greater_accra}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_greater_accra: e.target.value })}
                    placeholder="Optional - e.g., 25.00"
                  />
                </div>
                <div className="form-group">
                  <label>VIP Transport Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_lesser_accra}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_lesser_accra: e.target.value })}
                    placeholder="Optional - e.g., 35.00"
                  />
                </div>
                <div className="form-group">
                  <label>OA Transport Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_dhl}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_dhl: e.target.value })}
                    placeholder="Optional - e.g., 40.00"
                  />
                </div>
                <div className="form-group">
                  <label>VVIP Transport Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_ups}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_ups: e.target.value })}
                    placeholder="Optional - e.g., 50.00"
                  />
                </div>
                <div className="form-group">
                  <label>FedEx Delivery Fee (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.delivery_fee_fedex}
                    onChange={(e) => setFormData({ ...formData, delivery_fee_fedex: e.target.value })}
                    placeholder="Optional - e.g., 150.00"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setView('products')}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : view === 'edit' ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
