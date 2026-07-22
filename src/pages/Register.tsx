import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { validateEmail, validatePassword, validateRequired } from '../utils/validation'
import './Login.css' // Reuse login styles

export default function Register() {
  const { signUp } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
    })

    if (signUpError) {
      setError(signUpError.message)
      setIsLoading(false)
      return
    }

    // Send welcome email notification
    try {
      const { handleNewCustomerRegistration } = await import('../api/emailNotificationHandler')
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
          <h2>Create Account</h2>
          <p>Join Reliable</p>
        </div>

        {error && (
          <div className="error-banner">
            <span className="error-icon">&#x26A0;</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter your phone number"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
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
          <p>Already have an account? <Link to="/login">Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}
