import { useState, useEffect } from 'react'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import './Home.css'
// import '../components/ProductGrid.css' - Moved to main.tsx for priority

const TESTIMONIALS = [
  {
    name: 'Abena Mensah',
    location: 'East Legon, Accra',
    text: 'I love shopping here! The products are always fresh and delivery is super fast. My go-to supermarket.',
    rating: 5,
  },
  {
    name: 'Kwame Asante',
    location: 'Spintex Road',
    text: 'Great prices and excellent customer service. The online ordering system is very convenient.',
    rating: 5,
  },
  {
    name: 'Efua Darko',
    location: 'Tema',
    text: 'Blue Water has changed how I shop for groceries. Everything arrives in perfect condition every time.',
    rating: 5,
  },
]

const CATEGORY_ICONS: Record<string, string> = {
  'New Cars Collection': '🚗',
  'Motorcycle': '🏍️',
  'Fruits': '🍎',
  'Fruit': '🍌',
  'Sponge': '🧽',
  'Flask': '🧪',
  'Software Developer/Engineer': '💻',
  'Groceries': '🌾',
  'Electronics': '💻',
  'Fashion': '👗',
  'Home & Garden': '🏡',
  'Sports': '⚽',
  'Health & Beauty': '💄',
}

function getCategoryIcon(name: string): string {
  if (CATEGORY_ICONS[name]) return CATEGORY_ICONS[name]
  const lower = name.toLowerCase()
  if (lower.includes('fruit') || lower.includes('food')) return '🍎'
  if (lower.includes('car') || lower.includes('vehicle') || lower.includes('bike') || lower.includes('motor')) return '🚗'
  if (lower.includes('electronics') || lower.includes('tech') || lower.includes('soft')) return '💻'
  if (lower.includes('fashion') || lower.includes('cloth')) return '👗'
  if (lower.includes('home') || lower.includes('garden')) return '🏡'
  if (lower.includes('sport')) return '⚽'
  if (lower.includes('health') || lower.includes('beauty')) return '💄'
  return '🌟'
}

