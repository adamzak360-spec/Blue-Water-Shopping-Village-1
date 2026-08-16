import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Heart } from 'lucide-react'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatCurrency } from '../utils/currency'
import StockStatus from './StockStatus'
import { recordPromotionClick, recordPromotionImpression } from '../services/promotionService'

interface ProductCardProps {
  product: Product
  showStock?: boolean
  isSponsored?: boolean
  promotionId?: string
  featuredMedia?: boolean
}

export default function ProductCard({ product, showStock = true, isSponsored = false, promotionId, featuredMedia = false }: ProductCardProps) {
  const { addToCart } = useCart()

  useEffect(() => {
    if (isSponsored && promotionId) void recordPromotionImpression(promotionId)
  }, [isSponsored, promotionId])
  const { isWishlisted, toggleWishlist } = useWishlist()
  const saved = isWishlisted(product.id)

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div className="product-image-container">
          {featuredMedia && product.video_urls?.[0] ? (
            <video
              src={product.video_urls[0]}
              className="product-image featured-product-video"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={`${product.name} product video`}
            />
          ) : product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="product-image"
              loading="lazy"
              style={{ objectFit: 'contain' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const placeholder = target.parentElement?.querySelector('.product-image-placeholder')
                if (placeholder) placeholder.classList.add('visible')
              }}
            />
          ) : null}
          <div className={`product-image-placeholder ${!product.image_url && !(featuredMedia && product.video_urls?.[0]) ? 'visible' : ''}`}>
            <span>No image</span>
          </div>
          <button
            type="button"
            className={`product-wishlist-btn ${saved ? 'active' : ''}`}
            aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            aria-pressed={saved}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void toggleWishlist(product.id)
            }}
          >
            <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
          </button>
        </div>
      </Link>

      <div className="product-info">
        {isSponsored && <span className="product-sponsored-badge">Sponsored</span>}
        <span className="product-category">{product.category}</span>
        <Link
          to={`/product/${product.id}`}
          className="product-name-link"
          onClick={() => {
            if (isSponsored && promotionId) void recordPromotionClick(promotionId)
          }}
        >
          <h4 className="product-name">{product.name}</h4>
        </Link>
        <p className="product-description">{product.description}</p>
        <div className="product-price-stock">
          <span className="product-price">{formatCurrency(product.price, product.currency || 'GHS')}</span>
          {showStock && (
            <div className="stock-badge-wrapper">
              <StockStatus stock={product.stock_quantity} size="medium" />
            </div>
          )}
        </div>
        <div className="product-actions">
          <Link to={`/product/${product.id}`} className="view-details-btn">View Details</Link>
          <button
            className="add-to-cart-btn"
            onClick={(e) => {
              e.preventDefault()
              addToCart(product)
            }}
            disabled={product.stock_quantity === 0 || product.status === 'inactive'}
          >
            {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}
