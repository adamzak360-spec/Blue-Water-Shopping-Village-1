import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './CustomerSettings.css'

export default function CustomerSettings() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [isChanging, setIsChanging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setError(null)
    setSuccess(null)

    // Validation
    if (!formData.newPassword) {
      setError('Please enter a new password')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setIsChanging(true)
      const { error: changeError } = await changePassword(formData.newPassword)
      
      if (changeError) {
        setError(changeError.message || 'Failed to change password')
      } else {
        setSuccess('Password changed successfully!')
        setFormData({ newPassword: '', confirmPassword: '' })
        setTimeout(() => {
          navigate('/customer')
        }, 2000)
      }
    } catch (err: any) {
      console.error('Error changing password:', err)
      setError(err.message || 'Failed to change password')
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="customer-settings">
      <div className="page-container">
        <div className="settings-header">
          <h1>Account Settings</h1>
          <button className="back-btn" onClick={() => navigate('/customer')}>
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <div className="settings-card">
          <div className="settings-section">
            <h2>Change Password</h2>
            <p className="section-description">
              Update your password to keep your account secure. Use a strong password with a mix of letters, numbers, and symbols.
            </p>

            <form onSubmit={handleSubmit} className="settings-form">
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  disabled={isChanging}
                />
                <small>Minimum 6 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  disabled={isChanging}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="save-btn" disabled={isChanging}>
                  {isChanging ? 'Changing Password...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate('/customer')}
                  disabled={isChanging}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>

          <div className="settings-section security-tips">
            <h2>Security Tips</h2>
            <ul>
              <li>Use a password that is at least 8 characters long</li>
              <li>Include uppercase and lowercase letters</li>
              <li>Include numbers and special characters</li>
              <li>Avoid using personal information</li>
              <li>Don't reuse passwords from other accounts</li>
              <li>Change your password regularly</li>
            </ul>
          </div>

          <div className="settings-section account-info">
            <h2>Account Information</h2>
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Account Created</span>
              <span className="value">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
