import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProductById, getAllProducts } from '../services/productService'
import { getApprovedReviewsByProductId, submitReview, getProductRatingStats } from '../services/reviewService'
import type { Product, Review } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import { ChevronLeft, ShoppingCart, Plus, Minus, Truck, ShieldCheck, Lock, Share2, Heart, ZoomIn, Phone } from 'lucide-react'
import './ProductDetails.css'

export default function ProductDetails() {
  const { productId } = useParams<{ productId: string }>()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [sizeError, setSizeError] = useState('')

  // Review Form State
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)



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

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [product?.id])

  // Reset selected size when product changes
  useEffect(() => {
    setSelectedSize('')
    setSizeError('')
  }, [productId])

  const handleAddToCart = () => {
    if (!product) return

    // If product has sizes, require size selection
    if (product.has_sizes && !selectedSize) {
      setSizeError('Please select a size before adding to cart.')
      return
    }

    // If product has sizes, check stock for selected size
    if (product.has_sizes && product.sizes && selectedSize) {
      const sizeEntry = product.sizes.find(s => s.size === selectedSize)
      if (!sizeEntry || sizeEntry.stock <= 0) {
        setSizeError('The selected size is out of stock.')
        return
      }
      if (quantity > sizeEntry.stock) {
        setSizeError(`Only ${sizeEntry.stock} unit(s) available in size ${selectedSize}.`)
        return
      }
    }

    setSizeError('')
    const cartProduct = { ...product, selected_size: selectedSize || undefined }
    for (let i = 0; i < quantity; i++) {
      addToCart(cartProduct)
    }
    setQuantity(1)
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change
    if (!product) return

    let maxQty = product.stock_quantity

    // If product has sizes, limit to selected size stock
    if (product.has_sizes && selectedSize && product.sizes) {
      const sizeEntry = product.sizes.find(s => s.size === selectedSize)
      if (sizeEntry) {
        maxQty = sizeEntry.stock
      }
    }

    if (newQuantity > 0 && newQuantity <= maxQty) {
      setQuantity(newQuantity)
    }
  }

  const handleSizeSelect = (size: string) => {
    setSelectedSize(size)
    setSizeError('')
    setQuantity(1)
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId || !reviewName || !reviewMessage) return

    setIsSubmittingReview(true)
    try {
      await submitReview({
        product_id: productId,
        customer_name: reviewName,
        rating: reviewRating,
        title: reviewTitle,
        message: reviewMessage
      })
      setReviewSuccess(true)
      setReviewName('')
      setReviewTitle('')
      setReviewMessage('')
      setReviewRating(5)
    } catch (err) {
      console.error('Failed to submit review:', err)
      alert('Failed to submit review. Please try again.')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  if (isLoading) {
    return (
      <div className="product-details-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading product details...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-details-page">
        <div className="error-container">
          <h2>Oops! Something went wrong</h2>
          <p>{error || 'Product not found'}</p>
          <Link to="/products" className="back-button">
            <ChevronLeft size={20} />
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const productImages = [
    product.image_url,
    ...(product.gallery_urls || [])
  ].filter(Boolean)
  const mainImage = productImages[mainImageIndex] || product.image_url

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'

  // Get stock for a specific size
  const getStockForSize = (size: string): number => {
    if (!product.has_sizes || !product.sizes) return product.stock_quantity
    const sizeEntry = product.sizes.find(s => s.size === size)
    return sizeEntry?.stock || 0
  }

  const handleCallOrder = () => {
    window.location.href = 'tel:+233538557781'
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

  // Build delivery info
  const deliveryOptions: { method: string; fee: string }[] = []
  if (product.delivery_fee_tamale !== undefined && product.delivery_fee_tamale !== null) {
    deliveryOptions.push({ method: 'Tamale Delivery', fee: formatCurrency(product.delivery_fee_tamale) })
  }
  if (product.delivery_fee_stc !== undefined && product.delivery_fee_stc !== null) {
    deliveryOptions.push({ method: 'STC Transport', fee: formatCurrency(product.delivery_fee_stc) })
  }
  if (product.delivery_fee_vip !== undefined && product.delivery_fee_vip !== null) {
    deliveryOptions.push({ method: 'VIP Transport', fee: formatCurrency(product.delivery_fee_vip) })
  }
  if (product.delivery_fee_oa !== undefined && product.delivery_fee_oa !== null) {
    deliveryOptions.push({ method: 'OA Transport', fee: formatCurrency(product.delivery_fee_oa) })
  }
  if (product.delivery_fee_vvip !== undefined && product.delivery_fee_vvip !== null) {
    deliveryOptions.push({ method: 'VVIP Transport', fee: formatCurrency(product.delivery_fee_vvip) })
  }
  if (product.delivery_fee_fedex !== undefined && product.delivery_fee_fedex !== null) {
    deliveryOptions.push({ method: 'FedEx Delivery', fee: formatCurrency(product.delivery_fee_fedex) })
  }
  // Legacy support
  if (product.delivery_fee_greater_accra) {
    deliveryOptions.push({ method: 'Greater Accra Delivery', fee: formatCurrency(product.delivery_fee_greater_accra) })
  }
  if (product.delivery_fee_lesser_accra) {
    deliveryOptions.push({ method: 'Lesser Accra Delivery', fee: formatCurrency(product.delivery_fee_lesser_accra) })
  }

  return (
    <div className="product-details-page">
      <div className="product-main-layout">
        {/* Left Column: Image Gallery */}
        <div className="product-gallery-section">
          <div className="main-image-container">
            {mainImage ? (
              <div className="main-image-wrapper">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="main-product-image"
                />
                <button className="lightbox-btn" aria-label="Zoom image">
                  <ZoomIn size={20} />
                </button>
              </div>
            ) : (
              <div className="product-image-placeholder-large">
                <span>No image available</span>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {productImages.length > 1 && (
            <div className="thumbnail-gallery">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === mainImageIndex ? 'active' : ''}`}
                  onClick={() => setMainImageIndex(index)}
                >
                  <img src={image} alt={`${product.name} thumbnail ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info */}
        <div className="product-info-section">
          <div className="product-header">
            <h1 className="product-title">Buy {product.name}</h1>
            <p className="product-supplier">Buy {product.category}</p>
          </div>

          <div className="rating-section">
            {renderStars(ratingStats.averageRating)}
            <span className="rating-value">{ratingStats.averageRating.toFixed(1)}</span>
            <span className="rating-count">({ratingStats.totalReviews} reviews)</span>
          </div>

          {/* Price Section */}
          <div className="price-section">
            <div className="price-display">
              <span className="price-tag">{formatCurrency(product.price)}</span>
              {hasDiscount && (
                <>
                  <span className="original-price">{formatCurrency(product.original_price!)}</span>
                  <span className="discount-badge">-{discountPercent}%</span>
                </>
              )}
            </div>
            <span className="stock-status" style={{ color: isOutOfStock ? '#ef4444' : '#16a34a' }}>
              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
            </span>
          </div>

          {/* Size Selection */}
          {product.has_sizes && product.sizes && product.sizes.length > 0 && (
            <div className="size-selection-section">
              <h3 className="section-title">Select Size</h3>
              <div className="size-options">
                {product.sizes.map((sizeEntry) => {
                  const available = sizeEntry.stock > 0
                  return (
                    <button
                      key={sizeEntry.size}
                      className={`size-btn ${selectedSize === sizeEntry.size ? 'selected' : ''} ${!available ? 'unavailable' : ''}`}
                      onClick={() => available && handleSizeSelect(sizeEntry.size)}
                      disabled={!available}
                      title={available ? `${sizeEntry.size} - ${sizeEntry.stock} in stock` : `${sizeEntry.size} - Out of stock`}
                    >
                      {sizeEntry.size}
                    </button>
                  )
                })}
              </div>
              {sizeError && <p className="size-error">{sizeError}</p>}
            </div>
          )}

          {/* Description Section */}
          <div className="description-section">
            <h3 className="section-title">Description</h3>
            <div className="product-description">
              {product.description || 'No description available for this product.'}
            </div>
          </div>

          {/* Product Specifications */}
          {specItems.length > 0 && (
            <div className="specifications-section">
              <h3 className="section-title">Product Details</h3>
              <div className="specs-grid">
                {specItems.map((item, idx) => (
                  <div key={idx} className="spec-item">
                    <span className="spec-label">{item.label}</span>
                    <span className="spec-value" style={{
                      color: item.label === 'Availability'
                        ? (item.value === 'Out of Stock' ? '#ef4444' : '#16a34a')
                        : undefined,
                      textTransform: item.label === 'Product Status' ? 'capitalize' : undefined
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Information */}
          {deliveryOptions.length > 0 && (
            <div className="delivery-info-section">
              <h3 className="section-title">Delivery Options</h3>
              <div className="delivery-options-list">
                {deliveryOptions.map((opt, idx) => (
                  <div key={idx} className="delivery-option-item">
                    <Truck size={16} />
                    <span className="delivery-method-name">{opt.method}</span>
                    <span className="delivery-method-fee">{opt.fee}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specifications / Features / Material details */}
          {(product.specifications || product.features || product.material || product.warranty) && (
            <div className="additional-info-section">
              {product.specifications && (
                <div className="info-block">
                  <h3 className="section-title">Specifications</h3>
                  <p className="info-text">{product.specifications}</p>
                </div>
              )}
              {product.features && (
                <div className="info-block">
                  <h3 className="section-title">Features</h3>
                  <p className="info-text">{product.features}</p>
                </div>
              )}
            </div>
          )}

          {/* Purchase Controls */}
          <div className="purchase-controls">
            <div className="quantity-selector">
              <button
                className="qty-btn"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                className="qty-input"
                value={quantity}
                readOnly
              />
              <button
                className="qty-btn"
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= (product.has_sizes && selectedSize ? getStockForSize(selectedSize) : product.stock_quantity)}
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="add-to-cart-btn"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart size={20} />
              {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>

          <div className="action-buttons">
            <button className="action-btn">
              <Share2 size={18} /> Share
            </button>
            <button className="action-btn">
              <Heart size={18} /> Wishlist
            </button>
          </div>

          <button className="call-to-order-btn" onClick={handleCallOrder}>
            <Phone size={20} />
            Need help placing an order? Call us: +233 53 855 7781
          </button>

          <div className="trust-badges">
            <div className="trust-item">
              <Truck size={20} />
              <span>Fast Delivery</span>
            </div>
            <div className="trust-item">
              <ShieldCheck size={20} />
              <span>Quality Guaranteed</span>
            </div>
            <div className="trust-item">
              <Lock size={20} />
              <span>Secure Packaging</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="content-card reviews-card">
        <h3 className="card-title">Customer Reviews</h3>
        <div className="card-content">
          <div className="rating-summary">
            <span className="rating-score">{ratingStats.averageRating.toFixed(1)}</span>
            {renderStars(ratingStats.averageRating)}
            <span className="rating-count">{ratingStats.totalReviews} reviews</span>
          </div>

          <div className="reviews-list">
            {reviews.length === 0 ? (
              <p className="muted-text">No reviews yet. Be the first to review this product!</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="review-item">
                  <div className="review-header">
                    <div>
                      <span className="review-author">{review.customer_name}</span>
                      {renderStars(review.rating)}
                    </div>
                    <span className="review-date">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && <h4 className="review-title">{review.title}</h4>}
                  <p className="review-message">{review.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Review Form */}
          <div className="add-review-section">
            <h4 className="form-title">Write a Review</h4>

            {reviewSuccess ? (
              <div className="success-message">
                Thank you! Your review has been submitted and is pending approval.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input
                      type="text"
                      required
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rating *</label>
                    <select
                      value={reviewRating}
                      onChange={e => setReviewRating(parseInt(e.target.value))}
                    >
                      <option value="5">5 Stars - Excellent</option>
                      <option value="4">4 Stars - Good</option>
                      <option value="3">3 Stars - Average</option>
                      <option value="2">2 Stars - Poor</option>
                      <option value="1">1 Star - Terrible</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Review Title</label>
                  <input
                    type="text"
                    value={reviewTitle}
                    onChange={e => setReviewTitle(e.target.value)}
                    placeholder="Summarize your experience"
                  />
                </div>
                <div className="form-group">
                  <label>Your Review *</label>
                  <textarea
                    required
                    rows={4}
                    value={reviewMessage}
                    onChange={e => setReviewMessage(e.target.value)}
                    placeholder="Share your experience with this product"
                  />
                </div>
                <button type="submit" className="submit-review-btn" disabled={isSubmittingReview}>
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products-section">
          <h3 className="section-title">Related Products</h3>
          <div className="related-products-grid">
            {relatedProducts.map(p => (
              <Link key={p.id} to={`/product/${p.id}`} className="related-product-card">
                <div className="related-image-container">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} />
                  ) : (
                    <div className="no-image">No image</div>
                  )}
                </div>
                <div className="related-info">
                  <h4 className="related-name">{p.name}</h4>
                  <p className="related-price">{formatCurrency(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
