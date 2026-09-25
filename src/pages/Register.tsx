import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { handleNewCustomerRegistration } from '../api/emailNotificationHandler'
import { validateEmail, validatePassword, validateRequired } from '../utils/validation'
import { useI18n } from '../i18n'
import './Login.css' // Reuse login styles

export default function Register() {
  const { t } = useI18n()
  const { signUp, signInWithGoogle } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    country: 'GH',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

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

    // Validation
    const nameError = validateRequired(formData.fullName, 'Full Name')
    if (nameError) { setError(nameError); setIsLoading(false); return }

    const emailError = validateEmail(formData.email)
    if (emailError) { setError(emailError); setIsLoading(false); return }

    const passwordError = validatePassword(formData.password)
    if (passwordError) { setError(passwordError); setIsLoading(false); return }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    const { error: signUpError } = await signUp(formData.email, formData.password, {
      full_name: formData.fullName,
      phone: formData.phone,
      country_code: formData.country,
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    // Send welcome email notification
    try {
      await handleNewCustomerRegistration(formData.fullName, formData.email)
    } catch (emailError) {
      console.warn('[Register] Failed to send welcome email:', emailError)
      // Don't block registration if email fails
    }

    // Redirect to login with a success message
    navigate('/login?registered=true')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>{t('createAccount')}</h2>
          <p>{t('joinReliable')}</p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">&#x26A0;</span>
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <span className="google-mark" aria-hidden="true">G</span>
          {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </button>

        <div className="auth-divider"><span>{t('orCreateEmail')}</span></div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="fullName">{t('fullNameLabel')}</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={t('fullNamePlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('emailAddress')}</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">{t('country')}</label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              disabled={isLoading}
              required
            >
              <option value="GH">Ghana</option>
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone">{t('phoneOptional')}</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t('phonePlaceholder')}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('password')}</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="{t('createPassword')}"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm {t('password')}</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder={t('confirmYourPassword')}
              disabled={isLoading}
              required
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
                Creating Account...
              </>
            ) : (
              'Register'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>{t('alreadyHaveAccount')} <Link to="/login">{t('signIn')}</Link></p>
        </div>
      </div>
    </div>
  )
}
