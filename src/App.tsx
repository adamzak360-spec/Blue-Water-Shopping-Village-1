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
        <footer className="app-footer">
          <p>&copy; 2026 Blue Water Shopping Village. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
