import { useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { validateEmail } from '../utils/validation'
import { getBoundedPublicCatalogProducts } from '../services/productService'
import { shuffle } from '../utils/shuffle'
import { getActivePromotedProducts, type ActivePromotedProduct } from '../services/promotionService'
import type { Product } from '../types'
import { Link, useNavigate } from 'react-router-dom'
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

function getProductIdentity(product: Product): string {
  const normalizedName = (product.name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  return normalizedName || product.id
}

function takeDisjointProducts(products: Product[], usedKeys: Set<string>, limit: number): Product[] {
  const selected: Product[] = []
  for (const product of products) {
    const key = getProductIdentity(product)
    if (usedKeys.has(key)) continue
    usedKeys.add(key)
    selected.push(product)
    if (selected.length >= limit) break
  }
  return selected
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
  const [activePromotions, setActivePromotions] = useState<ActivePromotedProduct[]>([])
  const [showcaseMode, setShowcaseMode] = useState<'FREE' | 'PAID'>('PAID')
  const [showcaseEnabled, setShowcaseEnabled] = useState(true)
  const [freeShowcaseProductIds, setFreeShowcaseProductIds] = useState<string[]>([])
  const [freeShowcaseProductsOverride, setFreeShowcaseProductsOverride] = useState<Product[]>([])
  const [searchValue, setSearchValue] = useState('')
  const navigate = useNavigate()
  
  const scrollRefs = {
    trending: useRef<HTMLDivElement>(null),
    bestSellers: useRef<HTMLDivElement>(null),
    newArrivals: useRef<HTMLDivElement>(null),
    sponsored: useRef<HTMLDivElement>(null),
    flashDeals: useRef<HTMLDivElement>(null),
    featured: useRef<HTMLDivElement>(null),
    latest: useRef<HTMLDivElement>(null)
  } as const

  useEffect(() => {
    const load = async () => {
      try {
        const [data, activePromotionData] = await Promise.all([
          getBoundedPublicCatalogProducts('HOME', { limit: 12 }),
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

  // Reserve each homepage section from one shared identity pool so duplicate
  // database rows with the same product name do not repeat across the page.
  const usedProductKeys = new Set(featuredProducts.map(getProductIdentity))
  const organicProducts = activeProducts.filter(product =>
    !promotedProductIdSet.has(product.id) && !usedProductKeys.has(getProductIdentity(product)),
  )
  const latestProducts = takeDisjointProducts(organicProducts, usedProductKeys, 6)
  const trendingProducts = takeDisjointProducts(organicProducts, usedProductKeys, 8)
  const newArrivals = takeDisjointProducts(organicProducts, usedProductKeys, 6)
  const bestSellers = takeDisjointProducts(organicProducts, usedProductKeys, 8)
  const flashDeals = takeDisjointProducts(
    organicProducts.filter(product => product.price < 50),
    usedProductKeys,
    8,
  )

  const [isFeaturedPaused, setIsFeaturedPaused] = useState(false)
  const featuredDirectionRef = useRef<1 | -1>(1)
  const featuredResumeTimerRef = useRef<number | null>(null)

  const pauseFeaturedForInteraction = () => {
    if (featuredResumeTimerRef.current !== null) {
      window.clearTimeout(featuredResumeTimerRef.current)
      featuredResumeTimerRef.current = null
    }
    setIsFeaturedPaused(true)
  }

  const resumeFeaturedAfterInteraction = () => {
    if (featuredResumeTimerRef.current !== null) {
      window.clearTimeout(featuredResumeTimerRef.current)
    }
    featuredResumeTimerRef.current = window.setTimeout(() => {
      setIsFeaturedPaused(false)
      featuredResumeTimerRef.current = null
    }, 1200)
  }

  // Keep the curated showcase moving smoothly from one end to the other.
  // requestAnimationFrame avoids the repeated scrollTo/reset jump that caused vibration.
  useEffect(() => {
    const rail = scrollRefs.featured.current
    if (!rail || featuredProducts.length < 2) return

    let animationFrame = 0
    let previousTime = performance.now()
    const pixelsPerSecond = 28

    const animate = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50)
      previousTime = time

      if (!isFeaturedPaused) {
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
        if (maxScroll > 0) {
          const direction = featuredDirectionRef.current
          const nextPosition = rail.scrollLeft + direction * pixelsPerSecond * (elapsed / 1000)
          if (nextPosition >= maxScroll) {
            rail.scrollLeft = maxScroll
            featuredDirectionRef.current = -1
          } else if (nextPosition <= 0) {
            rail.scrollLeft = 0
            featuredDirectionRef.current = 1
          } else {
            rail.scrollLeft = nextPosition
          }
        }
      }

      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [featuredProducts.length, isFeaturedPaused])

  useEffect(() => {
    return () => {
      if (featuredResumeTimerRef.current !== null) {
        window.clearTimeout(featuredResumeTimerRef.current)
      }
    }
  }, [])

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
      <section className="home-discovery-section" aria-labelledby="home-discovery-title">
        <div className="container home-discovery-content">
          <p className="home-discovery-kicker">Reliable Premium Marketplace</p>
          <h1 id="home-discovery-title">Shop trusted products from independent sellers.</h1>
          <p className="home-discovery-description">Browse quality products, discover local stores, and find what you need faster.</p>
          <form className="home-search-form" onSubmit={(event) => {
            event.preventDefault()
            const query = searchValue.trim()
            navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products')
          }}>
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search products, categories and stores…"
              aria-label="Search products, categories and stores"
            />
            <button type="submit">Search</button>
          </form>
          <div className="home-discovery-actions">
            <Link to="/products" className="home-primary-action">View all products <ArrowRight size={18} /></Link>
            <Link to="/stores" className="home-secondary-action">Browse stores</Link>
          </div>
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

      {/* --- Latest products: one polished, swipeable, autoplaying row --- */}
      <ProductSection
        title="Latest Products"
        icon={<Package size={20} />}
        products={latestProducts}
        scrollRef={scrollRefs.latest}
        onScroll={(dir) => scroll(scrollRefs.latest, dir)}
        isLoading={isLoading}
        showStock
        autoPlay={false}
        className="latest-products-section"
      />

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
            <div
              className="featured-showcase-rail"
              ref={scrollRefs.featured}
              onPointerDown={pauseFeaturedForInteraction}
              onPointerUp={resumeFeaturedAfterInteraction}
              onPointerCancel={resumeFeaturedAfterInteraction}
              onPointerLeave={resumeFeaturedAfterInteraction}
              onWheel={resumeFeaturedAfterInteraction}
              aria-label="Featured products carousel. Swipe, drag, or select a product to view it."
            >
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
  showStock?: boolean
  autoPlay?: boolean
}

function ProductSection({ title, icon, products, scrollRef, onScroll, isLoading, className = '', isSponsored = false, promotionIdByProductId, showStock = false, autoPlay = true }: ProductSectionProps) {
  const [isPaused, setIsPaused] = useState(false)
  const directionRef = useRef<1 | -1>(1)
  const resumeTimerRef = useRef<number | null>(null)

  const pauseForInteraction = () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current)
    setIsPaused(true)
  }

  const resumeAfterInteraction = () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = window.setTimeout(() => {
      setIsPaused(false)
      resumeTimerRef.current = null
    }, 1400)
  }

  useEffect(() => {
    const rail = scrollRef.current
    if (!autoPlay || !rail || products.length < 2 || isLoading) return

    let animationFrame = 0
    let previousTime = performance.now()
    const pixelsPerSecond = 24

    const animate = (time: number) => {
      const elapsed = Math.min(time - previousTime, 50)
      previousTime = time
      if (!isPaused) {
        const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth)
        if (maxScroll > 0) {
          const nextPosition = rail.scrollLeft + directionRef.current * pixelsPerSecond * (elapsed / 1000)
          if (nextPosition >= maxScroll) {
            rail.scrollLeft = maxScroll
            directionRef.current = -1
          } else if (nextPosition <= 0) {
            rail.scrollLeft = 0
            directionRef.current = 1
          } else {
            rail.scrollLeft = nextPosition
          }
        }
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [autoPlay, isLoading, isPaused, products.length, scrollRef])

  useEffect(() => () => {
    if (resumeTimerRef.current !== null) window.clearTimeout(resumeTimerRef.current)
  }, [])

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
        
        <div
          className="horizontal-scroll-container"
          ref={scrollRef}
          onPointerDown={pauseForInteraction}
          onPointerUp={resumeAfterInteraction}
          onPointerCancel={resumeAfterInteraction}
          onPointerLeave={resumeAfterInteraction}
          onWheel={resumeAfterInteraction}
          aria-label={`${title} carousel. Swipe, drag, or select a product to view it.`}
        >
          {isLoading ? (
            [...Array(6)].map((_, i) => <div key={i} className="product-card-skeleton horizontal" />)
          ) : (
              products.map(product => (
                <div key={product.id} className="horizontal-product-wrapper">
                  <ProductCard
                    product={product}
                    isSponsored={isSponsored}
                    showStock={showStock}
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
