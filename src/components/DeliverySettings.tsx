import { useEffect, useMemo, useState } from 'react'
import {
  createDeliveryMethod,
  deleteDeliveryMethod,
  getBusinessDeliveryMethods,
  getGlobalDeliveryMethods,
  updateDeliveryMethod,
  type DeliveryMethod,
  type DeliveryPricingType,
} from '../services/deliveryService'
import { formatCurrency } from '../utils/currency'
import './DeliverySettings.css'

interface DeliverySettingsProps {
  businessId?: string
  isAdmin: boolean
  countryCode?: string | null
  currencyCode?: string | null
}

type DeliveryForm = {
  name: string
  coverage_area: string
  price: string
  currency_code: string
  pricing_type: DeliveryPricingType
  estimated_days: string
  country_code: string
  is_active: boolean
  sort_order: string
}

const CURRENCY_OPTIONS = [
  ['GHS', 'GHS (₵)'],
  ['USD', 'USD ($)'],
  ['NGN', 'NGN (₦)'],
  ['KES', 'KES (KSh)'],
  ['GBP', 'GBP (£)'],
  ['EUR', 'EUR (€)'],
  ['ZAR', 'ZAR (R)'],
]

const COUNTRY_OPTIONS = [
  ['', 'All countries'],
  ['GH', 'Ghana'],
  ['NG', 'Nigeria'],
  ['KE', 'Kenya'],
  ['US', 'United States'],
  ['GB', 'United Kingdom'],
  ['ZA', 'South Africa'],
]

function makeInitialForm(countryCode = '', currencyCode = 'GHS'): DeliveryForm {
  return {
    name: '',
    coverage_area: '',
    price: '',
    currency_code: currencyCode,
    pricing_type: 'flat',
    estimated_days: '',
    country_code: countryCode,
    is_active: true,
    sort_order: '0',
  }
}

