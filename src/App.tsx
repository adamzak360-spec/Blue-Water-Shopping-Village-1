import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LogoutButton } from './components/Logout'
import { useCart } from './context/CartContext'
import { CartSidebar } from './components/CartSidebar'
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

function App() {
  return (
    <Router>
      <AppShell />
    </Router>
  )
}

function AppShell() {
  const { user, isLoading } = useAuth()
  const { cartCount, setIsCartOpen } = useCart()
  // useLocation() is safe here because we're inside <Router>
  const pathname = window.location.pathname

      const isAdminRoute = pathname.startsWith('/admin')
      const isCustomerRoute = pathname.startsWith('/customer')

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="brand-link">
          <h1>Blue Water Shopping Village</h1>
          <p className="tagline">Modern Supermarket</p>
        </Link>
        <nav className="app-nav">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/products" className={pathname === '/products' ? 'active' : ''}>Products</Link>
          {!isAdminRoute && !isCustomerRoute && (
            <button className="cart-toggle-btn" onClick={() => setIsCartOpen(true)}>
              Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}
          {user && !isLoading && !isAdminRoute && (
            <>
              <Link to="/customer" className={pathname.startsWith('/customer') ? 'active' : ''}>My Account</Link>
              <Link to="/admin" className={pathname.startsWith('/admin') ? 'active' : ''}>Admin</Link>
            </>
          )}
          {isAdminRoute && user && <LogoutButton />}
          {!user && !isLoading && !isAdminRoute && <Link to="/login" className="login-link">Login</Link>}
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
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
              <ProtectedRoute>
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
