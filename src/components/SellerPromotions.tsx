import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { initializePayment, confirmSellerPromotion, generatePaymentReference } from '../services/paystackService'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import './SellerPromotions.css'

type Plan = {
  id: string
  code: 'FEATURED_PRODUCT' | 'FEATURED_STORE'
  name: string
  price_minor: number
  currency: string
  duration_days: number
  placement: string
  is_active: boolean
}

type Promotion = {
  id: string;
  product_id: string | null
  promotion_type: Plan['code']
  status: string
  starts_at: string | null
  ends_at: string | null
  impressions_count: number
  clicks_count: number
  amount_minor: number
  currency: string
}

const REGION_OPTIONS = ['GH', 'Greater Accra', 'Ashanti', 'Eastern', 'Western', 'Central', 'Northern', 'Volta', 'Bono', 'Bono East', 'Ahafo', 'Savannah', 'North East', 'Upper East', 'Upper West', 'Oti', 'Western North']

export default function SellerPromotions({ businessIds }: { businessIds: string[] }) {
  const { user, session } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [type, setType] = useState<Plan['code']>('FEATURED_PRODUCT')
  const [productId, setProductId] = useState('')
  const [planId, setPlanId] = useState('')
  const [message, setMessage] = useState('')
  const [targetCategories, setTargetCategories] = useState<string[]>([])
  const [targetRegions, setTargetRegions] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const businessId = businessIds[0]

  const loadSellerPromotions = async () => {
    if (!supabase || !businessId) return
    const { data, error } = await supabase
      .from('seller_promotions')
      .select('id, product_id, promotion_type, status, starts_at, ends_at, impressions_count, clicks_count, amount_minor, currency')
      .eq('store_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) setMessage(error.message)
    else setPromotions((data || []) as Promotion[])
  }

  useEffect(() => {
    if (!supabase || !businessId) return
    void (async () => {
      const [{ data: plansData }, productsData] = await Promise.all([
        supabase.from('promotion_plans').select('*').eq('is_active', true).order('price_minor'),
        getAllProducts(businessId),
      ])
      setPlans((plansData || []) as Plan[])
      setProducts((productsData || []) as Product[])
      await loadSellerPromotions()
    })()
  }, [businessId])

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('reference') || new URLSearchParams(window.location.search).get('trxref')
    const saved = localStorage.getItem('reliable_pending_promotion')
    if (!ref || !saved || !session?.access_token) return

    const pending = JSON.parse(saved) as { promotion_id: string; reference: string }
    if (pending.reference !== ref) return

    void (async () => {
      setBusy(true)
      try {
        await confirmSellerPromotion({ promotion_id: pending.promotion_id, reference: ref }, session.access_token)
        localStorage.removeItem('reliable_pending_promotion')
        await loadSellerPromotions()
        setMessage('Payment verified. Your promotion is now active.')
        window.history.replaceState({}, '', window.location.pathname)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Promotion payment could not be confirmed.')
      } finally {
        setBusy(false)
      }
    })()
  }, [session?.access_token])

  const productNameById = new Map(products.map(product => [product.id, product.name]))
  const activePromotions = promotions.filter(
    promotion => promotion.status === 'ACTIVE' && promotion.ends_at && new Date(promotion.ends_at) > new Date(),
  )
  const selectedPlan = plans.find(plan => plan.id === planId)
  const availableCategories = [...new Set(products.map(product => product.category).filter(Boolean))].sort()

  const startPayment = async () => {
    if (!user?.email || !session?.access_token || !businessId || !selectedPlan) {
      setMessage('Choose an active promotion plan first.')
      return
    }
    if (type === 'FEATURED_PRODUCT' && !productId) {
      setMessage('Choose a product to promote.')
      return
    }

    setBusy(true)
    setMessage('')
    try {
      const reference = generatePaymentReference()
      const result = await initializePayment({
        email: user.email,
        amount: selectedPlan.price_minor,
        currency: selectedPlan.currency,
        reference,
        callback_url: `${window.location.origin}/admin`,
        metadata: {
          type: 'seller_promotion',
          business_id: businessId,
          product_id: type === 'FEATURED_PRODUCT' ? productId : null,
          plan_id: selectedPlan.id,
          promotion_type: type,
          target_categories: type === 'FEATURED_PRODUCT' ? targetCategories : [],
          target_regions: type === 'FEATURED_PRODUCT' ? targetRegions : [],
        },
      }, session.access_token)
      const promotionId = (result.data as typeof result.data & { promotion_id: string }).promotion_id
      localStorage.setItem('reliable_pending_promotion', JSON.stringify({ promotion_id: promotionId, reference }))
      window.location.href = result.data.authorization_url
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start promotion payment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="seller-promotions animate-fade-in">
      <div className="section-title-wrapper">
        <h2 className="section-title">Promote Your Store or Product</h2>
        <p>Paid placements are clearly marked FEATURED and activate only after Paystack verification.</p>
      </div>

      <div className="seller-promotion-card">
        <div className="seller-promotion-grid">
          <select value={type} onChange={event => { setType(event.target.value as Plan['code']); setPlanId('') }}>
            <option value="FEATURED_PRODUCT">Featured Product</option>
            <option value="FEATURED_STORE">Featured Store</option>
          </select>
          {type === 'FEATURED_PRODUCT' && (
            <select value={productId} onChange={event => setProductId(event.target.value)}>
              <option value="">Choose product</option>
              {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          )}
          <select value={planId} onChange={event => setPlanId(event.target.value)}>
            <option value="">Choose duration and price</option>
            {plans.filter(plan => plan.code === type).map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.currency} {(plan.price_minor / 100).toFixed(2)} / {plan.duration_days} days
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => void startPayment()}>
            {busy ? 'Processing…' : 'Pay with Paystack'}
          </button>
        </div>
        {type === 'FEATURED_PRODUCT' && (
          <div className="seller-promotion-targeting">
            <div>
              <h4>Audience targeting <span>(optional)</span></h4>
              <p>Leave both sections empty to reach everyone. Targeting is reviewed by the administrator before the promotion is displayed.</p>
            </div>
            <fieldset>
              <legend>Product categories</legend>
              <div className="seller-promotion-options">
                {availableCategories.length === 0 ? <span>No product categories available yet.</span> : availableCategories.map(category => (
                  <label key={category}><input type="checkbox" checked={targetCategories.includes(category)} onChange={event => setTargetCategories(current => event.target.checked ? [...current, category] : current.filter(value => value !== category))} /> {category}</label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>Store regions</legend>
              <div className="seller-promotion-options">
                {REGION_OPTIONS.map(region => (
                  <label key={region}><input type="checkbox" checked={targetRegions.includes(region)} onChange={event => setTargetRegions(current => event.target.checked ? [...current, region] : current.filter(value => value !== region))} /> {region}</label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
        {selectedPlan && <p className="seller-promotion-note">This placement runs for {selectedPlan.duration_days} days and expires automatically.</p>}
        {message && <p className="seller-promotion-message">{message}</p>}
      </div>

      <div className="seller-promotion-report">
        <div className="seller-promotion-report-heading">
          <div>
            <h3>Promotion performance</h3>
            <p>Metrics update as shoppers see and interact with your active placements.</p>
          </div>
        </div>
        {activePromotions.length === 0 ? (
          <p className="seller-promotion-empty">No active promotions yet. After payment is verified, your live impressions and clicks will appear here.</p>
        ) : (
          <div className="seller-promotion-report-list">
            {activePromotions.map(promotion => {
              const impressions = Number(promotion.impressions_count || 0)
              const clicks = Number(promotion.clicks_count || 0)
              const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0'
              return (
                <article className="seller-promotion-report-item" key={promotion.id}>
                  <div className="seller-promotion-report-title">
                    <strong>{promotion.product_id ? productNameById.get(promotion.product_id) || 'Promoted product' : 'Promoted store'}</strong>
                    <span className="seller-promotion-status">{promotion.status}</span>
                  </div>
                  <div className="seller-promotion-metrics">
                    <div><strong>{impressions.toLocaleString()}</strong><span>Impressions</span></div>
                    <div><strong>{clicks.toLocaleString()}</strong><span>Clicks</span></div>
                    <div><strong>{ctr}%</strong><span>Click-through rate</span></div>
                  </div>
                  {promotion.ends_at && <p>Ends {new Date(promotion.ends_at).toLocaleDateString()}</p>}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
