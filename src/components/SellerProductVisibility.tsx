import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAllProducts } from '../services/productService'
import { getActiveProductVisibilityPlans } from '../services/productVisibilityService'
import { confirmProductVisibilityPayment, initializeProductVisibilityPayment } from '../services/paystackService'
import type { Product, ProductVisibilityPlan } from '../types'

export default function SellerProductVisibility({ businessIds }: { businessIds: string[] }) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [plans, setPlans] = useState<ProductVisibilityPlan[]>([])
  const [productId, setProductId] = useState('')
  const [planId, setPlanId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.all([getActiveProductVisibilityPlans(), Promise.all(businessIds.map(id => getAllProducts(id)))])
      .then(([loadedPlans, productGroups]) => {
        if (cancelled) return
        const loadedProducts = productGroups.flat()
        setPlans(loadedPlans)
        setProducts(loadedProducts)
        setProductId(loadedProducts[0]?.id || '')
        setPlanId(loadedPlans[0]?.id || '')
      })
      .catch(error => { if (!cancelled) setMessage(error instanceof Error ? error.message : 'Could not load visibility options.') })
    return () => { cancelled = true }
  }, [businessIds])

  const selectedProduct = useMemo(() => products.find(item => item.id === productId), [products, productId])
  const selectedPlan = useMemo(() => plans.find(item => item.id === planId), [plans, planId])

  const beginPayment = async () => {
    if (!user || !selectedProduct?.business_id || !selectedPlan) return
    setBusy(true); setMessage('')
    try {
      const session = await import('../supabaseClient').then(({ supabase }) => supabase?.auth.getSession())
      const accessToken = session?.data.session?.access_token
      if (!accessToken) throw new Error('Please sign in again before purchasing visibility.')
      const result = await initializeProductVisibilityPayment({ business_id: selectedProduct.business_id, product_id: selectedProduct.id, plan_id: selectedPlan.id }, accessToken)
      localStorage.setItem('pendingVisibilityEntitlement', result.data.visibility_entitlement_id)
      if (!result.data.authorization_url) throw new Error('Paystack did not return a checkout URL.')
      window.location.assign(result.data.authorization_url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start visibility payment.')
      setBusy(false)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const reference = params.get('reference') || params.get('trxref')
    const entitlementId = localStorage.getItem('pendingVisibilityEntitlement')
    if (!reference || !entitlementId || !user) return
    let cancelled = false
    void import('../supabaseClient').then(({ supabase }) => supabase?.auth.getSession()).then(session => {
      const accessToken = session?.data.session?.access_token
      if (!accessToken) return null
      return confirmProductVisibilityPayment({ visibility_entitlement_id: entitlementId, reference }, accessToken)
    }).then(result => {
      if (cancelled || !result) return
      localStorage.removeItem('pendingVisibilityEntitlement')
      window.history.replaceState({}, document.title, window.location.pathname)
      setMessage('Visibility payment verified. Your product will now appear in the selected public destination until the package expires.')
    }).catch(error => { if (!cancelled) setMessage(error instanceof Error ? error.message : 'Payment verification failed.') })
    return () => { cancelled = true }
  }, [user])

  return <section className="seller-product-visibility animate-fade-in">
    <div className="section-title-wrapper"><h2 className="section-title">Product Visibility</h2><p>Products are always available in your store. Choose an active package to publish a product on the public Home page, Products page, or both.</p></div>
    <div className="settings-card">
      <label>Product<select value={productId} onChange={e => setProductId(e.target.value)}>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label>Visibility package<select value={planId} onChange={e => setPlanId(e.target.value)}>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} — GHS {(Number(plan.price_minor) / 100).toFixed(2)} / {plan.duration_days} days</option>)}</select></label>
      <button type="button" disabled={busy || !selectedProduct || !selectedPlan} onClick={() => void beginPayment()}>{busy ? 'Opening Paystack…' : 'Pay to publish product'}</button>
      {plans.length === 0 && <p>No visibility packages are active yet. The administrator must activate one first.</p>}
      {message && <p role="status">{message}</p>}
    </div>
  </section>
}
