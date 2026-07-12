import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function Login() {
  const { user, signIn, isLoading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // If already authenticated, redirect appropriately
  useEffect(() => {
    if (user) {
      // Check if we should redirect to a specific location
      // If the user just logged in, they might want to go back to products or checkout
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect) {
        navigate(redirect, { replace: true });
      } else {
        // Default: redirect to customer dashboard
        navigate('/customer', { replace: true });
      }
    }
  }, [user, navigate])

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
    const redirect = params.get('redirect') || '/customer';
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
            <label htmlFor="password">Password</label>
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
          <p>Enter your credentials to access your account.</p>
        </div>
      </div>
    </div>
  )
}
