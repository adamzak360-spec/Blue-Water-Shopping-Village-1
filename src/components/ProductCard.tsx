import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { Heart, Leaf, ShoppingCart } from 'lucide-react'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatCurrency } from '../utils/currency'
import StockStatus from './StockStatus'
import { recordPromotionClick, recordPromotionImpression } from '../services/promotionService'
import { getOriginalImageUrl, getResponsiveImageSet, getOptimizedImageUrl } from '../utils/imageDelivery'

interface ProductCardProps {
  product: Product
  showStock?: boolean
  isSponsored?: boolean
  promotionId?: string
  featuredMedia?: boolean
}

interface MarketplaceListProductCardProps {
  product: Product
  showStock: boolean
  isSponsored: boolean
  promotionId?: string
  featuredMedia: boolean
  saved: boolean
  toggleWishlist: (productId: string) => Promise<unknown>
  addToCart: (product: Product) => void
}

function ProductImage({ product, featuredMedia, className = '' }: { product: Product; featuredMedia: boolean; className?: string }) {
  return (
    <>
      {featuredMedia && product.video_urls?.[0] ? (
        <video
          src={product.video_urls[0]}
          className={`product-image ${className}`}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-label={`${product.name} product video`}
        />
      ) : product.image_url ? (
        <img
          src={getOptimizedImageUrl(product.image_url, 540)}
          srcSet={getResponsiveImageSet(product.image_url)}
          alt={product.name}
          className={`product-image ${className}`}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 640px) 42vw, (max-width: 1024px) 280px, 320px"
          referrerPolicy="no-referrer"
          style={{ objectFit: 'contain' }}
          onError={(event) => {
            const target = event.currentTarget
            if (target.dataset.fallback !== '1') {
              target.dataset.fallback = '1'
              target.src = getOriginalImageUrl(product.image_url)
              target.removeAttribute('srcset')
              return
            }
            target.style.display = 'none'
            const placeholder = target.parentElement?.querySelector('.product-image-placeholder')
            if (placeholder) placeholder.classList.add('visible')
          }}
        />
      ) : null}
      <div className={`product-image-placeholder ${!product.image_url && !(featuredMedia && product.video_urls?.[0]) ? 'visible' : ''}`}>
        <span>No image</span>
      </div>
    </>
  )
}

function MarketplaceListProductCard({
  product,
  showStock,
  isSponsored,
  promotionId,
  featuredMedia,
  saved,
  toggleWishlist,
  addToCart,
}: MarketplaceListProductCardProps) {
  const rating = Math.max(0, Math.min(5, Number(product.average_rating || 0)))
  const roundedRating = Math.round(rating)
  const reviewCount = product.review_count || 0
  const stars = `${'★'.repeat(roundedRating)}${'☆'.repeat(5 - roundedRating)}`
  const deliveryFee = product.delivery_fee_tamale
  const deliveryText = typeof deliveryFee === 'number' && deliveryFee > 0
    ? `Delivery from ${formatCurrency(deliveryFee, product.currency || 'GHS')}`
    : 'Delivery available'

  return (
    <article className="product-card product-card--marketplace-list">
      <div className="product-list-media">
        <Link to={`/product/${product.id}`} className="product-image-link" aria-label={`View ${product.name}`}>
          <div className="product-image-container">
            <ProductImage product={product} featuredMedia={featuredMedia} />
          </div>
        </Link>
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

      <div className="product-list-content">
        <div className="product-list-topline">
          {isSponsored && <span className="product-list-label">Sponsored</span>}
          {product.card_style === 'marketplace-list' && <span className="product-list-style-label">Marketplace pick</span>}
        </div>
        <Link
          to={`/product/${product.id}`}
          className="product-list-name-link"
          onClick={() => {
            if (isSponsored && promotionId) void recordPromotionClick(promotionId)
          }}
        >
          <h3 className="product-list-name">{product.name}</h3>
        </Link>
        {product.description && <p className="product-list-description">{product.description}</p>}
        <div className="product-list-rating" aria-label={`${rating.toFixed(1)} out of 5 stars${reviewCount ? ` from ${reviewCount} reviews` : ''}`}>
          <span className="product-list-rating-number">{rating > 0 ? rating.toFixed(1) : 'New'}</span>
          {rating > 0 && <span className="product-list-stars" aria-hidden="true">{stars}</span>}
          {reviewCount > 0 && <span className="product-list-review-count">({reviewCount.toLocaleString()})</span>}
        </div>
        <div className="product-list-price-row">
          <span className="product-list-price">{formatCurrency(product.price, product.currency || 'GHS')}</span>
          {product.original_price && product.original_price > product.price && (
            <span className="product-list-original-price">{formatCurrency(product.original_price, product.currency || 'GHS')}</span>
          )}
        </div>
        <p className="product-list-delivery">{deliveryText}</p>
        {product.brand && <p className="product-list-meta">Brand: <strong>{product.brand}</strong></p>}
        {product.features && <p className="product-list-meta product-list-features">{product.features}</p>}
        {showStock && <div className="product-list-stock"><StockStatus stock={product.stock_quantity} size="medium" /></div>}
        <div className="product-list-actions">
          <Link
            to={`/product/${product.id}`}
            className="product-list-details-btn"
            onClick={() => {
              if (isSponsored && promotionId) void recordPromotionClick(promotionId)
            }}
          >
            View details
          </Link>
          <button
            type="button"
            className="product-list-cart-btn"
            onClick={() => addToCart(product)}
            disabled={product.stock_quantity === 0 || product.status === 'inactive'}
          >
            <ShoppingCart size={17} aria-hidden="true" />
            {product.stock_quantity === 0 ? 'Out of stock' : 'Add to cart'}
          </button>
        </div>
        <div className="product-list-trust"><Leaf size={15} aria-hidden="true" /> Reliable marketplace seller</div>
      </div>
    </article>
  )
}

export default function ProductCard({ product, showStock = true, isSponsored = false, promotionId, featuredMedia = false }: ProductCardProps) {
  const { addToCart } = useCart()

  useEffect(() => {
    if (isSponsored && promotionId) void recordPromotionImpression(promotionId)
  }, [isSponsored, promotionId])
  const { isWishlisted, toggleWishlist } = useWishlist()
  const saved = isWishlisted(product.id)

  if (product.card_style === 'marketplace-list') {
    return (
      <MarketplaceListProductCard
        product={product}
        showStock={showStock}
        isSponsored={isSponsored}
        promotionId={promotionId}
        featuredMedia={featuredMedia}
        saved={saved}
        toggleWishlist={toggleWishlist}
        addToCart={addToCart}
      />
    )
  }

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div className="product-image-container">
          <ProductImage product={product} featuredMedia={featuredMedia} />
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
          <Link
            to={`/product/${product.id}`}
            className="view-details-btn"
            onClick={() => {
              if (isSponsored && promotionId) void recordPromotionClick(promotionId)
            }}
          >
            View Details
          </Link>
          <button
            className="add-to-cart-btn"
            onClick={(event) => {
              event.preventDefault()
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
