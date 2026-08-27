import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LogoutButton } from './components/Logout'
import { useCart } from './context/CartContext'
import { useWishlist } from './context/WishlistContext'
import { CartSidebar } from './components/CartSidebar'
import { 
  Menu, 
  Search, 
  User, 
	  Heart, 
	  ShoppingCart, 
	  X,
  Home as HomeIcon,
  Package,
  Tag,
  Settings,
  HelpCircle,
  Phone,
  Info,
  Newspaper,
  Store as StoreIcon,
  BookOpen
} from 'lucide-react'
import './App.css'
import { lazy, Suspense, useLayoutEffect } from 'react'
import AuthOutageNotice from './components/AuthOutageNotice'
import Footer from './components/Footer'
import NotificationBell from './components/NotificationBell'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// Configure NProgress
NProgress.configure({ showSpinner: false, speed: 400, minimum: 0.2 })

// Lazy load pages for faster initial load
const Home = lazy(() => import('./pages/Home'))
const Admin = lazy(() => import('./pages/Admin'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Products = lazy(() => import('./pages/Products'))
const Checkout = lazy(() => import('./pages/Checkout'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Delivery = lazy(() => import('./pages/Delivery'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Terms = lazy(() => import('./pages/Terms'))
const Returns = lazy(() => import('./pages/Returns'))
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'))
const CustomerProfile = lazy(() => import('./pages/CustomerProfile'))
const CustomerOrders = lazy(() => import('./pages/CustomerOrders'))
const OrderDetails = lazy(() => import('./pages/OrderDetails'))
const CustomerSettings = lazy(() => import('./pages/CustomerSettings'))
const ProductDetails = lazy(() => import('./pages/ProductDetails'))
const BusinessStorefront = lazy(() => import('./pages/BusinessStorefront'))
const StoresDirectory = lazy(() => import('./pages/StoresDirectory'))
const Articles = lazy(() => import('./pages/Articles'))
const ArticleDetails = lazy(() => import('./pages/ArticleDetails'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const ProductChat = lazy(() => import('./pages/ProductChat'))
const SellerRegister = lazy(() => import('./pages/SellerRegister'))
const AdvertiserOnboarding = lazy(() => import('./pages/AdvertiserOnboarding'))

// Prefetch functions for near-instant transitions
const prefetchHome = () => import('./pages/Home')
const prefetchDashboard = () => import('./pages/Admin')
const prefetchSellerRegister = () => import('./pages/SellerRegister')
const prefetchProducts = () => import('./pages/Products')
const prefetchAbout = () => import('./pages/About')
const prefetchContact = () => import('./pages/Contact')
const prefetchFAQ = () => import('./pages/FAQ')
const prefetchArticles = () => import('./pages/Articles')
const prefetchLogin = () => import('./pages/Login')
import TermsPopup from './components/TermsPopup'
import WhatsAppButton from './components/WhatsAppButton'
import InstallAppPrompt from './components/InstallAppPrompt'
const LOCAL_MARKETPLACE_LOGO = '/logo-square.png?v=reliable-exact-logo-v1'
const RELIABLE_BRAND_YELLOW = '#FFC400'
const LEGACY_LOGO_MARKERS = ['logo-1786897784238.png', 'logo-1786796959602.png']
const isLegacyMarketplaceLogo = (url: string | null | undefined) => Boolean(url && LEGACY_LOGO_MARKERS.some((marker) => url.includes(marker)))

function App() {
  return <AppShell />
}

function AppShell() {
  const { user, isAdmin, role } = useAuth()
  const { cartCount, setIsCartOpen } = useCart()
  const { wishlistCount } = useWishlist()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [marketplaceLogoUrl, setMarketplaceLogoUrl] = useState(LOCAL_MARKETPLACE_LOGO)
  const [marketplaceLogoShape, setMarketplaceLogoShape] = useState<'wide' | 'tall' | 'square'>('square')
  const [marketplaceFaviconUrl, setMarketplaceFaviconUrl] = useState(LOCAL_MARKETPLACE_LOGO)

  const isAdminRoute = location.pathname.startsWith('/admin')
  const isCustomerRoute = location.pathname.startsWith('/customer')
  const isHomeRoute = location.pathname === '/'

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleLogoUpdate = (event: Event) => {
      const nextUrl = (event as CustomEvent<string | null>).detail
      setMarketplaceLogoUrl(nextUrl && !isLegacyMarketplaceLogo(nextUrl) ? nextUrl : LOCAL_MARKETPLACE_LOGO)
    }
    const handleFaviconUpdate = (event: Event) => {
      const nextUrl = (event as CustomEvent<string | null>).detail
      setMarketplaceFaviconUrl(nextUrl && !isLegacyMarketplaceLogo(nextUrl) ? nextUrl : LOCAL_MARKETPLACE_LOGO)
    }
    window.addEventListener('marketplace-logo-updated', handleLogoUpdate)
    window.addEventListener('marketplace-favicon-updated', handleFaviconUpdate)
    return () => {
      window.removeEventListener('marketplace-logo-updated', handleLogoUpdate)
      window.removeEventListener('marketplace-favicon-updated', handleFaviconUpdate)
    }
  }, [])

  useEffect(() => {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]'))
    links.forEach((link) => {
      link.href = marketplaceFaviconUrl
    })

    document.documentElement.style.setProperty('--brand-background', RELIABLE_BRAND_YELLOW)
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.content = RELIABLE_BRAND_YELLOW
    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
    if (manifestLink) {
      manifestLink.href = `/api/manifest?bg=${encodeURIComponent(RELIABLE_BRAND_YELLOW)}`
    }

    return undefined
  }, [marketplaceFaviconUrl])

  // Reset the page position whenever navigation changes, including filter/query changes.
  // The frame delay lets the new route render before the browser is moved to its top.
  useLayoutEffect(() => {
    setIsMenuOpen(false)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })

    NProgress.start()

    // Small delay to ensure the progress bar is visible during fast transitions
    const timer = setTimeout(() => {
      NProgress.done()
    }, 100)

    return () => {
      window.cancelAnimationFrame(frame)
      clearTimeout(timer)
      NProgress.done()
    }
  }, [location.pathname, location.search, location.hash])

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <div className={`app-container ${isMenuOpen ? 'menu-open' : ''}`}>
      {/* --- Sticky Header --- */}
      <header className={`app-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-container container">
          <div className="header-left">
            <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link to="/" className="brand-logo">
              <img src={marketplaceLogoUrl} alt="Reliable" className={`marketplace-brand-logo logo-shape-${marketplaceLogoShape}`} onLoad={(event) => { const image = event.currentTarget; const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1); setMarketplaceLogoShape(ratio >= 1.65 ? 'wide' : ratio <= 0.72 ? 'tall' : 'square') }} />
              <span className="logo-text">RELIABLE</span>
            </Link>
          </div>

          <div className="header-center">
            <div className="search-container">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Search products, categories..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="header-right">
            <Link to="/stores" className="nav-text-link">Stores</Link>
            <Link to="/products" className="nav-text-link" onMouseEnter={prefetchProducts}>Shop</Link>
            <Link to="/about" className="nav-text-link" onMouseEnter={prefetchAbout}>About Us</Link>
            <Link to="/seller/register" className="nav-text-link nav-sell-link" onMouseEnter={prefetchSellerRegister}>Sell</Link>
            <Link to={user ? "/customer" : "/login"} className="nav-icon-link" title="Account">
              <User size={22} />
            </Link>
            <Link to={user ? "/customer/wishlist" : "/login"} className="nav-icon-link wishlist-nav-link" title="Wishlist" aria-label="Wishlist">
              <Heart size={22} className={wishlistCount > 0 ? 'heart-active' : ''} />
              {wishlistCount > 0 && <span className="wishlist-badge animate-pop">{wishlistCount}</span>}
            </Link>
	            <NotificationBell />
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={22} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {isHomeRoute && isScrolled && (
        <div className="mobile-sticky-search" role="search">
          <form className="mobile-sticky-search-form" onSubmit={(event) => {
            event.preventDefault()
            const query = searchQuery.trim()
            navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products')
          }}>
            <Search className="mobile-sticky-search-icon" size={19} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search products, brands, categories…"
              aria-label="Search products, brands, categories"
            />
            <button type="submit">Search</button>
          </form>
        </div>
      )}

      {/* --- Side Drawer Menu --- */}
      <aside className={`side-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <img src={marketplaceLogoUrl} alt="Reliable" className={`marketplace-brand-logo drawer-brand-logo logo-shape-${marketplaceLogoShape}`} onLoad={(event) => { const image = event.currentTarget; const ratio = image.naturalWidth / Math.max(image.naturalHeight, 1); setMarketplaceLogoShape(ratio >= 1.65 ? 'wide' : ratio <= 0.72 ? 'tall' : 'square') }} />
            <span>RELIABLE</span>
          </div>
          <button onClick={toggleMenu}><X size={24} /></button>
        </div>
        <nav className="drawer-nav">
          <Link to="/" className="drawer-item" onMouseEnter={prefetchHome}><HomeIcon size={20} /> Home</Link>
          <Link to="/products" className="drawer-item" onMouseEnter={prefetchProducts}><Package size={20} /> Categories</Link>
          <Link to="/products?filter=deals" className="drawer-item" onMouseEnter={prefetchProducts}><Tag size={20} /> Deals</Link>
          <Link to="/seller/register" className="drawer-item" style={{ color: '#059669', fontWeight: 'bold' }} onMouseEnter={prefetchSellerRegister}>
            <Tag size={20} /> Start Selling
          </Link>
          {user && (
            <>
              {(isAdmin || role === 'seller') && (
                <Link to="/dashboard" className="drawer-item admin-item" onMouseEnter={prefetchDashboard} style={{ color: '#0066cc', fontWeight: 'bold' }}>
                  <Settings size={20} /> {isAdmin ? 'Admin Dashboard' : 'Seller Dashboard'}
                </Link>
              )}
              {(isAdmin || role === 'seller') && (
                <Link to="/advertise" className="drawer-item" style={{ color: '#059669', fontWeight: 'bold' }}>
                  <Tag size={20} /> Advertise on Reliable
                </Link>
              )}
              <Link to="/customer/orders" className="drawer-item"><Package size={20} /> Orders</Link>
              <Link to="/stores" className="drawer-item"><StoreIcon size={20} /> Stores</Link>
              <Link to="/customer/wishlist" className="drawer-item"><Heart size={20} /> Wishlist {wishlistCount > 0 && <span className="drawer-count">{wishlistCount}</span>}</Link>
              <Link to="/customer" className="drawer-item"><User size={20} /> Account</Link>
            </>
          )}
          <div className="drawer-divider"></div>
          <Link to="/?view=news" className="drawer-item"><Newspaper size={20} /> Marketplace News</Link>
          <Link to="/articles" className="drawer-item" onMouseEnter={prefetchArticles}><BookOpen size={20} /> Articles</Link>
          <Link to="/about" className="drawer-item" onMouseEnter={prefetchAbout}><Info size={20} /> About</Link>
          <Link to="/contact" className="drawer-item" onMouseEnter={prefetchContact}><Phone size={20} /> Contact</Link>
          <Link to="/faq" className="drawer-item" onMouseEnter={prefetchFAQ}><HelpCircle size={20} /> Support</Link>
          <Link to="/customer/settings" className="drawer-item"><Settings size={20} /> Settings</Link>
          {user ? (
            <div className="drawer-footer">
              <LogoutButton />
            </div>
          ) : (
            <>
              <Link to="/stores" className="drawer-item"><StoreIcon size={20} /> Stores</Link>
              <Link to="/login" className="drawer-item login-item" onMouseEnter={prefetchLogin}><User size={20} /> Login / Register</Link>
            </>
          )}
        </nav>
      </aside>
      <div className={`drawer-overlay ${isMenuOpen ? 'show' : ''}`} onClick={toggleMenu}></div>

      <TermsPopup />
      <InstallAppPrompt />
      <AuthOutageNotice />
      <main className="app-main">
        <Suspense fallback={
          <div className="loading-screen" aria-label="Loading Reliable" role="status">
            <div className="loading-card">
              <img src={marketplaceLogoUrl} alt="Reliable" className={`loading-logo marketplace-brand-logo logo-shape-${marketplaceLogoShape}`} />
              <span className="loading-label">Loading Reliable</span>
              <span className="loading-signal" aria-hidden="true"><i /><i /><i /></span>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stores" element={<StoresDirectory />} />
            <Route path="/store/:slug" element={<BusinessStorefront />} />
            <Route path="/articles" element={<Articles />} />
            <Route path="/articles/:slug" element={<ArticleDetails />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:productId" element={<ProductDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/chat/product/:productId" element={<ProductChat />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/seller/register" element={<SellerRegister />} />
            <Route
              path="/advertise"
              element={
                <ProtectedRoute>
                  <AdvertiserOnboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute sellerOrAdminOnly>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/returns" element={<Returns />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute sellerOrAdminOnly>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer"
              element={
                <ProtectedRoute>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/profile"
              element={
                <ProtectedRoute>
                  <CustomerProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders"
              element={
                <ProtectedRoute>
                  <CustomerOrders />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/orders/:orderId"
              element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/wishlist"
              element={
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer/settings"
              element={
                <ProtectedRoute>
                  <CustomerSettings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <CartSidebar />
      {!isAdminRoute && !isCustomerRoute && <Footer />}
      <WhatsAppButton />
    </div>
  )
}

export default App
