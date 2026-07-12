import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCustomerProfile, createOrUpdateCustomerProfile } from '../services/customerProfileService'
import { CustomerProfile as CustomerProfileType } from '../types'
import './CustomerProfile.css'

export default function CustomerProfile() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [, setProfile] = useState<CustomerProfileType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    full_name: '',
    phone_number: '',
    delivery_address: '',
    city: '',
    region: '',
  })

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadProfile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const profileData = await getCustomerProfile(user.id)
        setProfile(profileData)
        if (profileData) {
          setFormData({
            full_name: profileData.full_name || '',
            phone_number: profileData.phone_number || '',
            delivery_address: profileData.delivery_address || '',
            city: profileData.city || '',
            region: profileData.region || '',
          })
        }
      } catch (err: any) {
        console.error('Error loading profile:', err)
        setError(err.message || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [user, navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      // Use createOrUpdateCustomerProfile to handle both create and update
      await createOrUpdateCustomerProfile(user.id, formData)
      setSuccess('Profile updated successfully!')
      
      // Reload profile
      const updatedProfile = await getCustomerProfile(user.id)
      if (updatedProfile) {
        setProfile(updatedProfile)
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="customer-profile">
        <div className="page-container">
          <div className="loading-spinner">Loading profile...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="customer-profile">
      <div className="page-container">
        <div className="profile-header">
          <h1>Edit Profile</h1>
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

        <div className="profile-card">
          <div className="profile-section">
            <h2>Account Information</h2>
            <div className="info-item">
              <label>Email</label>
              <div className="info-value">{user?.email}</div>
              <small>Email cannot be changed</small>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-section">
              <h2>Personal Information</h2>
              
              <div className="form-group">
                <label htmlFor="full_name">Full Name</label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone_number">Phone Number</label>
                <input
                  type="tel"
                  id="phone_number"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleInputChange}
                  placeholder="0123456789"
                />
              </div>
            </div>

            <div className="form-section">
              <h2>Default Delivery Address</h2>
              
              <div className="form-group">
                <label htmlFor="delivery_address">Street Address</label>
                <input
                  type="text"
                  id="delivery_address"
                  name="delivery_address"
                  value={formData.delivery_address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Accra"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="region">Region</label>
                  <input
                    type="text"
                    id="region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    placeholder="Greater Accra"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="save-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => navigate('/customer')}
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="form-section password-section">
            <h2>Security</h2>
            <button
              className="change-password-btn"
              onClick={() => navigate('/customer/settings')}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
