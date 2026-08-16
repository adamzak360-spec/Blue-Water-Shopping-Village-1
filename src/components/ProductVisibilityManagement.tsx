import { useEffect, useState } from 'react'
import {
  createAdminVisibilityPlan,
  getAdminVisibilityPlans,
  updateAdminVisibilityPlan,
} from '../services/productVisibilityService'
import {
  DEFAULT_MARKETPLACE_ID,
  getMarketplaceFreeCatalogMode,
  updateBusinessProfile,
} from '../services/businessService'
import type { ProductVisibilityPlan, ProductVisibilityTarget } from '../types'
import './ProductVisibilityManagement.css'

const targetLabels: Record<ProductVisibilityTarget, string> = {
  STORE_ONLY: 'Store only',
  PRODUCTS: 'Store + Products page',
  HOME: 'Store + Home page',
  HOME_AND_PRODUCTS: 'Store + Home + Products',
}

export default function ProductVisibilityManagement() {
  const [plans, setPlans] = useState<ProductVisibilityPlan[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [freeCatalogMode, setFreeCatalogMode] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', description: '', target: 'PRODUCTS' as ProductVisibilityTarget, priceGhs: '', durationDays: '30' })

  const load = async () => {
    try {
      const [loadedPlans, freeMode] = await Promise.all([
        getAdminVisibilityPlans(),
        getMarketplaceFreeCatalogMode(),
      ])
      setPlans(loadedPlans)
      setFreeCatalogMode(freeMode)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load visibility packages.')
    }
  }

  useEffect(() => { void load() }, [])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const priceMinor = Math.round(Number(form.priceGhs) * 100)
    const durationDays = Number(form.durationDays)
    if (!form.code.trim() || !form.name.trim() || !Number.isInteger(priceMinor) || priceMinor <= 0 || !Number.isInteger(durationDays) || durationDays <= 0) {
      setMessage('Enter a package code, name, positive GHS price, and duration.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      await createAdminVisibilityPlan({ code: form.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'), name: form.name.trim(), description: form.description.trim(), target: form.target, price_minor: priceMinor, duration_days: durationDays })
      setForm({ code: '', name: '', description: '', target: 'PRODUCTS', priceGhs: '', durationDays: '30' })
      await load()
      setMessage('Visibility package created inactive. Activate it when its price and duration are ready.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create visibility package.')
    } finally { setBusy(false) }
  }

  const toggleFreeCatalog = async () => {
    setBusy(true)
    setMessage('')
    const nextValue = !freeCatalogMode
    try {
      await updateBusinessProfile(DEFAULT_MARKETPLACE_ID, { free_public_catalog: nextValue })
      setFreeCatalogMode(nextValue)
      setMessage(nextValue
        ? 'Free public catalog mode is enabled. Active products can appear on Home and Products without a visibility payment.'
        : 'Free public catalog mode is disabled. Paid visibility entitlements are required again.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update free public catalog mode.')
    } finally { setBusy(false) }
  }

  const toggle = async (plan: ProductVisibilityPlan) => {
    setBusy(true)
    setMessage('')
    try {
      await updateAdminVisibilityPlan(plan.id, { is_active: !plan.is_active })
      await load()
      setMessage(`${plan.name} is now ${plan.is_active ? 'inactive' : 'active'}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update package.')
    } finally { setBusy(false) }
  }

  return <section className="product-visibility-management animate-fade-in">
    <div className="section-title-wrapper">
      <h2 className="section-title">Product Visibility Packages</h2>
      <p>Control which paid packages allow seller products to appear beyond their own stores. Products remain store-only until a verified payment is active.</p>
    </div>
    <div className="visibility-management-card">
      <h3>Free public catalog mode</h3>
      <p>When enabled, all active seller products can appear on the public Home and Products pages as they did before paid visibility packages. Sellers are not charged. Seller stores continue to work normally.</p>
      <div className="visibility-free-mode-row">
        <strong>{freeCatalogMode ? 'Enabled' : 'Disabled'}</strong>
        <button type="button" disabled={busy} onClick={() => void toggleFreeCatalog()}>
          {freeCatalogMode ? 'Disable free mode' : 'Enable free mode'}
        </button>
      </div>
      <small>{freeCatalogMode ? 'Public catalog is currently open to active products.' : 'Public catalog currently uses verified paid visibility entitlements.'}</small>
    </div>
    <div className="visibility-management-card">
      <h3>Create package</h3>
      <form className="visibility-plan-form" onSubmit={create}>
        <input required placeholder="Code, e.g. HOME_30_DAYS" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
        <input required placeholder="Package name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <select value={form.target} onChange={e => setForm({ ...form, target: e.target.value as ProductVisibilityTarget })}>{Object.entries(targetLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <input required type="number" min="0.01" step="0.01" placeholder="Price (GHS)" value={form.priceGhs} onChange={e => setForm({ ...form, priceGhs: e.target.value })} />
        <input required type="number" min="1" max="365" step="1" placeholder="Duration (days)" value={form.durationDays} onChange={e => setForm({ ...form, durationDays: e.target.value })} />
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create inactive package'}</button>
      </form>
    </div>
    <div className="visibility-management-card">
      <h3>Configured packages</h3>
      {plans.length === 0 ? <p>No visibility packages configured yet.</p> : <div className="visibility-plan-list">{plans.map(plan => <div className="visibility-plan-row" key={plan.id}><div><strong>{plan.name}</strong><span>{targetLabels[plan.target]} · GHS {(Number(plan.price_minor) / 100).toFixed(2)} · {plan.duration_days} day{plan.duration_days === 1 ? '' : 's'}</span><small>{plan.code}{plan.description ? ` · ${plan.description}` : ''}</small></div><button type="button" disabled={busy} onClick={() => void toggle(plan)}>{plan.is_active ? 'Deactivate' : 'Activate'}</button></div>)}</div>}
    </div>
    {message && <p className="visibility-management-message" role="status">{message}</p>}
  </section>
}
