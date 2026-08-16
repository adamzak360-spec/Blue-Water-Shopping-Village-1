import { useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { validateEmail } from '../utils/validation'
import { getPublicCatalogProducts } from '../services/productService'
import { shuffle } from '../utils/shuffle'
import { getActivePromotedProducts, type ActivePromotedProduct } from '../services/promotionService'
import type { Product } from '../types'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import CallToOrderBanner from '../components/CallToOrderBanner'
import AdSlot from '../components/AdSlot'
import { ChevronLeft, ChevronRight, ArrowRight, Zap, TrendingUp, Star, Package, Award, Heart } from 'lucide-react'
import './Home.css'

type NewsUpdate = {
  id: string
  title: string
  message: string
}

const HERO_BANNERS = [
  {
    id: 1,
    title: 'Premium Collection 2026',
    subtitle: 'Experience Excellence',
    description: 'Discover our curated selection of high-end products designed for the modern lifestyle.',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200&fm=webp',
    cta: 'Shop Now',
    color: '#000000'
  },
  {
    id: 2,
    title: 'Flash Deals',
    subtitle: 'Limited Time Only',
    description: 'Up to 50% off on selected electronics and home appliances. Grab them before they are gone!',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=1200&fm=webp',
    cta: 'View Deals',
    color: '#2563eb'
  },
  {
    id: 3,
    title: 'Fresh Arrivals',
    subtitle: 'New This Week',
    description: 'Check out our latest arrivals in fashion and accessories. Stay ahead of the trend.',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=1200&fm=webp',
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
  const [newsUpdates, setNewsUpdates] = useState<NewsUpdate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentBanner, setCurrentBanner] = useState(0)
  const [activePromotions, setActivePromotions] = useState<ActivePromotedProduct[]>([])
  const [showcaseMode, setShowcaseMode] = useState<'FREE' | 'PAID'>('PAID')
  const [showcaseEnabled, setShowcaseEnabled] = useState(true)
  const [freeShowcaseProductIds, setFreeShowcaseProductIds] = useState<string[]>([])
  const [freeShowcaseProductsOverride, setFreeShowcaseProductsOverride] = useState<Product[]>([])
  
  const scrollRefs = {
    trending: useRef<HTMLDivElement>(null),
    bestSellers: useRef<HTMLDivElement>(null),
    newArrivals: useRef<HTMLDivElement>(null),
    sponsored: useRef<HTMLDivElement>(null),
    flashDeals: useRef<HTMLDivElement>(null),
    featured: useRef<HTMLDivElement>(null)
  } as const

  useEffect(() => {
    const load = async () => {
      try {
        const [data, activePromotionData] = await Promise.all([
          getPublicCatalogProducts('HOME'),
          getActivePromotedProducts(),
        ])
        setAllProducts(shuffle(data))
        setActivePromotions(activePromotionData)
        if (isSupabaseConfigured && supabase) {
          const { data: showcaseConfig, error: showcaseConfigError } = await supabase.rpc('get_home_showcase_config')
          if (showcaseConfigError) {
            console.warn('Home showcase configuration unavailable:', showcaseConfigError.message)
          } else if (showcaseConfig) {
            const parsedMode = showcaseConfig.mode === 'FREE' ? 'FREE' : 'PAID'
            setShowcaseMode(parsedMode)
            setShowcaseEnabled(showcaseConfig.showcase_enabled !== false)
            const configuredProductIds = Array.isArray(showcaseConfig.product_ids) ? showcaseConfig.product_ids : []
            setFreeShowcaseProductIds(configuredProductIds)
            if (parsedMode === 'FREE' && configuredProductIds.length > 0) {
              const { data: selectedProducts, error: selectedProductsError } = await supabase
                .from('products')
                .select('*')
                .in('id', configuredProductIds)
                .eq('status', 'active')
              if (selectedProductsError) {
                console.warn('Selected free showcase products unavailable:', selectedProductsError.message)
              } else {
                setFreeShowcaseProductsOverride((selectedProducts || []) as Product[])
              }
            }
          }
          const { data: updates, error: updatesError } = await supabase
            .from('news_updates')
            .select('id, title, message')
            .order('starts_at', { ascending: false })
            .limit(3)
          if (updatesError) console.warn('News updates unavailable:', updatesError.message)
          else setNewsUpdates((updates || []) as NewsUpdate[])
        }
      } catch (err) {
        console.error('Failed to load homepage data:', err)
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
  const promotedProductIdSet = new Set(activePromotions.map(promotion => promotion.productId))
  const promotionIdByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion.promotionId]))
  const promotedProducts = shuffle(activeProducts.filter(product => promotedProductIdSet.has(product.id)))
  const freeShowcaseProducts = freeShowcaseProductIds
    .map(productId => freeShowcaseProductsOverride.find(product => product.id === productId) || activeProducts.find(product => product.id === productId))
    .filter((product): product is Product => Boolean(product))
  const featuredProducts = !showcaseEnabled
    ? []
    : showcaseMode === 'FREE' ? freeShowcaseProducts : promotedProducts
  const organicProducts = activeProducts.filter(product => !promotedProductIdSet.has(product.id))
  
  // Use disjoint organic pools so homepage sections do not repeatedly show the same products.
  // The shuffled catalog still changes the products shown after each fresh page load.
  const trendingProducts = organicProducts.slice(0, 8)
  const usedAfterTrending = new Set(trendingProducts.map(product => product.id))
  const newArrivals = organicProducts
    .filter(product => !usedAfterTrending.has(product.id))
    .slice(0, 6)
  const usedAfterNewArrivals = new Set([
    ...usedAfterTrending,
    ...newArrivals.map(product => product.id),
  ])
  const bestSellers = organicProducts
    .filter(product => !usedAfterNewArrivals.has(product.id))
    .slice(0, 8)
  const usedBeforeFlashDeals = new Set([
    ...usedAfterNewArrivals,
    ...bestSellers.map(product => product.id),
  ])
  const flashDeals = organicProducts
    .filter(product => product.price < 50 && !usedBeforeFlashDeals.has(product.id))
    .slice(0, 8)

  const [isFeaturedPaused, setIsFeaturedPaused] = useState(false)

  // Keep the curated showcase moving gently from one end to the other.
  useEffect(() => {
    const rail = scrollRefs.featured.current
    if (!rail || featuredProducts.length < 2 || isFeaturedPaused) return
    const timer = window.setInterval(() => {
      const maxScroll = rail.scrollWidth - rail.clientWidth
      if (maxScroll <= 0) return
      const nextPosition = rail.scrollLeft + 1
      rail.scrollTo({ left: nextPosition >= maxScroll ? 0 : nextPosition, behavior: 'auto' })
    }, 32)
    return () => window.clearInterval(timer)
  }, [featuredProducts.length, isFeaturedPaused])

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

      {newsUpdates.length > 0 && (
        <section className="section news-updates-section" aria-label="News updates">
          <div className="container">
            <div className="news-updates-strip">
              {newsUpdates.map((update) => (
                <article className="public-news-update" key={update.id}>
                  <span className="public-news-label">News Update</span>
                  <h3>{update.title}</h3>
                  <p>{update.message}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      {/* --- Call To Order Banner --- */}
      <CallToOrderBanner />

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

      <AdSlot placement="HOME_TOP" />

      {/* --- Horizontal Product Sections --- */}
      {promotedProducts.length > 0 && (
        <ProductSection
          title="Sponsored Products"
          icon={<Star size={20} color="#b7791f" />}
          products={promotedProducts.slice(0, 8)}
          scrollRef={scrollRefs.sponsored}
          onScroll={(dir) => scroll(scrollRefs.sponsored, dir)}
          isLoading={isLoading}
          isSponsored
          promotionIdByProductId={promotionIdByProductId}
          className="sponsored-products-section"
        />
      )}
      
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

      {/* Marketplace Favorites */}
      <ProductSection 
        title="Marketplace Favorites"
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

      {/* --- Call to Order Section --- */}
      <section className="section call-to-order-section">
        <div className="container">
          <div className="call-to-order-card">
            <h3>Need Help Placing an Order?</h3>
            <p>Our customer support team is ready to assist you</p>
            <a href="tel:+233595609966" className="call-to-order-link">
              📞 Call us: +233 59 560 9966
            </a>
          </div>
        </div>
      </section>

      {/* --- Managed Featured Showcase: intentionally between Call to Order and Newsletter --- */}
      {featuredProducts.length > 0 && (
        <section
          className="section featured-showcase-section"
          aria-label="Featured products"
          onMouseEnter={() => setIsFeaturedPaused(true)}
          onMouseLeave={() => setIsFeaturedPaused(false)}
          onFocus={() => setIsFeaturedPaused(true)}
          onBlur={() => setIsFeaturedPaused(false)}
        >
          <div className="container">
            <div className="featured-showcase-heading">
              <div>
                <span className="featured-showcase-eyebrow">Selected for you</span>
                <h3>{showcaseMode === 'FREE' ? 'Featured on Reliable' : 'Sponsored on Reliable'}</h3>
                <p>{showcaseMode === 'FREE' ? 'Explore products selected by our marketplace team.' : 'Explore products selected through Reliable promotions.'}</p>
              </div>
              <Link to="/products" className="featured-showcase-link">View all products <ArrowRight size={16} /></Link>
            </div>
            <div className="featured-showcase-rail" ref={scrollRefs.featured}>
              {featuredProducts.slice(0, 12).map((product) => (
                <div key={product.id} className="featured-showcase-card">
                  <ProductCard
                    product={product}
                    featuredMedia
                    showStock
                    isSponsored={showcaseMode === 'PAID'}
                    promotionId={showcaseMode === 'PAID' ? promotionIdByProductId.get(product.id) : undefined}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- Newsletter --- */}
      <section className="section newsletter-section">
        <div className="container">
          <div className="newsletter-card">
            <div className="newsletter-content">
              <h3>Join the Reliable Community</h3>
              <p>Subscribe to receive updates, access to exclusive deals, and more.</p>
              <form className="newsletter-form" onSubmit={async (e) => {
                e.preventDefault()
                const form = e.currentTarget
                const emailField = form.elements[0] as HTMLInputElement
                const emailInput = emailField.value.trim()
                const emailErr = validateEmail(emailInput)
                if (emailErr) {
                  alert(emailErr)
                  return
                }
                try {
                  if (!isSupabaseConfigured || !supabase) {
                    throw new Error('Supabase not configured')
                  }
                  const { error } = await supabase.from('newsletter_subscriptions').insert([{ email: emailInput }])
                  if (error) {
                    if (error.code === '23505') {
                      alert('You are already subscribed to the Reliable community!')
                    } else {
                      throw error
                    }
                  } else {
                    alert('Successfully subscribed! Welcome to the Reliable community.');
                    emailField.value = '';
                  }
                } catch (err: any) {
                  alert(err.message || 'Failed to subscribe. Please try again later.')
                }
              }}>
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
  isSponsored?: boolean
  promotionIdByProductId?: Map<string, string>
}

function ProductSection({ title, icon, products, scrollRef, onScroll, isLoading, className = '', isSponsored = false, promotionIdByProductId }: ProductSectionProps) {
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
                  <ProductCard
                    product={product}
                    isSponsored={isSponsored}
                    promotionId={isSponsored ? promotionIdByProductId?.get(product.id) : undefined}
                  />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
