import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Login.css'

export default function ResetPassword() {
  const { session, isLoading, changePassword, signOut } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!isLoading && !session) {
      setError('This password reset link is missing, expired, or has already been used.')
    }
  }, [isLoading, session])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSaving(true)
    const { error: updateError } = await changePassword(newPassword)

    if (updateError) {
      setError(updateError.message || 'Unable to update your password. Please request a new link.')
      setIsSaving(false)
      return
    }

    setSuccess('Your password has been reset. You can now sign in with your new password.')
    setNewPassword('')
    setConfirmPassword('')
    setIsSaving(false)

    window.setTimeout(async () => {
      await signOut()
      navigate('/login')
    }, 1500)
  }

  if (isLoading) {
    return <div className="loading-screen">Verifying your reset link...</div>
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h2>Create a New Password</h2>
          <p>Choose a new password for your Reliable account.</p>
        </div>

        {error && (
          <div className="error-banner" role="alert">
            <span className="error-icon">&#x26A0;</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner" role="status">
            {success}
          </div>
        )}

        {session ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter your new password"
                autoComplete="new-password"
                disabled={isSaving || Boolean(success)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirm your new password"
                autoComplete="new-password"
                disabled={isSaving || Boolean(success)}
                required
              />
            </div>

            <button type="submit" className="login-button" disabled={isSaving || Boolean(success)}>
              {isSaving ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div className="login-footer">
            <p><Link to="/forgot-password">Request a new reset link</Link></p>
          </div>
        )}

        <div className="login-footer">
          <p><Link to="/login">Return to Sign In</Link></p>
        </div>
      </div>
    </div>
  )
}
