import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Login from './pages/Login'
import Products from './pages/Products'

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="app-header">
          <h1>Blue Water Shopping Village</h1>
          <p className="tagline">Modern Supermarket</p>
          <nav className="app-nav">
            <Link to="/">Home</Link>
            <Link to="/products">Products</Link>
            <Link to="/login">Login</Link>
            <Link to="/admin">Admin</Link>
          </nav>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/products" element={<Products />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <p>&copy; 2024 Blue Water Shopping Village. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
