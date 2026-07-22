import { useState, useEffect, useRef } from 'react'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { ChevronLeft, ChevronRight, ArrowRight, Zap, TrendingUp, Star, Package, Award, Heart } from 'lucide-react'
import './Home.css'

const HERO_BANNERS = [
  {
    id: 1,
    title: 'Premium Collection 2026',
    subtitle: 'Experience Excellence',
    description: 'Discover our curated selection of high-end products designed for the modern lifestyle.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1600',
    cta: 'Shop Now',
    color: '#000000'
  },
  {
    id: 2,
    title: 'Flash Deals',
    subtitle: 'Limited Time Only',
    description: 'Up to 50% off on selected electronics and home appliances. Grab them before they are gone!',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1600',
    cta: 'View Deals',
    color: '#2563eb'
  },
  {
    id: 3,
    title: 'Fresh Arrivals',
    subtitle: 'New This Week',
    description: 'Check out our latest arrivals in fashion and accessories. Stay ahead of the trend.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1600',
    cta: 'Explore New',
    color: '#059669'
  }
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
  const [currentBanner, setCurrentBanner] = useState(0)
  
  const scrollRefs = {
    trending: useRef<HTMLDivElement>(null),
    bestSellers: useRef<HTMLDivElement>(null),
    newArrivals: useRef<HTMLDivElement>(null),
    flashDeals: useRef<HTMLDivElement>(null)
  } as const

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getAllProducts()
        setAllProducts(data)
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  // Auto-slide hero banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % HERO_BANNERS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const activeProducts = allProducts.filter(p => p.status === 'active')
  
  // Categorized products for horizontal sections
  const trendingProducts = activeProducts.slice(0, 8)
  const bestSellers = activeProducts.slice(4, 12)
  const newArrivals = activeProducts.slice(0, 6)
  const flashDeals = activeProducts.filter(p => p.price < 50).slice(0, 8)

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -400 : 400
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

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

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="home-page">
      {/* --- Hero Carousel --- */}
      <section className="hero-carousel">
        {HERO_BANNERS.map((banner, index) => (
          <div 
            key={banner.id} 
            className={`hero-slide ${index === currentBanner ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${banner.image})` }}
          >
            <div className="container hero-content">
              <span className="hero-subtitle animate-up">{banner.subtitle}</span>
              <h2 className="hero-title animate-up">{banner.title}</h2>
              <p className="hero-description animate-up">{banner.description}</p>
              <Link to="/products" className="hero-cta animate-up">
                {banner.cta} <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        ))}
        <div className="carousel-dots">
          {HERO_BANNERS.map((_, index) => (
            <button 
              key={index} 
              className={`dot ${index === currentBanner ? 'active' : ''}`}
              onClick={() => setCurrentBanner(index)}
            />
          ))}
        </div>
      </section>

      {/* --- Featured Categories --- */}
      <section className="section categories-section">
        <div className="container">
          <div className="category-dropdown-wrapper" ref={categoryDropdownRef}>
            <button 
              className={`category-dropdown-btn ${isCategoryDropdownOpen ? 'active' : ''}`}
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            >
              <span>Shop by Category</span>
              <ChevronRight size={20} className={isCategoryDropdownOpen ? 'rotate-90' : ''} />
            </button>
            
            {isCategoryDropdownOpen && (
              <div className="category-dropdown-menu">
                {dynamicCategories.map(category => (
                  <Link
                    key={category.name}
                    to={`/products?category=${encodeURIComponent(category.name)}`}
                    className="category-dropdown-item"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                    <span className="category-count">{category.count} items</span>
                  </Link>
                ))}
                <Link 
                  to="/products" 
                  className="category-dropdown-item view-all-item"
                  onClick={() => setIsCategoryDropdownOpen(false)}
                >
                  <span className="category-icon">📂</span>
                  <span className="category-name">View All Products</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- Horizontal Product Sections --- */}
      
      {/* Trending */}
      <ProductSection 
        title="Trending Now" 
        icon={<TrendingUp size={20} />} 
        products={trendingProducts} 
        scrollRef={scrollRefs.trending}
        onScroll={(dir) => scroll(scrollRefs.trending, dir)}
        isLoading={isLoading}
      />

      {/* Flash Deals */}
      <ProductSection 
        title="Flash Deals" 
        icon={<Zap size={20} color="#ef4444" />} 
        products={flashDeals} 
        scrollRef={scrollRefs.flashDeals}
        onScroll={(dir) => scroll(scrollRefs.flashDeals, dir)}
        isLoading={isLoading}
        className="flash-deals-section"
      />

      {/* Best Sellers */}
      <ProductSection 
        title="Best Sellers" 
        icon={<Award size={20} color="#f59e0b" />} 
        products={bestSellers} 
        scrollRef={scrollRefs.bestSellers}
        onScroll={(dir) => scroll(scrollRefs.bestSellers, dir)}
        isLoading={isLoading}
      />

      {/* New Arrivals */}
      <ProductSection 
        title="New Arrivals" 
        icon={<Package size={20} />} 
        products={newArrivals} 
        scrollRef={scrollRefs.newArrivals}
        onScroll={(dir) => scroll(scrollRefs.newArrivals, dir)}
        isLoading={isLoading}
      />

      {/* --- Why Reliable --- */}
      <section className="section why-reliable">
        <div className="container">
          <div className="why-grid">
            <div className="why-card">
              <div className="why-icon"><TrendingUp /></div>
              <h4>Premium Quality</h4>
              <p>Handpicked products from trusted suppliers worldwide.</p>
            </div>
            <div className="why-card">
              <div className="why-icon"><Zap /></div>
              <h4>Express Delivery</h4>
              <p>Get your orders delivered within 24 hours across the city.</p>
            </div>
            <div className="why-card">
              <div className="why-icon"><Star /></div>
              <h4>Exceptional Service</h4>
              <p>Our support team is available 24/7 to assist you.</p>
            </div>
            <div className="why-card">
              <div className="why-icon"><Heart /></div>
              <h4>Customer First</h4>
              <p>Easy returns and secure payments for peace of mind.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Newsletter --- */}
      <section className="section newsletter-section">
        <div className="container">
          <div className="newsletter-card">
            <div className="newsletter-content">
              <h3>Join the Reliable Community</h3>
              <p>Subscribe to receive updates, access to exclusive deals, and more.</p>
              <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                <input type="email" placeholder="Enter your email" required />
                <button type="submit">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

interface ProductSectionProps {
  title: string
  icon: React.ReactNode
  products: Product[]
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: (dir: 'left' | 'right') => void
  isLoading: boolean
  className?: string
}

function ProductSection({ title, icon, products, scrollRef, onScroll, isLoading, className = '' }: ProductSectionProps) {
  if (!isLoading && products.length === 0) return null

  return (
    <section className={`section product-horizontal-section ${className}`}>
      <div className="container">
        <div className="section-header">
          <div className="section-title-wrapper">
            {icon}
            <h3 className="section-title">{title}</h3>
          </div>
          <div className="scroll-controls">
            <button className="scroll-btn" onClick={() => onScroll('left')}><ChevronLeft size={20} /></button>
            <button className="scroll-btn" onClick={() => onScroll('right')}><ChevronRight size={20} /></button>
          </div>
        </div>
        
        <div className="horizontal-scroll-container" ref={scrollRef}>
          {isLoading ? (
            [...Array(6)].map((_, i) => <div key={i} className="product-card-skeleton horizontal" />)
          ) : (
            products.map(product => (
              <div key={product.id} className="horizontal-product-wrapper">
                <ProductCard product={product} />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
