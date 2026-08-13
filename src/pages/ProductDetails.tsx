import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { Business } from '../services/businessService'
import { getProductById, getAllProducts, getProductVariants } from '../services/productService'
import { getApprovedReviewsByProductId, submitReview, getProductRatingStats } from '../services/reviewService'
import type { Product, Review, ProductVariant } from '../types'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { formatCurrency } from '../utils/currency'
import { ChevronLeft, ShoppingCart, Plus, Minus, Truck, ShieldCheck, Lock, Heart, ZoomIn, Phone, MessageCircle } from 'lucide-react'
import StockStatus from '../components/StockStatus'
import ProductShare from '../components/ProductShare'
import ProductCard from '../components/ProductCard'
import VerifiedSellerBadge from '../components/VerifiedSellerBadge'
import BusinessSocialLinks from '../components/BusinessSocialLinks'
import './ProductDetails.css'

export default function ProductDetails() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { isWishlisted, toggleWishlist } = useWishlist()

  const [product, setProduct] = useState<Product | null>(null)
  const [sellerBusiness, setSellerBusiness] = useState<Business | null>(null)
  const [variants, setVariants] = useState<ProductVariant[]>([])
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [mainMediaIndex, setMainMediaIndex] = useState(0)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [sizeError, setSizeError] = useState('')

  // Review Form State
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [showChatGate, setShowChatGate] = useState(false)



  useEffect(() => {
    window.scrollTo(0, 0)
  }, [productId])

  useEffect(() => {
    const loadProductAndReviews = async () => {
      try {
        if (!productId) {
          setError('Product not found')
          setIsLoading(false)
          return
        }

        const productData = await getProductById(productId)
        if (!productData) {
          setError('Product not found')
          setIsLoading(false)
          return
        }
        setProduct(productData)

        if (productData.business_id && supabase) {
          const { data: businessData } = await supabase
            .from('businesses')
            .select('id, name, slug, owner_id, verification_status')
            .eq('id', productData.business_id)
            .maybeSingle()
          setSellerBusiness((businessData as Business | null) || null)
        }

        if (productData.has_sizes) {
          const variantData = await getProductVariants(productId)
          setVariants(variantData)
        }

        getAllProducts().then(allProducts => {
          const related = allProducts
            .filter(p => p.category === productData.category && p.id !== productId && p.status === 'active')
            .slice(0, 4)
          setRelatedProducts(related)
        }).catch(err => console.error('Failed to load related products:', err))

        getApprovedReviewsByProductId(productId)
          .then(setReviews)
          .catch(err => console.error('Failed to load reviews:', err))

        getProductRatingStats(productId)
          .then(setRatingStats)
          .catch(err => console.error('Failed to load rating stats:', err))

      } catch (err) {
        console.error('Unexpected error in loadProductAndReviews:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadProductAndReviews()
  }, [productId])

  const handleChat = () => {
    if (!product || !sellerBusiness) return
    if (!user) {
      setShowChatGate(true)
      return
    }
    navigate(`/chat/product/${product.id}?business=${sellerBusiness.id}`)
  }

  const handleAddToCart = () => {
    if (product?.has_sizes && selectedSizes.length === 0) {
      setSizeError('Please select at least one size')
      return
    }
    setSizeError('')

    // Add to cart for each selected size
    if (product?.has_sizes) {
      selectedSizes.forEach(size => {
        addToCart({
          ...product!,
          quantity: quantity, // Use the selected quantity for each size
          selected_size: size
        } as any)
      })
    } else {
      addToCart({
        ...product!,
        quantity: quantity,
        selected_size: undefined
      } as any)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !reviewName.trim() || !reviewMessage.trim()) {
      return
    }

    setIsSubmittingReview(true)
    try {
      await submitReview({ product_id: productId, customer_name: reviewName.trim(), rating: reviewRating, title: reviewTitle.trim(), message: reviewMessage.trim() })
      setReviewSuccess(true)
      setReviewName('')
      setReviewTitle('')
      setReviewMessage('')
      setReviewRating(5)
      setTimeout(() => setReviewSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to submit review:', err)
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div>Loading product details...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>{error || 'Product not found'}</h2>
        <Link to="/products" style={{ color: '#0066cc', textDecoration: 'underline' }}>
          Back to Products
        </Link>
      </div>
    )
  }

  // Build mixed media gallery (images + videos)
  interface MediaItem {
    type: 'image' | 'video'
    url: string
  }
  
  const productMedia: MediaItem[] = [
    { type: 'image' as const, url: product.image_url },
    ...(product.gallery_urls || []).map(url => ({ type: 'image' as const, url })),
    ...(product.video_urls || []).map(url => ({ type: 'video' as const, url }))
  ].filter(item => item.url) as MediaItem[]
  
  const mainMedia = productMedia[mainMediaIndex] || { type: 'image' as const, url: product.image_url }

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'

  const handleCallOrder = () => {
    window.location.href = 'tel:+233595609966'
  }

  const renderStars = (rating: number) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} style={{ color: star <= rating ? '#fbbf24' : '#d1d5db' }}>
            ★
          </span>
        ))}
      </div>
    )
  }

  // Build specifications list from available fields
  const specItems: { label: string; value: string }[] = []

  if (product.brand) {
    specItems.push({ label: 'Brand', value: product.brand })
  }
  if (product.condition) {
    specItems.push({ label: 'Condition', value: product.condition })
  }
  if (product.material) {
    specItems.push({ label: 'Material', value: product.material })
  }
  if (product.colour) {
    specItems.push({ label: 'Colour', value: product.colour })
  }
  if (product.weight) {
    specItems.push({ label: 'Weight', value: product.weight })
  }
  if (product.dimensions) {
    specItems.push({ label: 'Dimensions', value: product.dimensions })
  }
  if (product.warranty) {
    specItems.push({ label: 'Warranty', value: product.warranty })
  }
  if (product.sku) {
    specItems.push({ label: 'SKU', value: product.sku })
  }
  if (product.product_code) {
    specItems.push({ label: 'Product Code', value: product.product_code })
  }
  // Add custom specifications from JSONB field
  if (Array.isArray(product.specifications)) {
    product.specifications.forEach((spec: any) => {
      if (spec.label && spec.value) {
        specItems.push({ label: spec.label, value: spec.value })
      }
    })
  }

  // Always show these
  specItems.push({ label: 'Category', value: product.category })
  specItems.push({ label: 'Stock Available', value: `${product.stock_quantity} units` })
  specItems.push({ label: 'Product Status', value: product.status.charAt(0).toUpperCase() + product.status.slice(1) })
  specItems.push({
    label: 'Availability',
    value: isOutOfStock ? 'Out of Stock' : 'In Stock'
  })

  // Calculate display price info
  const hasDiscount = product.original_price && product.original_price > product.price
  const discountPercent = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0

  // Get current stock based on selection
  const currentStock = product.has_sizes && selectedSizes.length > 0
    ? Math.min(...selectedSizes.map(size => variants.find(v => v.variant_value === size)?.stock_quantity || 0))
    : product.stock_quantity

  // Build delivery info from product-specific fees
  // Only show delivery options that have been configured for this product (fee > 0)
  // Column mapping: STC=greater_accra, VIP=lesser_accra, OA=dhl, VVIP=ups
  const deliveryOptions: { method: string; fee: string }[] = []
  if (product.delivery_fee_tamale !== undefined && product.delivery_fee_tamale !== null && product.delivery_fee_tamale > 0) {
    deliveryOptions.push({ method: 'Tamale Delivery', fee: formatCurrency(product.delivery_fee_tamale, product.currency || 'GHS') })
  }
  if (product.delivery_fee_greater_accra !== undefined && product.delivery_fee_greater_accra !== null && product.delivery_fee_greater_accra > 0) {
    deliveryOptions.push({ method: 'STC Transport', fee: formatCurrency(product.delivery_fee_greater_accra, product.currency || 'GHS') })
  }
  if (product.delivery_fee_lesser_accra !== undefined && product.delivery_fee_lesser_accra !== null && product.delivery_fee_lesser_accra > 0) {
    deliveryOptions.push({ method: 'VIP Transport', fee: formatCurrency(product.delivery_fee_lesser_accra, product.currency || 'GHS') })
  }
  if (product.delivery_fee_dhl !== undefined && product.delivery_fee_dhl !== null && product.delivery_fee_dhl > 0) {
    deliveryOptions.push({ method: 'OA Transport', fee: formatCurrency(product.delivery_fee_dhl, product.currency || 'GHS') })
  }
  if (product.delivery_fee_ups !== undefined && product.delivery_fee_ups !== null && product.delivery_fee_ups > 0) {
    deliveryOptions.push({ method: 'VVIP Transport', fee: formatCurrency(product.delivery_fee_ups, product.currency || 'GHS') })
  }
  if (product.delivery_fee_fedex !== undefined && product.delivery_fee_fedex !== null && product.delivery_fee_fedex > 0) {
    deliveryOptions.push({ method: 'FedEx Delivery', fee: formatCurrency(product.delivery_fee_fedex, product.currency || 'GHS') })
  }

  return (
    <div className="product-details-page">
      <div className="product-main-layout">
        {/* Left Column: Mixed Media Gallery */}
        <div className="product-gallery-section">
          <div className="main-image-container">
            {mainMedia && mainMedia.url ? (
              <div className="main-image-wrapper">
                {mainMedia.type === 'image' ? (
                  <>
                    <img
                      src={mainMedia.url}
                      alt={product.name}
                      className="main-product-image"
                    />
                    <button className="lightbox-btn" aria-label="Zoom image">
                      <ZoomIn size={20} />
                    </button>
                  </>
                ) : (
                  <video
                    src={mainMedia.url}
                    controls
                    className="main-product-video"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
                  />
                )}
              </div>
            ) : (
              <div className="product-image-placeholder-large">
                <span>No media available</span>
              </div>
            )}
          </div>

          {/* Media Thumbnails (Images + Videos) */}
          {productMedia.length > 1 && (
            <div className="thumbnail-gallery">
              {productMedia.map((media, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === mainMediaIndex ? 'active' : ''}`}
                  onClick={() => setMainMediaIndex(index)}
                  style={{ position: 'relative' }}
                >
                  {media.type === 'image' ? (
                    <img src={media.url} alt={`${product.name} thumbnail ${index + 1}`} />
                  ) : (
                    <>
                      <video src={media.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        color: '#000'
                      }}>
                        ▶
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info */}
        <div className="product-info-section">
          <div className="product-header">
            <div className="breadcrumb">
              <Link to="/products" className="breadcrumb-link">
                <ChevronLeft size={16} /> Products
              </Link>
              <span className="breadcrumb-separator">/</span>
              <span className="breadcrumb-current">{product.category}</span>
            </div>
            <h1 className="product-title">{product.name}</h1>
            {sellerBusiness && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', margin: '12px 0' }}>
                  <Link to={`/store/${sellerBusiness.slug}`} style={{ fontWeight: 700, color: '#1f2937', textDecoration: 'none' }}>
                    Sold by {sellerBusiness.name}
                  </Link>
                  <VerifiedSellerBadge status={sellerBusiness.verification_status} compact />
                </div>
                <BusinessSocialLinks
                  compact
                  facebook_url={sellerBusiness.facebook_url}
                  tiktok_url={sellerBusiness.tiktok_url}
                  instagram_url={sellerBusiness.instagram_url}
                  x_url={sellerBusiness.x_url}
                  whatsapp_url={sellerBusiness.whatsapp_url}
                  youtube_url={sellerBusiness.youtube_url}
                />
              </>
            )}
            <div className="product-meta">
              {ratingStats.totalReviews > 0 && (
                <>
                  {renderStars(Math.round(ratingStats.averageRating))}
                  <span className="review-count">({ratingStats.totalReviews} reviews)</span>
                </>
              )}
              <span className="product-sku">SKU: {product.sku || product.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-display">
              <span className="current-price">{formatCurrency(product.price, product.currency || 'GHS')}</span>
              {hasDiscount && (
                <>
                  <span className="original-price">{formatCurrency(product.original_price!, product.currency || 'GHS')}</span>
                  <span className="discount-badge">{discountPercent}% OFF</span>
                </>
              )}
            </div>
            <div className="stock-warning-container">
              <StockStatus stock={currentStock} size="large" />
              {currentStock > 0 && currentStock <= 4 && (
                <div className="low-stock-warning">
                  <span className="warning-icon">⚠</span>
                  <span className="warning-text">{currentStock} {currentStock === 1 ? 'unit' : 'units'} left</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="product-description-section">
            <h3>Description</h3>
            <p className="product-description">{product.description}</p>
          </div>

          {/* Size Selection */}
          {product.has_sizes && variants.length > 0 && (
            <div className="size-selection-section">
              <h3 className="section-title">Select Sizes (Multiple allowed)</h3>
              <div className="size-options">
                {variants.map((variant) => (
                  <button
                    key={variant.id}
                    className={`size-btn ${selectedSizes.includes(variant.variant_value) ? 'selected' : ''} ${variant.stock_quantity === 0 ? 'unavailable' : ''}`}
                    onClick={() => {
                      setSelectedSizes(prev => 
                        prev.includes(variant.variant_value)
                          ? prev.filter(s => s !== variant.variant_value)
                          : [...prev, variant.variant_value]
                      )
                    }}
                    disabled={variant.stock_quantity === 0}
                  >
                    {variant.variant_value}
                  </button>
                ))}
              </div>
              {sizeError && <span className="size-error">{sizeError}</span>}
            </div>
          )}

          {/* Quantity Selection */}
          <div className="quantity-section">
            <label>Quantity:</label>
            <div className="quantity-control">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity === 1}
              >
                <Minus size={18} />
              </button>
              <input type="number" value={quantity} readOnly />
              <button onClick={() => setQuantity(quantity + 1)}>
                <Plus size={18} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="chat-product-btn" onClick={handleChat} disabled={!sellerBusiness}>
              <MessageCircle size={20} />
              Chat with Seller
            </button>
            <button
              className="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart size={20} />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
              className={`wishlist-btn ${product && isWishlisted(product.id) ? 'active' : ''}`}
              onClick={() => product && void toggleWishlist(product.id)}
              aria-label={product && isWishlisted(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={product ? isWishlisted(product.id) : false}
            >
              <Heart size={20} fill={product && isWishlisted(product.id) ? 'currentColor' : 'none'} />
              <span>{product && isWishlisted(product.id) ? 'Saved' : 'Save'}</span>
            </button>
            {product && <ProductShare product={product} />}
          </div>

          {/* Delivery Options */}
          {deliveryOptions.length > 0 && (
            <div className="delivery-options">
              <h4>Delivery Options</h4>
              {deliveryOptions.map((option, idx) => (
                <div key={idx} className="delivery-option">
                  <Truck size={16} />
                  <span>{option.method}: {option.fee}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trust Badges */}
          <div className="trust-badges">
            <div className="badge">
              <ShieldCheck size={20} />
              <span>Secure Checkout</span>
            </div>
            <div className="badge">
              <Lock size={20} />
              <span>Encrypted Payment</span>
            </div>
            <div className="badge">
              <Phone size={20} />
              <span>Call to Order</span>
            </div>
          </div>

          {/* Call to Order Button */}
          <button className="call-to-order-btn" onClick={handleCallOrder}>
            <Phone size={20} />
            Call to Order: +233 538 557 781
          </button>
        </div>
      </div>

      {/* Specifications Section */}
      {specItems.length > 0 && (
        <div className="specifications-section">
          <h2>Specifications</h2>
          <div className="specs-grid">
            {specItems.map((spec, idx) => (
              <div key={idx} className="spec-item">
                <span className="spec-label">{spec.label}</span>
                <span className="spec-value">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showChatGate && (
        <div className="account-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="chat-gate-title">
          <div className="account-gate-card">
            <button className="account-gate-close" onClick={() => setShowChatGate(false)} aria-label="Close">×</button>
            <MessageCircle size={34} aria-hidden="true" />
            <h2 id="chat-gate-title">Create a customer account to chat with this seller.</h2>
            <p>Your account keeps the conversation available across devices and lets you track replies.</p>
            <div className="account-gate-actions">
              <button className="btn-primary" onClick={() => navigate(`/register?redirect=${encodeURIComponent(`/chat/product/${product.id}?business=${sellerBusiness?.id || ''}`)}`)}>Create Customer Account</button>
              <button className="btn-secondary" onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/chat/product/${product.id}?business=${sellerBusiness?.id || ''}`)}`)}>Login</button>
            </div>
          </div>
        </div>
      )}
      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products-section">
          <h2>Related Products</h2>
          <div className="products-grid">
            {relatedProducts.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2>Customer Reviews</h2>
        
        {/* Review Form */}
        <div className="review-form-container">
          <h3>Leave a Review</h3>
          {reviewSuccess && (
            <div className="success-message">
              Thank you! Your review has been submitted and is pending approval.
            </div>
          )}
          <form onSubmit={handleSubmitReview} className="review-form">
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Rating</label>
              <select value={reviewRating} onChange={(e) => setReviewRating(parseInt(e.target.value))}>
                <option value={5}>5 Stars - Excellent</option>
                <option value={4}>4 Stars - Good</option>
                <option value={3}>3 Stars - Average</option>
                <option value={2}>2 Stars - Poor</option>
                <option value={1}>1 Star - Terrible</option>
              </select>
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Review</label>
              <textarea
                value={reviewMessage}
                onChange={(e) => setReviewMessage(e.target.value)}
                rows={4}
                required
              />
            </div>
            <button type="submit" disabled={isSubmittingReview}>
              {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="reviews-list">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-name">{review.customer_name}</span>
                  {renderStars(review.rating)}
                </div>
                {review.title && <h4 className="review-title">{review.title}</h4>}
                <p className="review-message">{review.message}</p>
              </div>
            ))
          ) : (
            <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
          )}
        </div>
      </div>
    </div>
  )
}
