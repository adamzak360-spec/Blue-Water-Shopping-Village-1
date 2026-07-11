import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LogoutButton } from './components/Logout'
import { useCart } from './context/CartContext'
import { CartSidebar } from './components/CartSidebar'
import './App.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Login from './pages/Login'
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

function AppNav() {
  const { user, isLoading } = useAuth()
  const { cartCount, setIsCartOpen } = useCart()
  const location = useLocation()

  // Hide nav links on admin pages
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <nav className="app-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
      <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>Products</Link>
      {!isAdminRoute && (
        <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
          Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      )}
      {user && !isLoading && !isAdminRoute && (
        <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>Admin</Link>
      )}
      {isAdminRoute && user && <LogoutButton />}
      {!user && !isLoading && !isAdminRoute && <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`} className="login-link">Login</Link>}
    </nav>
  )
}

function App() {
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <Link to="/" className="brand-link">
            <h1>Blue Water Shopping Village</h1>
            <p className="tagline">Modern Supermarket</p>
          </Link>
          <AppNav />
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
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
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <CartSidebar />
        {!isAdminRoute && <Footer />}
      </div>
    </Router>
  )
}

export default App
