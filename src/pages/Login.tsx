import { useState, useEffect } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { user, signIn, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered')) {
      setSuccess('Registration successful! Please sign in.');
    }
  }, []);

  // If already authenticated, redirect appropriately
  const { isAdmin } = useAuth()
  useEffect(() => {
    if (user) {
      // Check if we should redirect to a specific location
      // If the user just logged in, they might want to go back to products or checkout
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      } else if (isAdmin) {
        // Redirect admins to admin dashboard
        navigate('/admin', { replace: true });
      } else {
        // Default: redirect to customer dashboard
        navigate('/customer', { replace: true });
      }
    }
  }, [user, isAdmin, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      setIsLoading(false)
      return
    }

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message || 'Invalid email or password.')
      setIsLoading(false)
      return
    }

    // Navigation will be handled by the auth state change
  }

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    )
  }

  if (user) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || (isAdmin ? '/admin' : '/customer');
    return <Navigate to={redirect} replace />
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>Login</h2>
          <p>Blue Water Shopping Village</p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">&#x26A0;</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner" style={{ backgroundColor: '#d4edda', color: '#155724', padding: '10px', borderRadius: '4px', marginBottom: '20px', textAlign: 'center' }}>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#0066cc', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-small" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <Link to="/register">Create Account</Link></p>
        </div>
      </div>
    </div>
  )
}
