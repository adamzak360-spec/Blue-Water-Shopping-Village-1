import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getBusinessByOwner, getAllBusinessesByOwner, getAllBusinesses, updateBusinessProfile, uploadBusinessAsset, deleteBusinessAsset, type Business } from '../services/businessService'
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
import type { Product, DashboardStats, Order, Review, ProductVariant } from '../types'
import { formatCurrency } from '../utils/currency'
import { generateProductDescriptionDraft } from '../services/aiDescriptionService'
import { lazy, Suspense, type ChangeEvent } from 'react'
import { Pencil, Trash2, Printer, Share2 } from 'lucide-react'
import { BusinessVerificationForm } from '../components/BusinessVerificationForm'
import { PayoutProfileForm } from '../components/PayoutProfileForm'
import DeliverySettings from '../components/DeliverySettings'
import AdminNewsUpdates from '../components/AdminNewsUpdates'
import './Admin.css'

  // Lazy load admin sub-components for better performance
  const InventoryManagement = lazy(() => import('../components/InventoryManagement'))
  const AdminAnalytics = lazy(() => import('../components/AdminAnalytics'))
  const FinancialReports = lazy(() => import('../components/FinancialReports'))
  const SupplierManagement = lazy(() => import('../components/SupplierManagement'))
  const RegisteredSellerManagement = lazy(() => import('../components/RegisteredSellerManagement'))
  const POS = lazy(() => import('./POS'))
  const SellerPayouts = lazy(() => import('../components/SellerPayouts'))
  const AdminPromotions = lazy(() => import('../components/AdminPromotions'))
  const SellerPromotions = lazy(() => import('../components/SellerPromotions'))

  // Prefetch functions for near-instant transitions
  const prefetchInventory = () => import('../components/InventoryManagement')
  const prefetchAnalytics = () => import('../components/AdminAnalytics')
  const prefetchReports = () => import('../components/FinancialReports')
  const prefetchSuppliers = () => import('../components/SupplierManagement')
  const prefetchRegisteredSellers = () => import('../components/RegisteredSellerManagement')
  const prefetchPOS = () => import('./POS')
  const prefetchSellerPayouts = () => import('../components/SellerPayouts')
  const prefetchAdminPromotions = () => import('../components/AdminPromotions')
  const prefetchSellerPromotions = () => import('../components/SellerPromotions')

type AdminView = 'dashboard' | 'products' | 'add' | 'edit' | 'orders' | 'inventory' | 'analytics' | 'reports' | 'suppliers' | 'reviews' | 'registered-sellers' | 'pos' | 'payouts' | 'promotions' | 'settings' | 'delivery' | 'marketplace' | 'news'

interface ProductFormErrors {
  name?: string
  description?: string
  price?: string
  category?: string
  stock_quantity?: string
}

interface SubscriptionPlan {
  id: string
  country_code: string
  monthly_price: number
  currency_code: string
}

const escapePreviewHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))

