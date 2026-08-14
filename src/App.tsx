import { Routes, Route, Link, useLocation } from 'react-router-dom'
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
  Store as StoreIcon
} from 'lucide-react'
import './App.css'
import { lazy, Suspense, useLayoutEffect } from 'react'
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
const prefetchLogin = () => import('./pages/Login')
import TermsPopup from './components/TermsPopup'
import WhatsAppButton from './components/WhatsAppButton'
import InstallAppPrompt from './components/InstallAppPrompt'
import { getMarketplaceFaviconUrl, getMarketplaceLogoUrl } from './services/businessService'

const addCacheBuster = (url: string) => {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${Date.now()}`
}

const getImageBackgroundColor = (url: string) => new Promise<string>((resolve) => {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      const context = canvas.getContext('2d')
      if (!context) return resolve('#000000')
      context.drawImage(image, 0, 0, 2, 2)
      const pixels = context.getImageData(0, 0, 2, 2).data
      const rgb = [0, 0, 0]
      for (let index = 0; index < pixels.length; index += 4) {
        rgb[0] += pixels[index]
        rgb[1] += pixels[index + 1]
        rgb[2] += pixels[index + 2]
      }
      resolve(`#${rgb.map((channel) => Math.round(channel / 4).toString(16).padStart(2, '0')).join('')}`)
    } catch {
      resolve('#000000')
    }
  }
  image.onerror = () => resolve('#000000')
  image.src = url
})

function App() {
  return <AppShell />
}

function AppShell() {
  const { user, isAdmin, role } = useAuth()
  const { cartCount, setIsCartOpen } = useCart()
  const { wishlistCount } = useWishlist()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [marketplaceLogoUrl, setMarketplaceLogoUrl] = useState('/logo-square.png')
  const [marketplaceFaviconUrl, setMarketplaceFaviconUrl] = useState('/favicon.ico')

  const isAdminRoute = location.pathname.startsWith('/admin')
  const isCustomerRoute = location.pathname.startsWith('/customer')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let cancelled = false
    getMarketplaceLogoUrl().then((logoUrl) => {
      if (!cancelled && logoUrl) setMarketplaceLogoUrl(addCacheBuster(logoUrl))
    })
    getMarketplaceFaviconUrl().then((faviconUrl) => {
      if (!cancelled && faviconUrl) setMarketplaceFaviconUrl(addCacheBuster(faviconUrl))
    })

    const handleLogoUpdate = (event: Event) => {
      const nextUrl = (event as CustomEvent<string | null>).detail
      setMarketplaceLogoUrl(nextUrl ? addCacheBuster(nextUrl) : addCacheBuster('/logo-square.png'))
    }
    const handleFaviconUpdate = (event: Event) => {
      const nextUrl = (event as CustomEvent<string | null>).detail
      setMarketplaceFaviconUrl(nextUrl ? addCacheBuster(nextUrl) : addCacheBuster('/favicon.ico'))
    }
    window.addEventListener('marketplace-logo-updated', handleLogoUpdate)
    window.addEventListener('marketplace-favicon-updated', handleFaviconUpdate)
    return () => {
      cancelled = true
      window.removeEventListener('marketplace-logo-updated', handleLogoUpdate)
      window.removeEventListener('marketplace-favicon-updated', handleFaviconUpdate)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]'))
    links.forEach((link) => {
      link.href = marketplaceFaviconUrl
    })

    getImageBackgroundColor(marketplaceFaviconUrl).then((backgroundColor) => {
      if (cancelled) return
      document.documentElement.style.setProperty('--brand-background', backgroundColor)
      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (themeColor) themeColor.content = backgroundColor
      const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')
      if (manifestLink) {
        manifestLink.href = `/api/manifest?bg=${encodeURIComponent(backgroundColor)}&v=${Date.now()}`
      }
    })

    return () => {
      cancelled = true
    }
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
              <img src={marketplaceLogoUrl} alt="Reliable" style={{ height: '32px', width: '32px', objectFit: 'cover', borderRadius: '50%' }} />
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
            <Link to="/seller/register" className="nav-text-link nav-sell-link" onMouseEnter={prefetchSellerRegister}>Sell</Link>
            <Link to={user ? "/customer" : "/login"} className="nav-icon-link" title="Account">
              <User size={22} />
            </Link>
            <Link to={user ? "/customer/wishlist" : "/login"} className="nav-icon-link wishlist-nav-link" title="Wishlist" aria-label="Wishlist">
              <Heart size={22} />
              {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
            </Link>
	            <NotificationBell />
            <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
              <ShoppingCart size={22} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* --- Side Drawer Menu --- */}
      <aside className={`side-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <img src={marketplaceLogoUrl} alt="Reliable" style={{ height: '32px', width: '32px', objectFit: 'cover', marginRight: '10px', borderRadius: '50%' }} />
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
      <main className="app-main">
        <Suspense fallback={
          <div className="loading-screen" aria-label="Loading Reliable">
            <img src={marketplaceLogoUrl} alt="Reliable" className="loading-logo" />
          </div>
        }>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/stores" element={<StoresDirectory />} />
            <Route path="/store/:slug" element={<BusinessStorefront />} />
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
