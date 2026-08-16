import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/currency'
import './AdminPromotions.css'

type Plan = { id: string; code: 'FEATURED_PRODUCT' | 'FEATURED_STORE'; name: string; price_minor: number; currency: string; duration_days: number; placement: string; max_active_promotions: number; is_active: boolean }
type Promotion = { id: string; seller_id: string; store_id: string; product_id: string | null; promotion_type: string; status: string; review_status: string; review_notes: string | null; target_categories: string[]; target_regions: string[]; amount_minor: number; currency: string; starts_at: string | null; ends_at: string | null; payment_reference: string | null; impressions_count: number; clicks_count: number; created_at: string }
type Lookup = { id: string; name: string; category?: string | null }

const emptyPlan = { code: 'FEATURED_PRODUCT' as Plan['code'], name: 'Featured Product', price: '', duration_days: '7', placement: 'MARKETPLACE', max_active_promotions: '10', is_active: false }

export default function AdminPromotions() {
  const { session } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [stores, setStores] = useState<Lookup[]>([])
  const [products, setProducts] = useState<Lookup[]>([])
  const [form, setForm] = useState(emptyPlan)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [reviewFilter, setReviewFilter] = useState('ALL')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showcaseMode, setShowcaseMode] = useState<'FREE' | 'PAID'>('PAID')
  const [showcaseEnabled, setShowcaseEnabled] = useState(true)
  const [selectedShowcaseProducts, setSelectedShowcaseProducts] = useState<string[]>([])
  const [showcaseSaving, setShowcaseSaving] = useState(false)

  const load = async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    const [{ data: planData }, { data: promotionData }, { data: storeData }, { data: productData }, { data: showcaseSettings }, { data: showcaseItems }] = await Promise.all([
      supabase.from('promotion_plans').select('*').order('created_at'),
      supabase.from('seller_promotions').select('id, seller_id, store_id, product_id, promotion_type, status, review_status, review_notes, target_categories, target_regions, amount_minor, currency, starts_at, ends_at, payment_reference, impressions_count, clicks_count, created_at').order('created_at', { ascending: false }).limit(100),
      supabase.from('businesses').select('id, name'),
      supabase.from('products').select('id, name, category'),
      supabase.from('home_showcase_settings').select('mode, showcase_enabled').eq('id', true).maybeSingle(),
      supabase.from('home_showcase_items').select('product_id, sort_order').eq('is_active', true).order('sort_order'),
    ])
    setPlans((planData || []) as Plan[])
    setPromotions((promotionData || []) as Promotion[])
    setStores((storeData || []) as Lookup[])
    setProducts((productData || []) as Lookup[])
    if (showcaseSettings) {
      setShowcaseMode(showcaseSettings.mode === 'FREE' ? 'FREE' : 'PAID')
      setShowcaseEnabled(showcaseSettings.showcase_enabled !== false)
    }
    setSelectedShowcaseProducts((showcaseItems || []).map((item: { product_id: string }) => item.product_id))
  }

  useEffect(() => { void load() }, [])

  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    if (!supabase) { setBusy(false); setMessage('Supabase is not configured.'); return }
    const { error } = await supabase.from('promotion_plans').upsert({ code: form.code, name: form.name, price_minor: Math.round(Number(form.price) * 100), currency: 'GHS', duration_days: Number(form.duration_days), placement: form.placement, max_active_promotions: Number(form.max_active_promotions), is_active: form.is_active }, { onConflict: 'code' })
    setBusy(false); setMessage(error ? error.message : 'Promotion plan saved.'); if (!error) { setForm(emptyPlan); await load() }
  }

  const setReview = async (id: string, reviewStatus: 'APPROVED' | 'REJECTED') => {
    if (!session?.access_token) { setMessage('Administrator authentication is required.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/notify-promotion-review', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ promotion_id: id, decision: reviewStatus }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not review promotion.')
      setMessage(result.email_sent ? `Promotion ${reviewStatus.toLowerCase()}; seller notification sent.` : `Promotion ${reviewStatus.toLowerCase()}; seller email could not be sent.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not review promotion.')
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (id: string, status: 'CANCELLED' | 'SUSPENDED' | 'ACTIVE') => {
    setBusy(true); if (!supabase) { setBusy(false); setMessage('Supabase is not configured.'); return }
    const { error } = await supabase.from('seller_promotions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false); setMessage(error ? error.message : 'Promotion status updated.'); if (!error) await load()
  }

  const saveShowcaseSettings = async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    setShowcaseSaving(true); setMessage('')
    try {
      const { data, error } = await supabase.rpc('save_home_showcase_settings', {
        p_mode: showcaseMode,
        p_showcase_enabled: showcaseEnabled,
        p_product_ids: selectedShowcaseProducts,
      })
      if (error) throw error
      const savedCount = Number((data as { saved_product_count?: number } | null)?.saved_product_count ?? selectedShowcaseProducts.length)
      setMessage(`Home showcase settings saved${showcaseMode === 'FREE' ? ` with ${savedCount} product${savedCount === 1 ? '' : 's'}.` : '.'}`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save Home showcase settings.')
    } finally {
      setShowcaseSaving(false)
    }
  }

  const storeNameById = useMemo(() => new Map(stores.map(store => [store.id, store.name])), [stores])
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products])
  const filteredPromotions = promotions.filter(promotion => (statusFilter === 'ALL' || promotion.status === statusFilter) && (reviewFilter === 'ALL' || promotion.review_status === reviewFilter))
  const pendingReviewCount = promotions.filter(promotion => promotion.status === 'ACTIVE' && promotion.review_status === 'PENDING_REVIEW').length
  const activeApprovedCount = promotions.filter(promotion => promotion.status === 'ACTIVE' && promotion.review_status === 'APPROVED').length

  return <section className="admin-promotions animate-fade-in">
    <div className="section-title-wrapper"><h2 className="section-title">Advertising & Promotions</h2><p>Review targeting, approve paid placements, and monitor promotion performance. Payment activation remains server-verified.</p></div>
    <div className="admin-promotion-summary"><div><strong>{pendingReviewCount}</strong><span>Awaiting approval</span></div><div><strong>{activeApprovedCount}</strong><span>Approved active</span></div><div><strong>{promotions.length}</strong><span>Total campaigns</span></div></div>
    <div className="promotion-plan-form home-showcase-admin-card"><h3>Home featured showcase</h3><p>Select free products for the space between Call to Order and the community section, or switch back to paid subscription promotions.</p><div className="promotion-form-grid">
      <label>Showcase mode<select value={showcaseMode} onChange={e => setShowcaseMode(e.target.value as 'FREE' | 'PAID')}><option value="FREE">Free Admin Selection</option><option value="PAID">Paid Subscription Promotions</option></select></label>
      <label><input type="checkbox" checked={showcaseEnabled} onChange={e => setShowcaseEnabled(e.target.checked)} /> Show showcase on Home</label>
      <label className="showcase-product-picker">Free products<select multiple size={Math.min(8, Math.max(4, products.length))} value={selectedShowcaseProducts} onChange={e => setSelectedShowcaseProducts(Array.from(e.target.selectedOptions, option => option.value))}>{products.map(product => <option key={product.id} value={product.id}>{product.name}{product.category ? ` · ${product.category}` : ''}</option>)}</select><small>Hold Ctrl/Cmd to select multiple products. Order follows the selected list.</small></label>
      <button disabled={showcaseSaving} type="button" onClick={() => void saveShowcaseSettings()}>{showcaseSaving ? 'Saving…' : 'Save Home showcase'}</button>
    </div></div>
    <form className="promotion-plan-form" onSubmit={savePlan}><h3>Promotion plan settings</h3><div className="promotion-form-grid">
      <select value={form.code} onChange={e => setForm({ ...form, code: e.target.value as Plan['code'], name: e.target.value === 'FEATURED_PRODUCT' ? 'Featured Product' : 'Featured Store', placement: e.target.value === 'FEATURED_PRODUCT' ? 'MARKETPLACE' : 'STORES' })}><option value="FEATURED_PRODUCT">Featured Product</option><option value="FEATURED_STORE">Featured Store</option></select>
      <input required type="number" min="0.01" step="0.01" placeholder="Price (GHS)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
      <input required type="number" min="1" placeholder="Duration (days)" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} />
      <input required type="number" min="1" placeholder="Maximum active" value={form.max_active_promotions} onChange={e => setForm({ ...form, max_active_promotions: e.target.value })} />
      <label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Available to sellers</label><button disabled={busy} type="submit">Save plan</button>
    </div></form>
    {message && <p className="admin-promotion-message">{message}</p>}
    <div className="promotion-plan-list"><h3>Configured plans</h3>{plans.length === 0 ? <p>No plans configured yet.</p> : plans.map(plan => <div className="promotion-plan-row" key={plan.id}><strong>{plan.name}</strong><span>{formatCurrency(Number(plan.price_minor) / 100, plan.currency)} / {plan.duration_days} days</span><span>{plan.is_active ? 'Available' : 'Inactive'}</span></div>)}</div>
    <div className="promotion-history"><div className="admin-promotion-table-heading"><div><h3>Campaign review queue</h3><p>Approve paid campaigns before they become visible in sponsored placements.</p></div><div className="admin-promotion-filters"><select value={reviewFilter} onChange={e => setReviewFilter(e.target.value)}><option value="ALL">All review states</option><option value="PENDING_REVIEW">Awaiting approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="ALL">All campaign statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option><option value="CANCELLED">Cancelled</option><option value="EXPIRED">Expired</option></select></div></div>{filteredPromotions.length === 0 ? <p>No promotions match the selected filters.</p> : <div className="promotion-table-wrap"><table><thead><tr><th>Campaign</th><th>Targeting</th><th>Review</th><th>Performance</th><th>Period</th><th>Action</th></tr></thead><tbody>{filteredPromotions.map(promotion => { const product = promotion.product_id ? productById.get(promotion.product_id) : null; const impressions = Number(promotion.impressions_count || 0); const clicks = Number(promotion.clicks_count || 0); const ctr = impressions ? ((clicks / impressions) * 100).toFixed(1) : '0.0'; return <tr key={promotion.id}><td><strong>{product?.name || 'Store promotion'}</strong><small>{storeNameById.get(promotion.store_id) || 'Unknown store'} · {formatCurrency(Number(promotion.amount_minor) / 100, promotion.currency)}</small></td><td><span className="targeting-pill">{promotion.target_categories?.length ? promotion.target_categories.join(', ') : 'All categories'}</span><span className="targeting-pill">{promotion.target_regions?.length ? promotion.target_regions.join(', ') : 'All regions'}</span></td><td><span className={`review-badge review-${promotion.review_status.toLowerCase()}`}>{promotion.review_status.replace('_', ' ')}</span></td><td>{impressions.toLocaleString()} views<br />{clicks.toLocaleString()} clicks · {ctr}% CTR</td><td>{promotion.starts_at ? new Date(promotion.starts_at).toLocaleDateString() : '—'} – {promotion.ends_at ? new Date(promotion.ends_at).toLocaleDateString() : '—'}</td><td className="promotion-actions">{promotion.status === 'ACTIVE' && promotion.review_status === 'PENDING_REVIEW' && <><button disabled={busy} onClick={() => void setReview(promotion.id, 'APPROVED')}>Approve</button><button disabled={busy} onClick={() => void setReview(promotion.id, 'REJECTED')}>Reject</button></>}{promotion.review_status === 'APPROVED' && promotion.status === 'ACTIVE' && <button disabled={busy} onClick={() => void setStatus(promotion.id, 'SUSPENDED')}>Suspend</button>}{promotion.status === 'SUSPENDED' && <button disabled={busy} onClick={() => void setStatus(promotion.id, 'ACTIVE')}>Restore</button>}</td></tr> })}</tbody></table></div>}</div>
  </section>
}
