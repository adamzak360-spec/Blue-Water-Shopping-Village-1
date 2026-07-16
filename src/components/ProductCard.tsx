import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import StockStatus from './StockStatus'

interface ProductCardProps {
  product: Product
  showStock?: boolean
}

export default function ProductCard({ product, showStock = true }: ProductCardProps) {
  const { addToCart } = useCart()

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <div className="product-image-container">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="product-image" 
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const placeholder = target.parentElement?.querySelector('.product-image-placeholder')
                if (placeholder) {
                  placeholder.classList.add('visible')
                }
              }}
            />
          ) : null}
          <div className={`product-image-placeholder ${!product.image_url ? 'visible' : ''}`}>
            <span>No image</span>
          </div>
        </div>
      </Link>
      
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        
        <Link to={`/product/${product.id}`} className="product-name-link">
          <h4 className="product-name">{product.name}</h4>
        </Link>
        
        <p className="product-description">
          {product.description}
        </p>
        
        <div className="product-price-stock">
          <span className="product-price">{formatCurrency(product.price)}</span>
          {showStock && (
            <div className="stock-badge-wrapper">
              <StockStatus stock={product.stock_quantity} size="medium" />
            </div>
          )}
        </div>
        
        <div className="product-actions">
          <Link to={`/product/${product.id}`} className="view-details-btn">
            View Details
          </Link>
          <button 
            className="add-to-cart-btn"
            onClick={(e) => {
              e.preventDefault();
              addToCart(product);
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
