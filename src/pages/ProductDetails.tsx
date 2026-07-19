import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProductById, getAllProducts } from '../services/productService'
import { getApprovedReviewsByProductId, submitReview, getProductRatingStats } from '../services/reviewService'
import type { Product, Review } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import { ChevronLeft, ShoppingCart, Plus, Minus, Truck, ShieldCheck, Lock } from 'lucide-react'
import './ProductDetails.css'

export default function ProductDetails() {
  const { productId } = useParams<{ productId: string }>()
  // const navigate = useNavigate()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalReviews: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [mainImageIndex, setMainImageIndex] = useState(0)

  // Review Form State
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    const loadProductAndReviews = async () => {
      try {
        if (!productId) {
          setError('Product not found')
          setIsLoading(false)
          return
        }

        // Load product data first
        try {
          const productData = await getProductById(productId)
          if (!productData) {
            setError('Product not found')
            setIsLoading(false)
            return
          }
          setProduct(productData)

          // Load related products from same category
          getAllProducts().then(allProducts => {
            const related = allProducts
              .filter(p => p.category === productData.category && p.id !== productId && p.status === 'active')
              .slice(0, 4)
            setRelatedProducts(related)
          }).catch(err => console.error('Failed to load related products:', err))

        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load product')
          setIsLoading(false)
          return
        }

        // Load reviews and stats independently
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

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product)
      }
      setQuantity(1)
    }
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change
    if (newQuantity > 0 && newQuantity <= (product?.stock_quantity || 1)) {
      setQuantity(newQuantity)
    }
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
      // Note: Reviews are pending approval, so we don't refresh the list immediately
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

  // Prepare product images
  const productImages = product.image_url ? [product.image_url] : []
  const mainImage = productImages[mainImageIndex] || product.image_url

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'

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

  return (
    <div className="product-details-page">
      <div className="product-main-layout">
        {/* Left Column: Image Gallery */}
        <div className="product-gallery-section">
          <div className="main-image-container">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="main-product-image"
              />
            ) : (
              <div className="product-image-placeholder-large">
                <span>No image available</span>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {productImages.length > 0 && (
            <div className="thumbnail-gallery">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  className={`thumbnail ${index === mainImageIndex ? 'active' : ''}`}
                  onClick={() => setMainImageIndex(index)}
                >
                  <img src={image} alt={`${product.name} thumbnail`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Info */}
        <div className="product-info-section">
          <div className="price-tag">
            {formatCurrency(product.price)}
          </div>

          <div className="availability-info">
            <div className="info-row">
              <span className="info-label">Availability:</span>
              <span className={`info-value ${isOutOfStock ? 'status-out-of-stock' : 'status-in-stock'}`}>
                {isOutOfStock ? 'Out of Stock' : 'In Stock'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Stock:</span>
              <span className="info-value">{product.stock_quantity} units available</span>
            </div>
            <div className="info-row">
              <span className="info-label">SKU:</span>
              <span className="info-value">BW-{product.id.substring(0, 8).toUpperCase()}</span>
            </div>
            <div className="info-row" style={{ marginTop: '0.5rem' }}>
              {renderStars(ratingStats.averageRating)}
              <span className="rating-count" style={{ marginLeft: '0.5rem' }}>
                ({ratingStats.totalReviews} reviews)
              </span>
            </div>
          </div>

          <div className="description-section">
            <h3 className="section-title">Description</h3>
            <p className="product-description">{product.description || product.name}</p>
          </div>

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
                disabled={quantity >= product.stock_quantity}
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
              Add to Cart
            </button>
          </div>

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

      {/* Specifications Section */}
      <div className="content-card specifications-card">
        <h3 className="card-title">Specifications</h3>
        <div className="card-content">
          <p className="muted-text">No specifications available.</p>
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
          
          <div className="reviews-list" style={{ marginTop: '2rem' }}>
            {reviews.length === 0 ? (
              <p className="muted-text">No reviews yet. Be the first to review this product!</p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="review-item" style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, marginRight: '1rem' }}>{review.customer_name}</span>
                      {renderStars(review.rating)}
                    </div>
                    <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {review.title && <h4 style={{ margin: '0.5rem 0', fontWeight: 600 }}>{review.title}</h4>}
                  <p style={{ color: '#4b5563', lineHeight: 1.5 }}>{review.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Review Form */}
          <div className="add-review-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '2px solid #f3f4f6' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Write a Review</h4>
            
            {reviewSuccess ? (
              <div style={{ backgroundColor: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                Thank you! Your review has been submitted and is pending approval.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Your Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={reviewName}
                      onChange={e => setReviewName(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Rating *</label>
                    <select 
                      value={reviewRating}
                      onChange={e => setReviewRating(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                    >
                      <option value="5">5 Stars - Excellent</option>
                      <option value="4">4 Stars - Good</option>
                      <option value="3">3 Stars - Average</option>
                      <option value="2">2 Stars - Poor</option>
                      <option value="1">1 Star - Terrible</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Review Title</label>
                  <input 
                    type="text" 
                    value={reviewTitle}
                    onChange={e => setReviewTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Your Review *</label>
                  <textarea 
                    required 
                    rows={4}
                    value={reviewMessage}
                    onChange={e => setReviewMessage(e.target.value)}
                    placeholder="What did you like or dislike?"
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', resize: 'vertical' }}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingReview}
                  className="submit-review-btn"
                  style={{ 
                    alignSelf: 'flex-start',
                    padding: '0.75rem 2rem',
                    backgroundColor: '#1f2937',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: isSubmittingReview ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingReview ? 0.7 : 1
                  }}
                >
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="related-products-section" style={{ marginTop: '4rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>Related Products</h3>
          <div className="related-products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
            {relatedProducts.map(p => (
              <Link key={p.id} to={`/products/${p.id}`} className="related-product-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ backgroundColor: '#f9fafb', borderRadius: '12px', overflow: 'hidden', height: '200px', marginBottom: '1rem' }}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No image</div>
                  )}
                </div>
                <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>{p.name}</h4>
                <p style={{ fontWeight: 700, color: '#1f2937' }}>{formatCurrency(p.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
