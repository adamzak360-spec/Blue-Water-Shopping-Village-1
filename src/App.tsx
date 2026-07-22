import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LogoutButton } from './components/Logout'
import { useCart } from './context/CartContext'
import { CartSidebar } from './components/CartSidebar'
import { 
  Menu, 
  Search, 
  User, 
  Heart, 
  Bell, 
  ShoppingCart, 
  X,
  Home as HomeIcon,
  Package,
  Tag,
  Settings,
  HelpCircle,
  Phone,
  Info
} from 'lucide-react'
import './App.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import Products from './pages/Products'
import Checkout from './pages/Checkout'
import About from './pages/About'
import Contact from './pages/Contact'
import FAQ from './pages/FAQ'
import Delivery from './pages/Delivery'
import PrivacyPolicy from './pages/PrivacyPolicy'
import Terms from './pages/Terms'
import Returns from './pages/Returns'
import Footer from './components/Footer'
import CustomerDashboard from './pages/CustomerDashboard'
import CustomerProfile from './pages/CustomerProfile'
import CustomerOrders from './pages/CustomerOrders'
import OrderDetails from './pages/OrderDetails'
import CustomerSettings from './pages/CustomerSettings'
import ProductDetails from './pages/ProductDetails'

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

function AppShell() {
  const { user } = useAuth()
  const { cartCount, setIsCartOpen } = useCart()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isAdminRoute = location.pathname.startsWith('/admin')
  const isCustomerRoute = location.pathname.startsWith('/customer')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

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
            <Link to={user ? "/customer" : "/login"} className="nav-icon-link" title="Account">
              <User size={22} />
            </Link>
            <button className="nav-icon-link" title="Wishlist">
              <Heart size={22} />
            </button>
            <button className="nav-icon-link" title="Notifications">
              <Bell size={22} />
            </button>
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
          <span className="drawer-logo">RELIABLE</span>
          <button onClick={toggleMenu}><X size={24} /></button>
        </div>
        <nav className="drawer-nav">
          <Link to="/" className="drawer-item"><HomeIcon size={20} /> Home</Link>
          <Link to="/products" className="drawer-item"><Package size={20} /> Categories</Link>
          <Link to="/products?filter=deals" className="drawer-item"><Tag size={20} /> Deals</Link>
          {user && (
            <>
              <Link to="/customer/orders" className="drawer-item"><Package size={20} /> Orders</Link>
              <Link to="/customer/wishlist" className="drawer-item"><Heart size={20} /> Wishlist</Link>
              <Link to="/customer" className="drawer-item"><User size={20} /> Account</Link>
            </>
          )}
          <div className="drawer-divider"></div>
          <Link to="/about" className="drawer-item"><Info size={20} /> About</Link>
          <Link to="/contact" className="drawer-item"><Phone size={20} /> Contact</Link>
          <Link to="/faq" className="drawer-item"><HelpCircle size={20} /> Support</Link>
          <Link to="/customer/settings" className="drawer-item"><Settings size={20} /> Settings</Link>
          {user ? (
            <div className="drawer-footer">
              <LogoutButton />
            </div>
          ) : (
            <Link to="/login" className="drawer-item login-item"><User size={20} /> Login / Register</Link>
          )}
        </nav>
      </aside>
      <div className={`drawer-overlay ${isMenuOpen ? 'show' : ''}`} onClick={toggleMenu}></div>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:productId" element={<ProductDetails />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
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
              <ProtectedRoute adminOnly>
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
            path="/customer/settings"
            element={
              <ProtectedRoute>
                <CustomerSettings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <CartSidebar />
      {!isAdminRoute && !isCustomerRoute && <Footer />}
    </div>
  )
}

export default App
