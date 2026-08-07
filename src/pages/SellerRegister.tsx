import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createBusinessForUser, getBusinessByOwner } from '../services/businessService'
import { supabase } from '../supabaseClient'
import './Register.css'

export default function SellerRegister() {
  const { user, signUp, role } = useAuth()
  const navigate = useNavigate()
  
  const [step, setStep] = useState<'register' | 'setup'>('register')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeSlug, setStoreSlug] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      checkExistingBusiness()
    }
  }, [user])

  const checkExistingBusiness = async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const business = await getBusinessByOwner(user.id)
      if (business) {
        navigate('/admin')
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error } = await signUp(email, password, { full_name: fullName })
      if (error) throw error
      
      // Update role to seller in profiles table
      // Note: signUp metadata might not trigger profile creation immediately depending on triggers
      // We'll handle this in the setup step or via trigger
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

    try {
      // 1. Ensure profile exists and has seller role
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: fullName || user.user_metadata.full_name,
          role: 'seller'
        })
      
      if (profileError) throw profileError

      // 2. Create business
      const { business, error: bizError } = await createBusinessForUser(user.id, {
        name: storeName,
        slug: storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        description
      })

      if (bizError) throw bizError
      
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Store setup failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setStoreName(name)
    // Auto-generate slug
    setStoreSlug(name.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
  }

  if (isLoading && step === 'register') {
    return <div className="register-container">Loading...</div>
  }

  return (
    <div className="register-container">
      <div className="register-card">
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
                <label htmlFor="storeName">Store Name</label>
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
                <label htmlFor="storeSlug">Store URL Slug</label>
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
              <div className="form-group">
                <label htmlFor="description">Store Description</label>
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
