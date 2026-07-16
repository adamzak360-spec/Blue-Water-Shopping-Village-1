import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProductById, getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import { ChevronLeft, ShoppingCart, Plus, Minus, Truck, ShieldCheck, Lock } from 'lucide-react'
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
          .slice(0, 4)
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

  // Prepare product images
  const productImages = product.image_url ? [product.image_url] : []
  const mainImage = productImages[mainImageIndex] || product.image_url

  const isOutOfStock = product.stock_quantity === 0 || product.status === 'inactive'

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
              <span className="info-value status-in-stock">In Stock</span>
            </div>
            <div className="info-row">
              <span className="info-label">Stock:</span>
              <span className="info-value">{product.stock_quantity} units available</span>
            </div>
            <div className="info-row">
              <span className="info-label">SKU:</span>
              <span className="info-value">BW-{product.id.substring(0, 8).toUpperCase()}</span>
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
            <span className="rating-score">0.0</span>
            <div className="rating-stars">☆☆☆☆☆</div>
            <span className="rating-count">0 reviews</span>
          </div>
          <p className="muted-text">No reviews yet.</p>
        </div>
      </div>

      {/* Related Products Section */}
      <div className="related-products-section">
        <h3 className="section-title">Related Products</h3>
        <div className="related-products-grid">
          {relatedProducts.map(item => (
            <Link key={item.id} to={`/product/${item.id}`} className="related-card">
              <div className="related-image-container">
                <img src={item.image_url} alt={item.name} />
              </div>
              <div className="related-info">
                <h4 className="related-name">{item.name}</h4>
                <span className="related-price">{formatCurrency(item.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="footer-actions">
        <button onClick={() => navigate('/products')} className="continue-shopping-btn">
          Continue Shopping
        </button>
      </div>
    </div>
  )
}
