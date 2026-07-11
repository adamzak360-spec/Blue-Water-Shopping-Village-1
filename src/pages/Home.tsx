import { useState, useEffect } from 'react'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../utils/currency'
import './Home.css'

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const all = await getAllProducts()
        // Show up to 6 most recent active products on home
        const featured = all.filter(p => p.status === 'active').slice(0, 6)
        setProducts(featured)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }
    loadFeatured()
  }, [])

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h2>Blue Water Shopping Village</h2>
          <p className="hero-subtitle">Your modern supermarket experience</p>
          <p className="hero-description">
            Discover fresh products, great deals, and exceptional service at your neighborhood supermarket.
          </p>
          <Link to="/products" className="hero-cta">
            Browse Products
          </Link>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-section">
        <div className="featured-header">
          <h3>Featured Products</h3>
          <Link to="/products" className="view-all-link">View All &rarr;</Link>
        </div>

        {isLoading ? (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="product-card-skeleton">
                <div className="skeleton-image" />
                <div className="skeleton-text short" />
                <div className="skeleton-text" />
                <div className="skeleton-price" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="error-state">
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <h3>No products available yet</h3>
            <p>Check back soon for great deals and fresh products.</p>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="product-image" />
                ) : (
                  <div className="product-image-placeholder">
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
                    <span className="product-price">{formatCurrency(product.price)}</span>
                    {product.stock_quantity === 0 && (
                      <span className="out-of-stock-badge">Out of Stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="feature-card">
          <div className="feature-icon">&#127793;</div>
          <h4>Fresh Quality</h4>
          <p>We source the freshest products daily to ensure quality you can trust.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">&#128176;</div>
          <h4>Great Prices</h4>
          <p>Competitive pricing with regular deals and discounts for our loyal customers.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">&#128722;</div>
          <h4>Wide Selection</h4>
          <p>From groceries to household essentials, find everything you need in one place.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">&#128522;</div>
          <h4>Exceptional Service</h4>
          <p>Our friendly team is always ready to help you find what you need.</p>
        </div>
      </section>
    </div>
  )
}
