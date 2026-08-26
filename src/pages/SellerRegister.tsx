import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createBusinessForUser, getBusinessByOwner } from '../services/businessService'
import { supabase } from '../supabaseClient'
import { Store, MapPin, Phone, Tag, Building2, FileText, CheckCircle2, ArrowRight, ShieldCheck, TrendingUp, Headphones, BarChart3 } from 'lucide-react'
import './Login.css' // Reuse shared authentication styles
import './SellerRegister.css'

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
  const [agreedToTerms, setAgreedToTerms] = useState(false)
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

      // 2. Get currency for country
      const currencyMap: Record<string, string> = {
        'GH': 'GHS',
        'NG': 'NGN',
        'KE': 'KES',
        'ZA': 'ZAR',
        'US': 'USD',
        'GB': 'GBP'
      }

      // 3. Create the business with all onboarding fields
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
        currency_code: currencyMap[countryCode] || 'USD',
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
    <main className="seller-register-page">
      <section className="seller-register-hero" aria-labelledby="seller-register-title">
        <div className="seller-register-hero-copy">
          <span className="seller-eyebrow">Reliable for business</span>
          <h1 id="seller-register-title">Start selling on Reliable today</h1>
          <p className="seller-hero-lede">Bring your products to more customers with a professional storefront, simple tools, and a trusted marketplace built for growing businesses.</p>
          <div className="seller-hero-benefits">
            <span><CheckCircle2 size={18} /> Reach more customers</span>
            <span><CheckCircle2 size={18} /> Grow your business online</span>
            <span><CheckCircle2 size={18} /> Manage your store with ease</span>
          </div>
          <a className="seller-secondary-cta" href="#seller-registration-form">How it works <ArrowRight size={17} /></a>
        </div>
        <div className="seller-register-hero-art">
          <div className="seller-art-glow" aria-hidden="true" />
          <img src="/seller-hero.jpeg?v=woman-588f578" alt="Woman entrepreneur working on a laptop in a bright workspace" width="900" height="1125" fetchPriority="high" />
          <div className="seller-art-badge"><ShieldCheck size={18} /><span>Built for trusted sellers</span></div>
        </div>
      </section>

      <section className="seller-benefits" aria-labelledby="seller-benefits-title">
        <div className="seller-section-heading">
          <span className="seller-eyebrow">Why Reliable</span>
          <h2 id="seller-benefits-title">Everything you need to grow online</h2>
        </div>
        <div className="seller-benefit-grid">
          <article className="seller-benefit-card"><span className="seller-benefit-icon"><Store size={21} /></span><h3>Easy store setup</h3><p>Create a clear public storefront and start presenting your products professionally.</p></article>
          <article className="seller-benefit-card"><span className="seller-benefit-icon"><TrendingUp size={21} /></span><h3>Reach more customers</h3><p>Put your products in front of shoppers browsing Reliable every day.</p></article>
          <article className="seller-benefit-card"><span className="seller-benefit-icon"><BarChart3 size={21} /></span><h3>Track your sales</h3><p>Use the existing seller dashboard to manage products, orders, and performance.</p></article>
          <article className="seller-benefit-card"><span className="seller-benefit-icon"><Headphones size={21} /></span><h3>Seller support</h3><p>Get practical guidance through Reliable support and seller resources.</p></article>
        </div>
      </section>

      <section className="seller-registration-layout" id="seller-registration-form" aria-labelledby="seller-form-title">
        <div className="seller-process-panel">
          <span className="seller-eyebrow">Your next steps</span>
          <h2 id="seller-form-title">Open your Reliable store</h2>
          <p>Complete your account and store details. Our team reviews seller applications before a store is approved.</p>
          <ol className="seller-step-list">
            <li className={step === 'register' ? 'active' : 'complete'}><span>01</span><div><strong>Create an account</strong><small>Use an email and password you can access.</small></div></li>
            <li className={step === 'setup' ? 'active' : ''}><span>02</span><div><strong>Tell us about your store</strong><small>Add your business, contact, category, and location.</small></div></li>
            <li><span>03</span><div><strong>Await approval</strong><small>Reliable reviews the application before dashboard access.</small></div></li>
          </ol>
          <div className="seller-trust-note"><ShieldCheck size={19} /><span>Your information is handled through Reliable's existing secure account and seller application system.</span></div>
        </div>

        <div className="register-card seller-register-card seller-form-card">
          <div className="seller-form-topline"><span>Step {step === 'register' ? '1' : '2'} of 2</span><span className="seller-form-dot" aria-hidden="true" /></div>
          {step === 'register' ? (
          <>
            <span className="seller-form-kicker">Create your seller account</span>
            <h2>Become a Reliable seller</h2>
            <p>Join Reliable and start building your online store.</p>

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
            <span className="seller-form-kicker">Set up your storefront</span>
            <h2>Tell us about your store</h2>
            <p>These details help shoppers understand what your business offers.</p>

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
                  <span>www.reliablepremiummarketplace.com/store/</span>
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
              <div className="form-group terms-checkbox">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    style={{ marginRight: 10, width: 'auto' }}
                    required
                  />
                  <span>I agree to the <Link to="/terms" target="_blank">Seller Terms & Conditions</Link></span>
                </label>
              </div>
              <button type="submit" className="register-button" disabled={isLoading || !agreedToTerms}>
                {isLoading ? 'Setting up...' : 'Open My Store'}
              </button>
            </form>
          </>
        )}
        </div>
      </section>

      <section className="seller-bottom-cta" aria-labelledby="seller-bottom-cta-title">
        <div><span className="seller-eyebrow">Ready to grow?</span><h2 id="seller-bottom-cta-title">Your next customer is already looking.</h2><p>Start your application today and take your business online with Reliable.</p></div>
        <a href="#seller-registration-form" className="seller-primary-cta">Start selling now <ArrowRight size={18} /></a>
      </section>

      <nav className="seller-resource-links" aria-label="Seller resources"><Link to="/articles">Seller guides</Link><Link to="/faq">Seller help</Link><Link to="/contact">Contact support</Link></nav>
    </main>
  )
}