function buildSellerEmailPreviewHtml(store: any, product: any): string {
  const storeName = escapePreviewHtml(store.name || 'Your Store')
  const location = escapePreviewHtml(store.location || 'Seller location not provided')
  const phone = escapePreviewHtml(store.contact_phone || 'Seller phone not provided')
  const email = escapePreviewHtml(store.contact_email || 'Seller email not provided')
  const storeNote = escapePreviewHtml(store.customer_email_note || 'The store will coordinate the delivery or pickup details for this order.')
  const productName = escapePreviewHtml(product.name || 'Sample product')
  const serviceArea = product.service_area || store.service_area
  const processingTime = product.processing_time || store.processing_time
  const pickup = product.pickup_instructions || store.pickup_instructions
  const delivery = product.delivery_instructions || store.delivery_instructions
  const returns = product.return_policy || store.return_policy
  const productNote = product.customer_email_note

  const productRows = [
    serviceArea ? `<p><strong>Service area:</strong> ${escapePreviewHtml(serviceArea)}</p>` : '',
    processingTime ? `<p><strong>Processing time:</strong> ${escapePreviewHtml(processingTime)}</p>` : '',
    pickup ? `<p><strong>Pickup:</strong> ${escapePreviewHtml(pickup)}</p>` : '',
    delivery ? `<p><strong>Delivery:</strong> ${escapePreviewHtml(delivery)}</p>` : '',
    returns ? `<p><strong>Returns:</strong> ${escapePreviewHtml(returns)}</p>` : '',
    productNote ? `<p><strong>Seller note:</strong> ${escapePreviewHtml(productNote)}</p>` : '',
  ].filter(Boolean).join('')

  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    *{box-sizing:border-box}body{margin:0;background:#f5f5f5;color:#333;font-family:Segoe UI,Tahoma,sans-serif;line-height:1.6}.email{max-width:600px;margin:0 auto;background:#fff}.header{padding:28px 20px;text-align:center;color:#fff;background:linear-gradient(135deg,#1e3a8a,#3b82f6)}.header h1{margin:0 0 4px;font-size:24px}.header p{margin:0;opacity:.9}.content{padding:24px 20px}.section{margin-bottom:22px}.section h2{margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #e5e7eb;color:#1e3a8a;font-size:18px}.contact{padding:16px;border-left:4px solid #1e3a8a;border-radius:6px;background:#eff6ff}.product{padding:16px;border-left:4px solid #d97706;border-radius:6px;background:#fffaf0}.muted{color:#6b7280;font-size:13px}.item{display:flex;justify-content:space-between;border-bottom:1px solid #e5e7eb;padding:10px 0}.total{display:flex;justify-content:space-between;padding-top:12px;font-weight:700;color:#1e3a8a}.footer{padding:18px 20px;text-align:center;color:#6b7280;font-size:13px;background:#f9fafb}
  </style></head><body><div class="email"><div class="header"><h1>Reliable</h1><p>Order confirmation preview</p></div><div class="content"><div class="section"><p>Hello Customer,</p><p>This is a preview of the email your customer receives after ordering from your store.</p></div><div class="section"><h2>Order Summary</h2><div class="item"><span>${productName} × 1</span><strong>GH₵100.00</strong></div><div class="total"><span>Total</span><span>GH₵100.00</span></div></div><div class="section contact"><h2>Store &amp; Delivery Contact</h2><p><strong>Store:</strong> ${storeName}</p><p><strong>Seller location:</strong> ${location}</p><p><strong>Seller contact:</strong> ${phone} · ${email}</p><p><strong>Delivery or pickup note:</strong> ${storeNote}</p><p class="muted">Reliable provides the marketplace, order tracking, and customer support. The store above is responsible for the item-specific delivery or pickup arrangement.</p></div>${productRows ? `<div class="section product"><h2>Product-Specific Information</h2><p><strong>${productName}</strong></p>${productRows}</div>` : '<div class="section product"><h2>Product-Specific Information</h2><p class="muted">No product-specific overrides are entered. This order will use your store-level settings.</p></div>'}<div class="section"><p>Order status: <strong>Pending</strong></p><p class="muted">This preview is for sellers only and does not send an email.</p></div></div><div class="footer">Reliable Premium Marketplace · Customer support remains available through Reliable.</div></div></body></html>`
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
  pickup_instructions: '',
  delivery_instructions: '',
  service_area: '',
  processing_time: '',
  return_policy: '',
  customer_email_note: '',
  specifications: [] as { label: string; value: string }[],
}

export default function Admin() {
  const { user, signOut, role } = useAuth()
  const navigate = useNavigate()
  const canManageNews = ['admin', 'general_admin', 'general-admin'].includes(String(role || '').toLowerCase())
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
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [sellerBusinessIds, setSellerBusinessIds] = useState<string[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [ordersError, setOrdersError] = useState('')
  const [reviewsError, setReviewsError] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [isUpdatingStore, setIsUpdatingStore] = useState(false)
  const [assetActionLoading, setAssetActionLoading] = useState<'logo' | 'banner' | null>(null)
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [storeSettings, setStoreSettings] = useState({
    name: '',
    description: '',
    contact_email: '',
    contact_phone: '',
    location: '',
    facebook_url: '',
    tiktok_url: '',
    instagram_url: '',
    x_url: '',
    whatsapp_url: '',
    youtube_url: '',
    pickup_instructions: '',
    delivery_instructions: '',
    service_area: '',
    processing_time: '',
    return_policy: '',
    customer_email_note: '',
    show_contact_email_public: false,
    show_contact_phone_public: false,
    show_location_public: false,
    show_delivery_info_public: false,
    show_product_count: false,
  })
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([])
  const [subscriptionPlansLoading, setSubscriptionPlansLoading] = useState(false)
  const [subscriptionPlansSaving, setSubscriptionPlansSaving] = useState<string | null>(null)
  const [subscriptionPlansError, setSubscriptionPlansError] = useState('')

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
          setBusinesses([b])
          currentBusiness = b
          setStoreSettings({
            name: b.name || '',
            description: b.description || '',
            contact_email: b.contact_email || '',
            contact_phone: b.contact_phone || '',
            location: b.location || '',
            facebook_url: b.facebook_url || '',
            tiktok_url: b.tiktok_url || '',
            instagram_url: b.instagram_url || '',
            x_url: b.x_url || '',
            whatsapp_url: b.whatsapp_url || '',
            youtube_url: b.youtube_url || '',
            pickup_instructions: b.pickup_instructions || '',
            delivery_instructions: b.delivery_instructions || '',
            service_area: b.service_area || '',
            processing_time: b.processing_time || '',
            return_policy: b.return_policy || '',
            customer_email_note: b.customer_email_note || '',
            show_contact_email_public: Boolean(b.show_contact_email_public),
            show_contact_phone_public: Boolean(b.show_contact_phone_public),
            show_location_public: Boolean(b.show_location_public),
            show_delivery_info_public: Boolean(b.show_delivery_info_public),
            show_product_count: Boolean(b.show_product_count),
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
        setBusinesses(owned)
      } catch (err) {
        console.error('Error fetching owned businesses:', err)
      }
    } else {
      setSellerBusinessIds([])
      try {
        setBusinesses(await getAllBusinesses())
      } catch (err) {
        console.error('Error loading businesses for order details:', err)
      }
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

  const handleBrandingUpload = async (event: ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = event.target.files?.[0]
    if (!file || !business) return

    setAssetActionLoading(type)
    setError('')
    try {
      const url = await uploadBusinessAsset(file, business.id, type)
      await updateBusinessProfile(business.id, type === 'logo' ? { logo_url: url } : { banner_url: url })
      showNotification(`${type === 'logo' ? 'Logo' : 'Banner'} updated!`)
      await loadData()
    } catch (err: any) {
      setError(err.message || `Failed to update store ${type}`)
    } finally {
      setAssetActionLoading(null)
      event.target.value = ''
    }
  }

  const handleBrandingDelete = async (type: 'logo' | 'banner') => {
    if (!business) return
    const assetUrl = type === 'logo' ? business.logo_url : business.banner_url
    if (!assetUrl) return

    const label = type === 'logo' ? 'store logo' : 'store banner'
    if (!window.confirm(`Delete the ${label}? This cannot be undone.`)) return

    setAssetActionLoading(type)
    setError('')
    try {
      await deleteBusinessAsset(assetUrl)
      await updateBusinessProfile(business.id, type === 'logo' ? { logo_url: null } : { banner_url: null })
      showNotification(`${type === 'logo' ? 'Logo' : 'Banner'} deleted!`)
      await loadData()
    } catch (err: any) {
      setError(err.message || `Failed to delete ${label}`)
    } finally {
      setAssetActionLoading(null)
    }
  }

  useEffect(() => {
    loadData()
  }, [user, role, business])

  useEffect(() => {
    if (role !== 'admin') return

    let cancelled = false
    const loadSubscriptionPlans = async () => {
      setSubscriptionPlansLoading(true)
      setSubscriptionPlansError('')
      try {
        const { data, error: plansError } = await supabase!
          .from('pos_subscription_plans')
          .select('id, country_code, monthly_price, currency_code')
          .order('country_code', { ascending: true })

        if (plansError) throw plansError
        if (!cancelled) {
          setSubscriptionPlans((data || []).map((plan) => ({
            id: plan.id,
            country_code: plan.country_code,
            monthly_price: Number(plan.monthly_price),
            currency_code: plan.currency_code,
          })))
        }
      } catch (err: any) {
        if (!cancelled) setSubscriptionPlansError(err.message || 'Failed to load POS subscription plans')
      } finally {
        if (!cancelled) setSubscriptionPlansLoading(false)
      }
    }

    loadSubscriptionPlans()
    return () => { cancelled = true }
  }, [role])

  const saveSubscriptionPlan = async (plan: SubscriptionPlan) => {
    const monthlyPrice = Number(plan.monthly_price)
    const currencyCode = plan.currency_code.trim().toUpperCase()

    if (!Number.isFinite(monthlyPrice) || monthlyPrice <= 0) {
      setSubscriptionPlansError(`Enter a valid monthly price for ${plan.country_code}.`)
      return
    }
    if (!/^[A-Z]{3}$/.test(currencyCode)) {
      setSubscriptionPlansError(`Use a 3-letter currency code for ${plan.country_code}.`)
      return
    }

    setSubscriptionPlansSaving(plan.id)
    setSubscriptionPlansError('')
    try {
      const { error: saveError } = await supabase!
        .from('pos_subscription_plans')
        .update({ monthly_price: monthlyPrice, currency_code: currencyCode })
        .eq('id', plan.id)

      if (saveError) throw saveError
      setSubscriptionPlans((current) => current.map((item) => (
        item.id === plan.id
          ? { ...item, monthly_price: monthlyPrice, currency_code: currencyCode }
          : item
      )))
      showNotification(`${plan.country_code} POS subscription price updated.`)
    } catch (err: any) {
      setSubscriptionPlansError(err.message || 'Failed to update POS subscription price')
    } finally {
      setSubscriptionPlansSaving(null)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'pos') {
      setView('pos')
    }
  }, [])

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

  const handleGenerateDescription = async () => {
    if (!formData.name.trim() || !formData.category.trim()) {
      showNotification('Enter a product name and category before generating a draft.', 'error')
      return
    }

    setIsGeneratingDescription(true)
    try {
      const draft = await generateProductDescriptionDraft({
        name: formData.name,
        category: formData.category,
        price: formData.price,
        sizes: formData.has_sizes ? formData.variants.map(variant => variant.variant_value).filter(Boolean).join(', ') : '',
        keyFeatures: formData.specifications.map(spec => `${spec.label}: ${spec.value}`).filter(Boolean).join('; '),
        notes: [formData.pickup_instructions, formData.delivery_instructions, formData.return_policy].filter(Boolean).join(' '),
      })
      setFormData(current => ({ ...current, description: draft.description }))
      setFormErrors(current => ({ ...current, description: undefined }))
      showNotification(draft.fallback ? 'Template draft generated without AI. Review and edit it before saving the product.' : 'AI draft generated. Review and edit it before saving the product.')
    } catch (generationError: any) {
      showNotification(generationError?.message || 'Reliable AI could not generate a draft.', 'error')
    } finally {
      setIsGeneratingDescription(false)
    }
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
        pickup_instructions: formData.pickup_instructions.trim() || undefined,
        delivery_instructions: formData.delivery_instructions.trim() || undefined,
        service_area: formData.service_area.trim() || undefined,
        processing_time: formData.processing_time.trim() || undefined,
        return_policy: formData.return_policy.trim() || undefined,
        customer_email_note: formData.customer_email_note.trim() || undefined,
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
      pickup_instructions: product.pickup_instructions || '',
      delivery_instructions: product.delivery_instructions || '',
      service_area: product.service_area || '',
      processing_time: product.processing_time || '',
      return_policy: product.return_policy || '',
      customer_email_note: product.customer_email_note || '',
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
  const getShopName = (businessId?: string) => {
    if (!businessId) return 'Marketplace shop'
    const store = businesses.find((candidate) => candidate.id === businessId)
    return store?.name || store?.business_name || (business?.id === businessId ? business.name || business.business_name : null) || 'Marketplace shop'
  }
  const handlePrintOrder = () => {
    const modal = document.querySelector('.order-details-modal')
    if (!modal) return

    document.querySelector('.order-print-root')?.remove()
    const printRoot = document.createElement('div')
    printRoot.className = 'order-print-root order-details-modal'
    printRoot.setAttribute('aria-hidden', 'true')
    printRoot.innerHTML = modal.innerHTML
    document.body.appendChild(printRoot)
    document.body.classList.add('printing-order-details')

    const cleanup = () => {
      document.body.classList.remove('printing-order-details')
      printRoot.remove()
    }

    window.addEventListener('afterprint', cleanup, { once: true })
    window.setTimeout(() => {
      window.print()
      window.setTimeout(cleanup, 1500)
    }, 50)
  }
  const handleShareOrder = async () => {
    if (!selectedOrder) return
    const items = selectedOrder.items.map((item) => `- ${item.name} x${item.quantity} (${getShopName(item.business_id || selectedOrder.business_id)})`).join('\\n')
    const text = `Reliable order ${selectedOrder.id?.substring(0, 8) || ''}\\nCustomer: ${selectedOrder.customer_name}\\nItems:\\n${items}\\nTotal: ${formatCurrency(selectedOrder.total, selectedOrder.payout_currency || 'GHS')}\\nStatus: ${selectedOrder.status.replace('-', ' ')}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `Reliable order ${selectedOrder.id?.substring(0, 8) || ''}`, text })
      } else {
        await navigator.clipboard.writeText(text)
        showNotification('Order details copied to clipboard')
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') showNotification('Unable to share order details', 'error')
    }
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
        {canManageNews && (
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
            <button
              className={`tab ${view === 'news' ? 'active' : ''}`}
              onClick={() => setView('news')}
            >
              News Updates
            </button>
            <button
              className={`tab ${view === 'promotions' ? 'active' : ''}`}
              onClick={() => setView('promotions')}
              onMouseEnter={prefetchAdminPromotions}
            >
              Advertising
            </button>
          </>
        )}
        {role === 'seller' && (
          <button
            className={`tab ${view === 'promotions' ? 'active' : ''}`}
            onClick={() => setView('promotions')}
            onMouseEnter={prefetchSellerPromotions}
          >
            Promote Products
          </button>
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
          {role === 'seller' ? '🔗 Store & Social Settings' : '⚙️ Store Settings'}
        </button>
        <button
          className={`tab ${view === 'delivery' ? 'active' : ''}`}
          onClick={() => setView('delivery')}
        >
          🚚 Delivery Settings
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
        {view === 'payouts' && <SellerPayouts isAdmin={role === 'admin'} businessIds={role === 'seller' && sellerBusinessIds.length > 0 ? sellerBusinessIds : undefined} />}

        {/* POS View */}
        {view === 'pos' && <POS businessIds={role === 'seller' ? sellerBusinessIds : undefined} />}

        {/* General Admin News and Newsletter View */}
        {view === 'news' && canManageNews && <AdminNewsUpdates />}
        {/* General Admin Advertising View */}
        {view === 'promotions' && canManageNews && <AdminPromotions />}
        {view === 'promotions' && role === 'seller' && <SellerPromotions businessIds={sellerBusinessIds} />}
        {/* Marketplace Settings View */}
        {view === 'marketplace' && role === 'admin' && (
          <div className="marketplace-settings-content animate-fade-in">
            <div className="section-title-wrapper">
              <h2 className="section-title">Global Marketplace Settings</h2>
              <p>Manage supported countries, currencies, and platform-wide configurations.</p>
            </div>

            <div className="settings-grid">
              <div className="settings-card subscription-pricing-card">
                <h3>POS Subscription Pricing</h3>
                <p>Set the monthly POS access price for each country. Changes apply to new checkouts; existing active subscriptions keep their current expiry.</p>
                {subscriptionPlansError && <div className="form-error" role="alert">{subscriptionPlansError}</div>}
                {subscriptionPlansLoading ? (
                  <p>Loading subscription plans...</p>
                ) : subscriptionPlans.length === 0 ? (
                  <p>No country plans are configured yet.</p>
                ) : (
                  <div className="admin-form">
                    {subscriptionPlans.map((plan) => (
                      <div className="form-row subscription-plan-row" key={plan.id}>
                        <div className="form-group">
                          <label htmlFor={`pos-plan-country-${plan.id}`}>Country</label>
                          <input id={`pos-plan-country-${plan.id}`} value={plan.country_code} readOnly />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`pos-plan-price-${plan.id}`}>Monthly price</label>
                          <input
                            id={`pos-plan-price-${plan.id}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={plan.monthly_price}
                            onChange={(e) => setSubscriptionPlans((current) => current.map((item) => (
                              item.id === plan.id ? { ...item, monthly_price: Number(e.target.value) } : item
                            )))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`pos-plan-currency-${plan.id}`}>Currency</label>
                          <input
                            id={`pos-plan-currency-${plan.id}`}
                            maxLength={3}
                            value={plan.currency_code}
                            onChange={(e) => setSubscriptionPlans((current) => current.map((item) => (
                              item.id === plan.id ? { ...item, currency_code: e.target.value.toUpperCase() } : item
                            )))}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary btn-sm subscription-plan-save"
                          disabled={subscriptionPlansSaving === plan.id}
                          onClick={() => saveSubscriptionPlan(plan)}
                        >
                          {subscriptionPlansSaving === plan.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

        {/* Delivery Settings View */}
        {view === 'delivery' && (business || role === 'admin') && (
          <DeliverySettings
            businessId={business?.id}
            isAdmin={role === 'admin'}
            countryCode={business?.country_code}
            currencyCode={business?.currency_code}
          />
        )}

        {/* Store Settings View */}
        {view === 'settings' && (business || role === 'admin') && (
          <div className="store-settings-content animate-fade-in">
            <div className="section-title-wrapper">
              <h2 className="section-title">Store Settings</h2>
                            <p>Customize your storefront, contact information, and customer connections.</p>
            </div>
            {role === 'seller' && (
              <div style={{ marginBottom: '1.25rem', padding: '1rem 1.15rem', borderLeft: '4px solid #dc2626', borderRadius: '10px', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: '#991b1b', display: 'block', marginBottom: '0.25rem' }}>Connect your social media pages</strong>
                  <span style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>Add your Facebook, Instagram, TikTok, X, WhatsApp, and YouTube links for customers to discover.</span>
                </div>
                <button type="button" className="btn-primary" onClick={() => document.getElementById('social-media-settings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  Add Social Links
                </button>
              </div>
            )}
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
                  <div className="seller-communication-settings" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: '#1f2937' }}>Customer Communications</h4>
                      <p style={{ margin: '0.35rem 0 0', color: '#6b7280', fontSize: '0.88rem' }}>
                        These details help Reliable explain delivery and pickup instructions in order emails. They are not shown publicly unless you enable the matching visibility option.
                      </p>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Service Area</label>
                        <input type="text" placeholder="e.g. Tamale, Ghana or United States" value={storeSettings.service_area} onChange={e => setStoreSettings({...storeSettings, service_area: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Typical Processing Time</label>
                        <input type="text" placeholder="e.g. 1–2 business days" value={storeSettings.processing_time} onChange={e => setStoreSettings({...storeSettings, processing_time: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Pickup Instructions</label>
                      <textarea rows={3} placeholder="Where and when customers should collect orders, if pickup is available." value={storeSettings.pickup_instructions} onChange={e => setStoreSettings({...storeSettings, pickup_instructions: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Delivery Instructions</label>
                      <textarea rows={3} placeholder="Delivery coverage, handoff details, or seller-specific delivery notes." value={storeSettings.delivery_instructions} onChange={e => setStoreSettings({...storeSettings, delivery_instructions: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Return Policy Summary</label>
                      <textarea rows={3} placeholder="Optional short return or exchange guidance for customers." value={storeSettings.return_policy} onChange={e => setStoreSettings({...storeSettings, return_policy: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Customer Order Email Note</label>
                      <textarea rows={3} placeholder="Optional note to include in order-related emails from your store." value={storeSettings.customer_email_note} onChange={e => setStoreSettings({...storeSettings, customer_email_note: e.target.value})} />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', margin: '0 0 1rem' }}>
                      <button type="button" className="btn-secondary" onClick={() => setShowEmailPreview(true)}>
                        Preview Customer Email
                      </button>
                      <span style={{ color: '#6b7280', fontSize: '0.86rem' }}>Preview uses your current values and does not send an email.</span>
                    </div>
                    <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '10px', marginBottom: '1rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.6rem', color: '#1f2937' }}>Public Storefront Visibility</strong>
                      <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.86rem' }}>All switches are off by default. Turn on only the details you want visitors to see.</p>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}><input type="checkbox" checked={storeSettings.show_contact_email_public} onChange={e => setStoreSettings({...storeSettings, show_contact_email_public: e.target.checked})} /> Show contact email publicly</label>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}><input type="checkbox" checked={storeSettings.show_contact_phone_public} onChange={e => setStoreSettings({...storeSettings, show_contact_phone_public: e.target.checked})} /> Show contact phone publicly</label>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}><input type="checkbox" checked={storeSettings.show_location_public} onChange={e => setStoreSettings({...storeSettings, show_location_public: e.target.checked})} /> Show location publicly</label>
                      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}><input type="checkbox" checked={storeSettings.show_delivery_info_public} onChange={e => setStoreSettings({...storeSettings, show_delivery_info_public: e.target.checked})} /> Show delivery and pickup information publicly</label>
                      {role === 'admin' && (
                        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="checkbox" checked={storeSettings.show_product_count} onChange={e => setStoreSettings({...storeSettings, show_product_count: e.target.checked})} />
                          Show product count on the public Products page
                        </label>
                      )}
                    </div>
                  </div>
                  <div id="social-media-settings" className="social-settings-section" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e5e7eb', scrollMarginTop: '1rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, color: '#1f2937' }}>Social Media Profiles</h4>
                      <p style={{ margin: '0.35rem 0 0', color: '#6b7280', fontSize: '0.88rem' }}>
                        Add your public business profiles so customers can connect with your store.
                      </p>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Facebook URL</label>
                        <input type="url" placeholder="https://facebook.com/yourstore" value={storeSettings.facebook_url} onChange={e => setStoreSettings({...storeSettings, facebook_url: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Instagram URL</label>
                        <input type="url" placeholder="https://instagram.com/yourstore" value={storeSettings.instagram_url} onChange={e => setStoreSettings({...storeSettings, instagram_url: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>TikTok URL</label>
                        <input type="url" placeholder="https://tiktok.com/@yourstore" value={storeSettings.tiktok_url} onChange={e => setStoreSettings({...storeSettings, tiktok_url: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>X (Twitter) URL</label>
                        <input type="url" placeholder="https://x.com/yourstore" value={storeSettings.x_url} onChange={e => setStoreSettings({...storeSettings, x_url: e.target.value})} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>WhatsApp Link</label>
                        <input type="url" placeholder="https://wa.me/233XXXXXXXXX" value={storeSettings.whatsapp_url} onChange={e => setStoreSettings({...storeSettings, whatsapp_url: e.target.value})} />
                        <small style={{ color: '#6b7280' }}>Use a wa.me link with your full international number.</small>
                      </div>
                      <div className="form-group">
                        <label>YouTube URL</label>
                        <input type="url" placeholder="https://youtube.com/@yourstore" value={storeSettings.youtube_url} onChange={e => setStoreSettings({...storeSettings, youtube_url: e.target.value})} />
                      </div>
                    </div>
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
                  <label htmlFor="store-logo-upload">Store Logo</label>
                  <div className="asset-preview-container">
                    {business?.logo_url ? <img src={business.logo_url} alt="Store logo" className="logo-preview" /> : <div className="placeholder-preview">No Logo</div>}
                    <div className="branding-actions" aria-label="Store logo actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm asset-action-button"
                        onClick={() => document.getElementById('store-logo-upload')?.click()}
                        disabled={assetActionLoading === 'logo'}
                      >
                        <Pencil size={16} />
                        {assetActionLoading === 'logo' ? 'Working...' : business?.logo_url ? 'Edit Logo' : 'Add Logo'}
                      </button>
                      {business?.logo_url && (
                        <button
                          type="button"
                          className="btn-delete btn-sm asset-action-button"
                          onClick={() => handleBrandingDelete('logo')}
                          disabled={assetActionLoading === 'logo'}
                        >
                          <Trash2 size={16} />
                          Delete Logo
                        </button>
                      )}
                    </div>
                    <input
                      id="store-logo-upload"
                      className="asset-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleBrandingUpload(event, 'logo')}
                    />
                  </div>
                </div>

                <div className="branding-upload-group" style={{ marginTop: '2rem' }}>
                  <label htmlFor="store-banner-upload">Store Banner</label>
                  <div className="asset-preview-container banner">
                    {business?.banner_url ? <img src={business.banner_url} alt="Store banner" className="banner-preview" /> : <div className="placeholder-preview">No Banner</div>}
                    <div className="branding-actions" aria-label="Store banner actions">
                      <button
                        type="button"
                        className="btn-secondary btn-sm asset-action-button"
                        onClick={() => document.getElementById('store-banner-upload')?.click()}
                        disabled={assetActionLoading === 'banner'}
                      >
                        <Pencil size={16} />
                        {assetActionLoading === 'banner' ? 'Working...' : business?.banner_url ? 'Edit Banner' : 'Add Banner'}
                      </button>
                      {business?.banner_url && (
                        <button
                          type="button"
                          className="btn-delete btn-sm asset-action-button"
                          onClick={() => handleBrandingDelete('banner')}
                          disabled={assetActionLoading === 'banner'}
                        >
                          <Trash2 size={16} />
                          Delete Banner
                        </button>
                      )}
                    </div>
                    <input
                      id="store-banner-upload"
                      className="asset-file-input"
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleBrandingUpload(event, 'banner')}
                    />
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
              <option value="out-for-delivery">Out for Delivery</option>
              <option value="ready-for-pickup">Ready for Pickup</option>
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
                  {filteredOrders.map(order => {
                    const isNewOrder = order.is_new ?? !['delivered', 'cancelled'].includes(order.status)
                    return (
                    <tr key={order.id} className={isNewOrder ? 'new-order-row' : undefined}>
                      <td className="order-id-cell">
                        <span className="order-id" title={order.id}>
                          {order.id?.substring(0, 8)}...
                        </span>
                        {isNewOrder && <span className="new-order-badge">NEW</span>}
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
                        {isNewOrder && <span className="new-order-label">Needs attention</span>}
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
                          <option value="out-for-delivery">Out for Delivery</option>
                          <option value="ready-for-pickup">Ready for Pickup</option>
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
                    )
                  })}
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
                      <th>Shop</th>
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
                        <td className="order-shop-cell">{getShopName(item.business_id || selectedOrder.business_id)}</td>
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
              <div className="modal-actions-primary">
                <button className="btn-secondary" onClick={handlePrintOrder} title="Print order details"><Printer size={16} /> Print</button>
                <button className="btn-secondary" onClick={handleShareOrder} title="Share order details"><Share2 size={16} /> Share</button>
              </div>
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
                          <label className="variant-field">
                            <span>Size / Variant</span>
                            <input
                              type="text"
                              placeholder="e.g. M, XL, 42"
                              value={variant.variant_value}
                              onChange={(e) => {
                                const updated = [...formData.variants]
                                updated[idx].variant_value = e.target.value
                                setFormData({ ...formData, variants: updated })
                              }}
                            />
                          </label>
                          <label className="variant-field">
                            <span>Stock quantity</span>
                            <input
                              type="number"
                              placeholder="e.g. 10"
                              value={variant.stock_quantity}
                              onChange={(e) => {
                                const updated = [...formData.variants]
                                updated[idx].stock_quantity = parseInt(e.target.value) || 0
                                setFormData({ ...formData, variants: updated })
                              }}
                            />
                          </label>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                  <label style={{ marginBottom: 0 }}>Description</label>
                  <button
                    type="button"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription || isSubmitting}
                    style={{ border: '1px solid #1d4ed8', color: '#1d4ed8', background: '#eff6ff', borderRadius: '8px', padding: '0.5rem 0.75rem', fontWeight: 700, cursor: isGeneratingDescription ? 'wait' : 'pointer' }}
                  >
                    {isGeneratingDescription ? 'Generating draft…' : 'Generate with Reliable AI'}
                  </button>
                </div>
                <p style={{ margin: '0 0 0.55rem', color: '#64748b', fontSize: '0.82rem' }}>Reliable AI creates a draft from the facts you provide. Review and edit it before saving.</p>
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

            {/* Product-specific customer communication overrides */}
            <div className="form-group full-width">
              <h4 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: '600' }}>Customer & Delivery Information (Optional)</h4>
              <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                These details override your store defaults for this product only and help customers understand pickup, delivery, timing, and returns in order emails. Leave blank to use your store settings.
              </p>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Pickup instructions</label>
                  <textarea
                    value={formData.pickup_instructions}
                    onChange={(e) => setFormData({ ...formData, pickup_instructions: e.target.value })}
                    placeholder="Optional: where and how customers should collect this item"
                    rows={3}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Delivery instructions</label>
                  <textarea
                    value={formData.delivery_instructions}
                    onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                    placeholder="Optional: delivery method, handover details, or special requirements"
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Service area</label>
                  <input
                    type="text"
                    value={formData.service_area}
                    onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                    placeholder="Optional: Tamale, Ghana; USA; worldwide"
                  />
                </div>
                <div className="form-group">
                  <label>Processing time</label>
                  <input
                    type="text"
                    value={formData.processing_time}
                    onChange={(e) => setFormData({ ...formData, processing_time: e.target.value })}
                    placeholder="Optional: 2–3 business days"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Return or exchange policy</label>
                  <textarea
                    value={formData.return_policy}
                    onChange={(e) => setFormData({ ...formData, return_policy: e.target.value })}
                    placeholder="Optional: product-specific return or exchange information"
                    rows={3}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Customer email note</label>
                  <textarea
                    value={formData.customer_email_note}
                    onChange={(e) => setFormData({ ...formData, customer_email_note: e.target.value })}
                    placeholder="Optional: a short note to include in order emails for this product"
                    rows={3}
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

      {showEmailPreview && (
        <div role="dialog" aria-modal="true" aria-label="Customer email preview" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(15, 23, 42, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: 'min(720px, 100%)', height: 'min(88vh, 860px)', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <strong style={{ color: '#1e3a8a' }}>Customer Order Email Preview</strong>
                <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>Private preview · no email will be sent</div>
              </div>
              <button type="button" className="btn-secondary" onClick={() => setShowEmailPreview(false)}>Close</button>
            </div>
            <iframe
              title="Customer order email preview"
              srcDoc={buildSellerEmailPreviewHtml(storeSettings, { ...formData, name: formData.name || 'Sample product' })}
              style={{ flex: 1, width: '100%', border: 0, background: '#f5f5f5' }}
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      )}
    </div>
  )
}
