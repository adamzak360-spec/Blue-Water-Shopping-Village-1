import type { Product } from '../types'
import { useCart } from '../context/CartContext'

interface ProductCardProps {
  product: Product
  showStock?: boolean
}

export default function ProductCard({ product, showStock = true }: ProductCardProps) {
  const { addToCart } = useCart()
  return (
    <div className="product-card">
      {product.image_url ? (
        <>
          <img 
            src={product.image_url} 
            alt={product.name} 
            className="product-image" 
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const placeholder = target.nextElementSibling
              if (placeholder) {
                placeholder.classList.add('visible')
              }
            }}
          />
          <div className="product-image-placeholder">
            <span>No image</span>
          </div>
        </>
      ) : (
        <div className="product-image-placeholder visible">
          <span>No image</span>
        </div>
      )}
      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h4 className="product-name">{product.name}</h4>
        <p className="product-description">
          {product.description.length > 80
            ? product.description.substring(0, 80) + '...'
            : product.description}
        </p>
        <div className="product-footer">
          <span className="product-price">${product.price.toFixed(2)}</span>
          {showStock && (
            product.stock_quantity === 0
              ? <span className="out-of-stock-badge">Out of Stock</span>
              : <span className="in-stock-badge">{product.stock_quantity} in stock</span>
          )}
        </div>
        <button 
          className="add-to-cart-btn"
          onClick={() => addToCart(product)}
          disabled={product.stock_quantity === 0}
        >
          {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  )
}
