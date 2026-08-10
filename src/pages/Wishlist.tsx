import { useEffect, useMemo, useState } from 'react'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { formatCurrency } from '../utils/currency'
import './Wishlist.css'

export default function Wishlist() {
  const { productIds, isLoading: wishlistLoading, removeFromWishlist } = useWishlist()
  const { addToCart } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setIsLoading(true)
    getAllProducts()
      .then((catalog) => {
        if (active) setProducts(catalog.filter((product) => productIds.has(product.id)))
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load your wishlist.')
      })
      .finally(() => active && setIsLoading(false))
    return () => { active = false }
  }, [productIds])

  const savedProducts = useMemo(() => products.filter((product) => productIds.has(product.id)), [productIds, products])

  if (wishlistLoading || isLoading) {
    return <section className="wishlist-page container"><div className="wishlist-loading">Loading your wishlist…</div></section>
  }

  if (error) {
    return <section className="wishlist-page container"><div className="wishlist-message error">{error}</div></section>
  }

  return (
    <section className="wishlist-page container">
      <div className="wishlist-header">
        <div>
          <span className="eyebrow">Your saved products</span>
          <h1>Wishlist</h1>
          <p>{savedProducts.length === 0 ? 'Save products you love and come back to them anytime.' : `${savedProducts.length} saved ${savedProducts.length === 1 ? 'product' : 'products'}`}</p>
        </div>
        <Link to="/products" className="wishlist-continue">Continue shopping</Link>
      </div>

      {savedProducts.length === 0 ? (
        <div className="wishlist-empty">
          <Heart size={48} />
          <h2>Your wishlist is empty</h2>
          <p>Tap the heart on any product to save it here for later.</p>
          <Link to="/products" className="wishlist-shop-btn"><ShoppingBag size={18} /> Browse products</Link>
        </div>
      ) : (
        <div className="wishlist-grid">
          {savedProducts.map((product) => (
            <article className="wishlist-card" key={product.id}>
              <Link to={`/product/${product.id}`} className="wishlist-card-image">
                {product.image_url ? <img src={product.image_url} alt={product.name} /> : <span>No image</span>}
              </Link>
              <div className="wishlist-card-body">
                <span className="product-category">{product.category}</span>
                <Link to={`/product/${product.id}`}><h2>{product.name}</h2></Link>
                <strong>{formatCurrency(product.price)}</strong>
                <div className="wishlist-card-actions">
                  <button className="add-to-cart-btn" onClick={() => addToCart(product)} disabled={product.stock_quantity === 0 || product.status !== 'active'}>
                    {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                  <button className="wishlist-remove-btn" aria-label={`Remove ${product.name} from wishlist`} onClick={() => void removeFromWishlist(product.id)}>
                    <Trash2 size={18} /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
