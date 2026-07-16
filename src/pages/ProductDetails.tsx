import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProductById, getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import { ChevronLeft, ShoppingCart, Plus, Minus } from 'lucide-react'
import './ProductDetails.css'

export default function ProductDetails() {
  const { productId } = useParams<{ productId: string }>()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [product, setProduct] = useState<Product | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [mainImageIndex, setMainImageIndex] = useState(0)

  useEffect(() => {
    const loadProduct = async () => {
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
        const allProducts = await getAllProducts()
        const related = allProducts
          .filter(p => p.category === productData.category && p.id !== productId && p.status === 'active')
          .slice(0, 6)
        setRelatedProducts(related)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product')
      } finally {
        setIsLoading(false)
      }
    }

    loadProduct()
  }, [productId])

  const handleAddToCart = () => {
    if (product) {
      for (let i = 0; i < quantity; i++) {
        addToCart(product)
      }
      setQuantity(1)
      // Optional: Show a toast notification or feedback
    }
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change
    if (newQuantity > 0 && newQuantity <= (product?.stock_quantity || 1)) {
      setQuantity(newQuantity)
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

  // Prepare product images (currently just one, but structure supports multiple)
  const productImages = product.image_url ? [product.image_url] : []
  const mainImage = productImages[mainImageIndex] || product.image_url

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 5)

  return (
    <div className="product-details-page">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb">
        <Link to="/products" className="breadcrumb-link">Products</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </div>

      {/* Back Button */}
      <button onClick={() => navigate('/products')} className="back-button-top">
        <ChevronLeft size={20} />
        Back to Products
      </button>

      <div className="product-details-container">
        {/* Left Column: Image Gallery */}
        <div className="product-gallery-section">
          <div className="main-image-container">
            {mainImage ? (
              <img
                src={mainImage}
                alt={product.name}
                className="main-product-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const placeholder = target.nextElementSibling
                  if (placeholder) {
                    placeholder.classList.add('visible')
                  }
                }}
              />
            ) : null}
            <div className="product-image-placeholder-large">
              <span>No image available</span>
            </div>
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
                  <img src={image} alt={`${product.name} ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Product Information */}
        <div className="product-info-section">
          {/* Product Header */}
          <div className="product-header">
            <span className="product-category-badge">{product.category}</span>
            <h1 className="product-title">{product.name}</h1>
            <div className="product-rating">
              <span className="rating-stars">★★★★★</span>
              <span className="rating-text">(No reviews yet)</span>
            </div>
          </div>

          {/* Price and Availability */}
          <div className="price-availability-section">
            <div className="price-block">
              <span className="price-label">Price</span>
              <span className="price-value">{formatCurrency(product.price)}</span>
            </div>

            <div className="availability-block">
              <span className="availability-label">Availability</span>
              {isOutOfStock ? (
                <span className="availability-out-of-stock">Out of Stock</span>
              ) : isLowStock ? (
                <span className="availability-low-stock">Low Stock ({product.stock_quantity} left)</span>
              ) : (
                <span className="availability-in-stock">In Stock ({product.stock_quantity} available)</span>
              )}
            </div>

            {product.stock_quantity > 0 && (
              <div className="stock-quantity-block">
                <span className="stock-label">Stock Quantity</span>
                <span className="stock-value">{product.stock_quantity} units</span>
              </div>
            )}
          </div>

          {/* Product Description */}
          <div className="description-section">
            <h3 className="section-title">Description</h3>
            <p className="product-description-full">{product.description}</p>
          </div>

          {/* Product Details */}
          <div className="details-section">
            <h3 className="section-title">Product Details</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{product.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Stock</span>
                <span className="detail-value">{product.stock_quantity} units</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <span className={`detail-value status-${product.status}`}>
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
              </div>
              {product.low_stock_threshold && (
                <div className="detail-item">
                  <span className="detail-label">Low Stock Threshold</span>
                  <span className="detail-value">{product.low_stock_threshold} units</span>
                </div>
              )}
            </div>
          </div>

          {/* Specifications Section */}
          <div className="specifications-section">
            <h3 className="section-title">Specifications</h3>
            <div className="specifications-content">
              <p className="no-specs-message">No specifications available.</p>
            </div>
          </div>

          {/* Quantity Selector and Add to Cart */}
          {!isOutOfStock && (
            <div className="purchase-section">
              <div className="quantity-selector">
                <span className="quantity-label">Quantity</span>
                <div className="quantity-controls">
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus size={18} />
                  </button>
                  <input
                    type="number"
                    className="quantity-input"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      if (val > 0 && val <= product.stock_quantity) {
                        setQuantity(val)
                      }
                    }}
                    min="1"
                    max={product.stock_quantity}
                  />
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <button
                className="add-to-cart-button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart size={20} />
                Add to Cart
              </button>
            </div>
          )}

          {isOutOfStock && (
            <div className="out-of-stock-message">
              <p>This product is currently out of stock</p>
            </div>
          )}

          {/* Continue Shopping */}
          <div className="continue-shopping">
            <Link to="/products" className="continue-shopping-link">
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="reviews-section">
        <h2 className="section-title">Customer Reviews</h2>
        <div className="reviews-content">
          <p className="no-reviews-message">No reviews yet.</p>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="related-products-section">
          <div className="section-header">
            <h2 className="section-title">Related Products</h2>
            <Link to={`/products?category=${encodeURIComponent(product.category)}`} className="view-all-link">
              View All in {product.category} →
            </Link>
          </div>

          <div className="related-products-grid">
            {relatedProducts.map(relatedProduct => (
              <Link
                key={relatedProduct.id}
                to={`/product/${relatedProduct.id}`}
                className="related-product-card"
              >
                {relatedProduct.image_url ? (
                  <img
                    src={relatedProduct.image_url}
                    alt={relatedProduct.name}
                    className="related-product-image"
                  />
                ) : (
                  <div className="related-product-image-placeholder">
                    <span>No image</span>
                  </div>
                )}
                <div className="related-product-info">
                  <h4 className="related-product-name">{relatedProduct.name}</h4>
                  <span className="related-product-price">{formatCurrency(relatedProduct.price)}</span>
                  {relatedProduct.stock_quantity === 0 ? (
                    <span className="related-product-status out-of-stock">Out of Stock</span>
                  ) : (
                    <span className="related-product-status in-stock">In Stock</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
