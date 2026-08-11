import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createBusinessForUser, getBusinessByOwner } from '../services/businessService'
import { supabase } from '../supabaseClient'
import { Store, MapPin, Phone, Tag, Building2, FileText } from 'lucide-react'
import './Login.css' // Reuse shared authentication styles

const CATEGORIES = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Groceries',
  'Health & Beauty',
  'Sports',
  'Motorcycle',
  'New Cars Collection',
  'Software Developer/Engineer',
  'Other',
]

const DASHBOARD_PATH = '/dashboard'

export default function SellerRegister() {
  const { user, signUp, refreshProfile, role, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'register' | 'setup'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [countryCode, setCountryCode] = useState('GH')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && step === 'register') {
      checkExistingBusiness()
    }
  }, [user])

  const checkExistingBusiness = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const business = await getBusinessByOwner(user.id)
      if (business) {
        navigate(DASHBOARD_PATH, { replace: true })
      } else {
        setStep('setup')
      }
    } catch (err) {
      console.error('Error checking business:', err)
      setStep('setup')
    } finally {
      setIsLoading(false)
    }
  }

  // Ensure the seller role lands the user on /dashboard regardless of route
  useEffect(() => {
    if (!authLoading && user && role === 'seller') {
      getBusinessByOwner(user.id).then((b) => {
        if (b && window.location.pathname === '/seller/register') {
          navigate(DASHBOARD_PATH, { replace: true })
        }
      }).catch(() => {})
    }
  }, [user, role, authLoading, navigate])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signUp(email, password, { full_name: fullName })
      if (error) throw error
      setStep('setup')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupStore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsLoading(true)
    setError('')

    const finalSlug = (storeSlug || storeName).toLowerCase().replace(/[^a-z0-9-]/g, '-')

    try {
      // 1. Ensure a profiles row exists with seller role.
      //    The table may not exist yet (migration pending) — detect by error
      //    message and fall back gracefully so the business still gets created.
      try {
        const { error: profileError } = await supabase!
          .from('profiles')
          .upsert({
            id: user.id,
            full_name: fullName || user.user_metadata.full_name,
            role: 'seller',
          })

        if (profileError) {
          console.warn('Profile upsert failed (will be retried by admin):', profileError.message)
        }
      } catch (profileErr) {
        console.warn('Profile upsert exception (will be retried by admin):', profileErr)
      }

      // 2. Create the business with all onboarding fields
      const { error: bizError } = await createBusinessForUser(user.id, {
        name: storeName,
        slug: finalSlug,
        description,
        contact_email: email,
        business_name: businessName || storeName,
        phone,
        location,
        category: category || 'Other',
        country_code: countryCode,
        currency_code: countryCode === 'GH' ? 'GHS' : (countryCode === 'NG' ? 'NGN' : 'USD'), // Basic mapping for now
      })

      if (bizError) throw bizError

      // Sync the seller role before entering the protected dashboard. Without
      // this refresh, the route guard can still see the previous customer/null role
      // until a full page reload occurs.
      await refreshProfile()
      navigate(DASHBOARD_PATH, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Store setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setStoreName(name)
    // Auto-generate slug only when user hasn't typed a custom one
    if (name && !storeSlug) {
      setStoreSlug(name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
  }

  const handleBusinessNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setBusinessName(name)
    if (!storeName && !storeSlug) {
      setStoreSlug(name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
    }
  }

  if (isLoading && step === 'register') {
    return <div className="register-container">Loading...</div>
  }

  return (
    <div className="register-container">
      <div className="register-card seller-register-card">
        {step === 'register' ? (
          <>
            <h1>Become a Seller</h1>
            <p>Join Reliable and start selling your products today.</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Register as Seller'}
              </button>
            </form>
            <p className="auth-footer">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </>
        ) : (
          <>
            <h1>Setup Your Store</h1>
            <p>Tell us about your business to get started.</p>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSetupStore}>
              <div className="form-group">
                <label htmlFor="businessName">
                  <Building2 size={15} style={{ marginRight: 6 }} />
                  Business / Company Name
                </label>
                <input
                  type="text"
                  id="businessName"
                  value={businessName}
                  onChange={handleBusinessNameChange}
                  placeholder="e.g. Zak Enterprises Ltd"
                />
              </div>
              <div className="form-group">
                <label htmlFor="storeName">
                  <Store size={15} style={{ marginRight: 6 }} />
                  Store Name <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  id="storeName"
                  value={storeName}
                  onChange={handleStoreNameChange}
                  required
                  placeholder="e.g. My Amazing Shop"
                />
              </div>
              <div className="form-group">
                <label htmlFor="storeSlug">Store URL</label>
                <div className="slug-input-wrapper">
                  <span>reliable-now.vercel.app/store/</span>
                  <input
                    type="text"
                    id="storeSlug"
                    value={storeSlug}
                    onChange={(e) => setStoreSlug(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="country">
                    <MapPin size={15} style={{ marginRight: 6 }} />
                    Country <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="country"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
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
                  <label htmlFor="category">
                    <Tag size={15} style={{ marginRight: 6 }} />
                    Category <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">
                    <Phone size={15} style={{ marginRight: 6 }} />
                    Phone Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="e.g. +233 53 855 7781"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="location">
                    <MapPin size={15} style={{ marginRight: 6 }} />
                    Location <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder="e.g. Accra, Ghana"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="description">
                  <FileText size={15} style={{ marginRight: 6 }} />
                  Store Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what you sell..."
                />
              </div>
              <button type="submit" className="register-button" disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Open My Store'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