export default function DeliverySettings({ businessId, isAdmin, countryCode, currencyCode }: DeliverySettingsProps) {
  const [methods, setMethods] = useState<DeliveryMethod[]>([])
  const [form, setForm] = useState<DeliveryForm>(makeInitialForm(isAdmin ? '' : countryCode || 'GH', currencyCode || 'GHS'))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const scopeLabel = useMemo(() => isAdmin ? 'Global marketplace delivery' : 'Your store delivery', [isAdmin])

  const loadMethods = async () => {
    if (!isAdmin && !businessId) {
      setMethods([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const data = isAdmin
        ? await getGlobalDeliveryMethods()
        : await getBusinessDeliveryMethods(businessId as string)
      setMethods(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load delivery methods')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMethods()
  }, [businessId, isAdmin])

  const resetForm = () => {
    setEditingId(null)
    setForm(makeInitialForm(isAdmin ? '' : countryCode || 'GH', currencyCode || 'GHS'))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')

    const price = Number(form.price)
    if (!form.name.trim() || !form.coverage_area.trim() || !Number.isFinite(price) || price < 0) {
      setError('Enter a delivery name, coverage area, and a valid non-negative price.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        business_id: isAdmin ? null : businessId,
        country_code: isAdmin ? (form.country_code || null) : (countryCode || 'GH'),
        name: form.name.trim(),
        coverage_area: form.coverage_area.trim(),
        price,
        currency_code: form.currency_code,
        pricing_type: form.pricing_type,
        estimated_days: form.estimated_days.trim() || null,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      }

      if (editingId) {
        await updateDeliveryMethod(editingId, payload)
        setNotice('Delivery method updated.')
      } else {
        await createDeliveryMethod(payload)
        setNotice('Delivery method added.')
      }

      resetForm()
      await loadMethods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save delivery method')
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (method: DeliveryMethod) => {
    setEditingId(method.id)
    setForm({
      name: method.name,
      coverage_area: method.coverage_area,
      price: String(method.price),
      currency_code: method.currency_code,
      pricing_type: method.pricing_type,
      estimated_days: method.estimated_days || '',
      country_code: method.country_code || '',
      is_active: method.is_active,
      sort_order: String(method.sort_order),
    })
    setNotice('')
    setError('')
  }

  const handleDelete = async (method: DeliveryMethod) => {
    if (!window.confirm(`Delete ${method.name}? Customers will no longer see this delivery option.`)) return
    setError('')
    try {
      await deleteDeliveryMethod(method.id)
      setNotice('Delivery method deleted.')
      if (editingId === method.id) resetForm()
      await loadMethods()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete delivery method')
    }
  }

  return (
    <div className="delivery-settings-content animate-fade-in">
      <div className="section-title-wrapper">
        <h2 className="section-title">Delivery Settings</h2>
        <p>Define delivery methods, coverage areas, estimated times, and prices for your market.</p>
      </div>

      <div className="delivery-scope-banner">
        <strong>{scopeLabel}</strong>
        <span>{isAdmin ? 'These defaults are used when a store has not configured its own delivery methods.' : 'These methods replace the global defaults for your store.'}</span>
      </div>

      {(error || notice) && (
        <div className={error ? 'delivery-alert error' : 'delivery-alert success'} role="status">
          {error || notice}
        </div>
      )}

      <div className="delivery-settings-grid">
        <form className="settings-card delivery-form" onSubmit={handleSubmit}>
          <div className="card-heading-row">
            <div>
              <h3>{editingId ? 'Edit delivery method' : 'Add delivery method'}</h3>
              <p>Customers will see this option during checkout.</p>
            </div>
            {editingId && <button type="button" className="btn-secondary btn-sm" onClick={resetForm}>Cancel edit</button>}
          </div>

          <div className="form-group">
            <label htmlFor="delivery-name">Delivery method</label>
            <input id="delivery-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Local courier" required />
          </div>

          <div className="form-group">
            <label htmlFor="delivery-area">Coverage area</label>
            <input id="delivery-area" value={form.coverage_area} onChange={e => setForm({ ...form, coverage_area: e.target.value })} placeholder="e.g. Accra, Ghana or worldwide" required />
          </div>

          <div className="delivery-form-row">
            <div className="form-group">
              <label htmlFor="delivery-price">Price</label>
              <input id="delivery-price" type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" required />
            </div>
            <div className="form-group">
              <label htmlFor="delivery-currency">Currency</label>
              <select id="delivery-currency" value={form.currency_code} onChange={e => setForm({ ...form, currency_code: e.target.value })}>
                {CURRENCY_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
          </div>

          {isAdmin && (
            <div className="form-group">
              <label htmlFor="delivery-country">Country scope</label>
              <select id="delivery-country" value={form.country_code} onChange={e => setForm({ ...form, country_code: e.target.value })}>
                {COUNTRY_OPTIONS.map(([code, label]) => <option key={code || 'all'} value={code}>{label}</option>)}
              </select>
            </div>
          )}

          <div className="delivery-form-row">
            <div className="form-group">
              <label htmlFor="delivery-pricing">Pricing basis</label>
              <select id="delivery-pricing" value={form.pricing_type} onChange={e => setForm({ ...form, pricing_type: e.target.value as DeliveryPricingType })}>
                <option value="flat">Flat order price</option>
                <option value="per_item">Per item</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="delivery-days">Estimated time</label>
              <input id="delivery-days" value={form.estimated_days} onChange={e => setForm({ ...form, estimated_days: e.target.value })} placeholder="e.g. 2-4 days" />
            </div>
          </div>

          <div className="delivery-form-row">
            <div className="form-group">
              <label htmlFor="delivery-order">Display order</label>
              <input id="delivery-order" type="number" step="1" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} />
            </div>
            <label className="delivery-active-toggle">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
              <span>Available at checkout</span>
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Saving...' : editingId ? 'Update delivery method' : 'Add delivery method'}
          </button>
        </form>

        <div className="settings-card delivery-list-card">
          <div className="card-heading-row">
            <div>
              <h3>Configured methods</h3>
              <p>{methods.length} method{methods.length === 1 ? '' : 's'} in this scope.</p>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={loadMethods} disabled={isLoading}>Refresh</button>
          </div>

          {isLoading ? <p className="delivery-empty">Loading delivery methods...</p> : methods.length === 0 ? (
            <p className="delivery-empty">No store-specific methods yet. Add one to replace the global defaults.</p>
          ) : (
            <div className="delivery-method-list">
              {methods.map(method => (
                <div className={`delivery-method-item ${method.is_active ? '' : 'inactive'}`} key={method.id}>
                  <div className="delivery-method-main">
                    <div className="delivery-method-title-row">
                      <strong>{method.name}</strong>
                      {!method.is_active && <span className="delivery-status">Inactive</span>}
                    </div>
                    <span>{method.coverage_area}</span>
                    <small>{method.estimated_days || 'Time not specified'} · {method.pricing_type === 'per_item' ? 'per item' : 'flat order price'}{method.country_code ? ` · ${method.country_code}` : ''}</small>
                  </div>
                  <div className="delivery-method-actions">
                    <strong>{formatCurrency(method.price, method.currency_code)}</strong>
                    <div>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => handleEdit(method)}>Edit</button>
                      <button type="button" className="btn-delete btn-sm" onClick={() => handleDelete(method)}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
