import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LogoutButton } from './components/Logout'
import './App.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Products from './pages/Products'

function AppNav() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  // Hide nav links on admin pages
  const isAdminRoute = location.pathname.startsWith('/admin')

  return (
    <nav className="app-nav">
      <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Home</Link>
      <Link to="/products" className={location.pathname === '/products' ? 'active' : ''}>Products</Link>
      {user && !isLoading && !isAdminRoute && (
        <Link to="/admin" className={location.pathname.startsWith('/admin') ? 'active' : ''}>Admin</Link>
      )}
      {isAdminRoute && user && <LogoutButton />}
      {!user && !isLoading && !isAdminRoute && <Link to="/login" className="login-link">Login</Link>}
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
        <footer className="app-footer">
          <p>&copy; 2026 Blue Water Shopping Village. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
