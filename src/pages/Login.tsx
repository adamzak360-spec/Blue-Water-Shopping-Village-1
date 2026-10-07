import { useState, useEffect } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../i18n'
import './Login.css'

export default function Login() {
  const { t } = useI18n()
  const { user, signIn, signInWithGoogle, isLoading: authLoading, role } = useAuth()
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
      } else if (role === 'seller') {
        // Redirect sellers to the seller dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Default: redirect to customer dashboard
        navigate('/customer', { replace: true });
      }
    }
  }, [user, isAdmin, role, navigate])

  // Role may resolve after the initial navigation (e.g. when /customer loads the business lookup);
  // if we are still on /customer and the role turns out to be seller, redirect to the seller dashboard.
  useEffect(() => {
    if (user && role === 'seller' && window.location.pathname === '/customer') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, role, navigate])

  const handleGoogleSignIn = async () => {
    setError('')
    setIsLoading(true)
    const redirect = new URLSearchParams(window.location.search).get('redirect') || ''
    const { error: googleError } = await signInWithGoogle(redirect)
    if (googleError) {
      setError(googleError.message || 'Unable to continue with Google.')
      setIsLoading(false)
    }
  }

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
      const msg = signInError.message?.trim()
      const isEmptyProviderError = !msg || msg === '{}' || msg === '[]'
      if (isEmptyProviderError || /503|connect error|transport failure|upstream/i.test(msg)) {
        setError(isEmptyProviderError
          ? 'The authentication service returned an empty response. Please verify the account details and try again. If the problem continues, contact support.'
          : 'Login is temporarily unavailable due to a service provider issue. Please try again in a few minutes. If it keeps failing, contact support.')
      } else if (/invalid login credentials/i.test(msg)) {
        setError('Invalid email or password.')
      } else {
        setError(msg)
      }
      setIsLoading(false)
      return
    }

    // Navigation will be handled by the auth state change
  }

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>{t('loading')}</p>
      </div>
    )
  }

  if (user) {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect') || (isAdmin ? '/admin' : role === 'seller' ? '/dashboard' : '/customer');
    return <Navigate to={redirect} replace />
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>{t('login')}</h2>
          <p>Reliable</p>
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

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="google-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
            <path fill="#34A853" d="M12 21.5c2.43 0 4.47-.81 5.96-2.19l-3.14-2.45c-.81.54-1.84.86-2.82.86-2.38 0-4.4-1.61-5.13-3.77H3.63v2.53A9 9 0 0 0 12 21.5Z" />
            <path fill="#FBBC05" d="M6.87 13.95A5.4 5.4 0 0 1 6.59 12c0-.68.12-1.34.28-1.95V7.52H3.63A9.5 9.5 0 0 0 2.5 12c0 1.45.35 2.82 1.13 4.48l3.24-2.53Z" />
            <path fill="#EA4335" d="M12 6.28c1.32 0 2.51.45 3.45 1.34l2.58-2.58C16.47 3.55 14.43 2.5 12 2.5a9 9 0 0 0-8.37 5.02l3.24 2.53C7.6 7.89 9.62 6.28 12 6.28Z" />
          </svg>
          {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="auth-divider"><span>{t('orContinueEmail')}</span></div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('emailAddress')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password">{t('password')}</label>
              <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#0066cc', textDecoration: 'none' }}>{t('forgotPassword')}</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
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
          <p>{t('dontHaveAccount')} <Link to="/register">{t('createAccount')}</Link></p>
          <p>{t('sellOnReliable')} <Link to="/seller/register">{t('registerAsSeller')}</Link></p>
        </div>
      </div>
    </div>
  )
}
