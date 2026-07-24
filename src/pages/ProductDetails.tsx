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

  // Review Form State
  const [reviewName, setReviewName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewMessage, setReviewMessage] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSuccess, setReviewSuccess] = useState(false)

  useEffect(() => {
    // Scroll to top when component mounts
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

        // Load related products from same category
        getAllProducts().then(allProducts => {
          const related = allProducts
            .filter(p => p.category === productData.category && p.id !== productId && p.status === 'active')
            .slice(0, 4)
          setRelatedProducts(related)
        }).catch(err => console.error('Failed to load related products:', err))

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

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [product?.id])

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
  const productImages = [
    product.image_url,
    ...(product.gallery_urls || [])
  ].filter(Boolean)
  const mainImage = productImages[mainImageIndex] || product.image_url

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'

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
          <div className="product-header">
            <h1 className="product-title">Buy {product.name}</h1>
            <p className="product-supplier">Buy {product.category}</p>
          </div>

          <div className="rating-section">
            {renderStars(ratingStats.averageRating)}
            <span className="rating-value">{ratingStats.averageRating.toFixed(1)}</span>
            <span className="rating-count">({ratingStats.totalReviews} reviews)</span>
          </div>

          <div className="price-section">
            <span className="price-tag">{formatCurrency(product.price)}</span>
            <span className="stock-status" style={{ color: isOutOfStock ? '#ef4444' : '#16a34a' }}>
              {isOutOfStock ? 'Out of Stock' : 'In Stock'}
            </span>
          </div>

          <div className="description-section">
            <h3 className="section-title">Description</h3>
            <p className="product-description">{product.description || product.name}</p>
          </div>

          {/* Product Specifications */}
          <div className="specifications-section">
            <h3 className="section-title">Product Details</h3>
            <div className="specs-grid">
              <div className="spec-item">
                <span className="spec-label">Category</span>
                <span className="spec-value">{product.category}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Stock Available</span>
                <span className="spec-value">{product.stock_quantity} units</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Product Status</span>
                <span className="spec-value" style={{ textTransform: 'capitalize' }}>{product.status}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Availability</span>
                <span className="spec-value" style={{ color: isOutOfStock ? '#ef4444' : '#16a34a' }}>
                  {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                </span>
              </div>
            </div>
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