export default function Home() {
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllProducts()
        setAllProducts(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const activeProducts = allProducts.filter(p => p.status === 'active')
  const featuredProducts = activeProducts.slice(0, 8)
  const newArrivals = activeProducts.slice(0, 4)

  // Dynamically extract categories from database products
  const categoryCounts: Record<string, number> = {}
  activeProducts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1
  })
  const dynamicCategories = Object.entries(categoryCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      icon: getCategoryIcon(name),
      count,
    }))

  return (
    <div className="home-page">
      {/* ── Hero Section ── */}
      <section className="hero-section">
        <div className="hero-bg-pattern" />
        <div className="hero-content">
          <h2 className="hero-title">Blue Water Shopping Village</h2>
          <p className="hero-subtitle">Your Modern Supermarket Experience</p>
          <p className="hero-description">
            Discover fresh products, great deals, and exceptional service at your neighbourhood supermarket.
            We bring quality groceries and household essentials straight to your doorstep.
          </p>
          <div className="hero-cta-group">
            <Link to="/products" className="hero-cta hero-cta-primary">
              Shop Now
            </Link>
            <Link to="/products" className="hero-cta hero-cta-secondary">
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Categories ── */}
      <section className="section categories-section">
        <div className="section-container">
          <div className="section-header">
            <h3 className="section-title">Featured Categories</h3>
            <Link to="/products" className="view-all-link">View All Products &rarr;</Link>
          </div>
          {isLoading ? (
            <div className="categories-grid loading">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="category-card-skeleton" />
              ))}
            </div>
          ) : dynamicCategories.length === 0 ? (
            <div className="empty-categories">
              <p>Categories will appear here once products are added.</p>
            </div>
          ) : (
            <div className="categories-grid">
              {dynamicCategories.map(category => (
                <Link
                  key={category.name}
                  to={`/products?category=${encodeURIComponent(category.name)}`}
                  className="category-card"
                >
                  <span className="category-icon">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{category.count} product{category.count !== 1 ? 's' : ''}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="section featured-section">
        <div className="section-container">
          <div className="section-header">
            <h3 className="section-title">Featured Products</h3>
            <Link to="/products" className="view-all-link">View All &rarr;</Link>
          </div>

          {isLoading ? (
            <div className="products-grid loading">
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
          ) : featuredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>No products available yet</h3>
              <p>Check back soon for great deals and fresh products.</p>
            </div>
          ) : (
            <div className="products-grid">
              {featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── New Arrivals ── */}
      <section className="section new-arrivals-section">
        <div className="section-container">
          <div className="section-header">
            <h3 className="section-title">New Arrivals</h3>
            <Link to="/products" className="view-all-link">View All &rarr;</Link>
          </div>

          {isLoading ? (
            <div className="products-grid loading">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="product-card-skeleton">
                  <div className="skeleton-image" />
                  <div className="skeleton-text short" />
                  <div className="skeleton-text" />
                  <div className="skeleton-price" />
                </div>
              ))}
            </div>
          ) : newArrivals.length === 0 ? (
            <div className="empty-state">
              <h3>No new arrivals yet</h3>
              <p>We are working hard to bring you the latest products.</p>
            </div>
          ) : (
            <div className="products-grid">
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Why Shop With Us ── */}
      <section className="section why-shop-section">
        <div className="section-container">
          <div className="section-header section-header-centered">
            <h3 className="section-title">Why Shop With Us</h3>
            <p className="section-subtitle">We are committed to providing the best shopping experience</p>
          </div>
          <div className="why-shop-grid">
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h4>Quality Guaranteed</h4>
              <p>Every product is carefully inspected before reaching you. We guarantee freshness and quality.</p>
            </div>
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                  <path d="M12 18V6" />
                </svg>
              </div>
              <h4>Affordable Prices</h4>
              <p>Competitive pricing with regular deals and discounts for our loyal customers.</p>
            </div>
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h4>Fast Delivery</h4>
              <p>Quick and reliable delivery straight to your doorstep, available across Greater Accra.</p>
            </div>
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <h4>Fresh Products</h4>
              <p>We source the freshest products daily from trusted local and international suppliers.</p>
            </div>
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h4>Secure Shopping</h4>
              <p>Your personal and payment information is protected with industry-standard security measures.</p>
            </div>
            <div className="why-shop-card">
              <div className="why-shop-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <h4>Exceptional Service</h4>
              <p>Our friendly team is always ready to help you find exactly what you need.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Promotional Banner ── */}
      <section className="section promo-section">
        <div className="section-container">
          <div className="promo-banner">
            <div className="promo-content">
              <span className="promo-tag">Coming Soon</span>
              <h3 className="promo-title">Exciting Deals Await You</h3>
              <p className="promo-description">
                Stay tuned for amazing discounts, seasonal offers, and exclusive deals on your favourite products. 
                Subscribe to our newsletter to be the first to know!
              </p>
              <Link to="/products" className="promo-btn">Shop Now</Link>
            </div>
            <div className="promo-decoration">
              <div className="promo-circle" />
              <div className="promo-circle-small" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="section testimonials-section">
        <div className="section-container">
          <div className="section-header section-header-centered">
            <h3 className="section-title">What Our Customers Say</h3>
            <p className="section-subtitle">Trusted by thousands of happy customers across Accra</p>
          </div>
          <div className="testimonials-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(t.rating)].map((_, j) => (
                    <span key={j} className="star">★</span>
                  ))}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="author-avatar">{t.name.charAt(0)}</div>
                  <div className="author-info">
                    <h5 className="author-name">{t.name}</h5>
                    <p className="author-location">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="section newsletter-section">
        <div className="section-container">
          <div className="newsletter-box">
            <div className="newsletter-content">
              <h3 className="newsletter-title">Stay Updated</h3>
              <p className="newsletter-description">
                Subscribe to our newsletter for the latest products, exclusive deals, and special offers delivered to your inbox.
              </p>
            </div>
            <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Enter your email address" className="newsletter-input" />
              <button type="submit" className="newsletter-btn">Subscribe</button>
            </form>
            <p className="newsletter-note">We respect your privacy. Unsubscribe at any time.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
