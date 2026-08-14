import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { confirmAdvertisingPayment, generatePaymentReference, initializeAdvertisingPayment } from '../services/paystackService'
import type { AdPlacement } from '../services/adService'
import './AdvertiserOnboarding.css'

const placements: AdPlacement[] = ['HOME_TOP', 'PRODUCT_LIST_TOP', 'PRODUCT_DETAILS', 'STORE_PAGE', 'CATEGORY_PAGE', 'SEARCH_RESULTS', 'SIDEBAR_DESKTOP', 'MOBILE_BANNER']

type PricingPlan = { id: string; name: string; description: string | null; price_minor: number; duration_days: number }

const toLocalInput = (date: Date) => {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

const formatGhs = (minor: number) => new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(Number(minor || 0) / 100)

const initialForm = {
  advertiser_name: '',
  campaign_name: '',
  ad_type: 'BANNER',
  placement: 'HOME_TOP' as AdPlacement,
  headline: '',
  description: '',
  image_url: '',
  destination_url: '',
  starts_at: '',
  ends_at: '',
  pricing_plan_id: '',
}

export default function AdvertiserOnboarding() {
  const { user, session } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [plans, setPlans] = useState<PricingPlan[]>([])

  useEffect(() => {
    if (!supabase) return
    void supabase.from('ad_pricing_plans').select('id, name, description, price_minor, duration_days').eq('is_active', true).order('sort_order').then(({ data, error }) => {
      if (error) { setMessage(error.message); return }
      const loaded = (data || []) as PricingPlan[]
      setPlans(loaded)
      if (loaded[0]) setForm((current) => ({ ...current, pricing_plan_id: current.pricing_plan_id || loaded[0].id }))
    })
  }, [])

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get('reference')
    const pendingRaw = window.localStorage.getItem('reliable_advertising_pending')
    if (!reference || !pendingRaw || !session?.access_token) return
    const pending = JSON.parse(pendingRaw) as { ad_payment_id: string; reference: string }
    if (pending.reference !== reference) return
    setBusy(true)
    void confirmAdvertisingPayment({ ad_payment_id: pending.ad_payment_id, reference }, session.access_token)
      .then(() => {
        window.localStorage.removeItem('reliable_advertising_pending')
        window.history.replaceState({}, document.title, '/advertise')
        setMessage('Payment confirmed. Your advertisement has been submitted for admin approval.')
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setBusy(false))
  }, [session?.access_token])

  const update = (key: keyof typeof initialForm, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!session?.access_token || !user?.email) { setMessage('Please sign in before creating an advertisement.'); return }
    const selectedPlan = plans.find((plan) => plan.id === form.pricing_plan_id)
    if (!selectedPlan) { setMessage('Select an available advertising package.'); return }
    if (!form.starts_at || !form.ends_at) { setMessage('Choose the campaign dates for the selected package.'); return }
    setBusy(true)
    setMessage('Preparing secure Paystack checkout…')
    try {
      const reference = generatePaymentReference().replace('rlbl-', 'rlbl-ad-')
      const result = await initializeAdvertisingPayment({
        advertiser_name: form.advertiser_name,
        advertiser_type: 'EXTERNAL',
        reference,
        email: user.email,
        callback_url: `${window.location.origin}/advertise`,
        campaign: {
          campaign_name: form.campaign_name,
          pricing_plan_id: selectedPlan.id,
          ad_type: form.ad_type,
          placement: form.placement,
          headline: form.headline,
          description: form.description,
          image_url: form.image_url,
          destination_url: form.destination_url,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          budget_minor: selectedPlan.price_minor,
        },
      }, session.access_token)
      window.localStorage.setItem('reliable_advertising_pending', JSON.stringify({ ad_payment_id: result.data.ad_payment_id, reference: result.data.reference }))
      window.location.assign(result.data.authorization_url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start advertising checkout.')
      setBusy(false)
    }
  }

  const selectedPlan = plans.find((plan) => plan.id === form.pricing_plan_id)

  return <main className="advertiser-page"><section className="advertiser-card"><Link to="/" className="advertiser-back">← Back to Reliable</Link><h1>Advertise on Reliable</h1><p>Create a campaign, choose an approved package, pay securely through Paystack, and submit it for admin approval.</p><form onSubmit={submit} className="advertiser-form"><input required placeholder="Advertiser or business name" value={form.advertiser_name} onChange={(e) => update('advertiser_name', e.target.value)} /><input required placeholder="Campaign name" value={form.campaign_name} onChange={(e) => update('campaign_name', e.target.value)} /><select value={form.ad_type} onChange={(e) => update('ad_type', e.target.value)}><option value="BANNER">Banner</option><option value="PRODUCT">Product</option><option value="STORE">Store</option><option value="HOMEPAGE_PROMOTION">Homepage promotion</option></select><select value={form.placement} onChange={(e) => update('placement', e.target.value)}>{placements.map((placement) => <option key={placement} value={placement}>{placement}</option>)}</select><input required placeholder="Headline" maxLength={180} value={form.headline} onChange={(e) => update('headline', e.target.value)} /><textarea placeholder="Description (optional)" maxLength={500} value={form.description} onChange={(e) => update('description', e.target.value)} /><input type="url" placeholder="Image URL (HTTPS, optional)" value={form.image_url} onChange={(e) => update('image_url', e.target.value)} /><input required type="url" placeholder="Destination URL (HTTPS)" value={form.destination_url} onChange={(e) => update('destination_url', e.target.value)} /><label>Advertising package<select required value={form.pricing_plan_id} onChange={(e) => { const plan = plans.find((item) => item.id === e.target.value); const start = form.starts_at ? new Date(form.starts_at) : new Date(); const end = plan ? new Date(start.getTime() + plan.duration_days * 86400000) : start; setForm((current) => ({ ...current, pricing_plan_id: e.target.value, starts_at: current.starts_at || toLocalInput(start), ends_at: plan ? toLocalInput(end) : current.ends_at })) }}>{plans.length ? plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {formatGhs(plan.price_minor)} for {plan.duration_days} day{plan.duration_days === 1 ? '' : 's'}</option>) : <option value="">No packages available</option>}</select></label>{selectedPlan && <p className="advertiser-package-note">{selectedPlan.description || 'Admin-managed advertising package'} — {formatGhs(selectedPlan.price_minor)} total.</p>}<label>Start date/time<input required type="datetime-local" value={form.starts_at} onChange={(e) => { const start = new Date(e.target.value); setForm((current) => ({ ...current, starts_at: e.target.value, ends_at: selectedPlan && Number.isFinite(start.getTime()) ? toLocalInput(new Date(start.getTime() + selectedPlan.duration_days * 86400000)) : current.ends_at })) }} /></label><label>End date/time<input required type="datetime-local" value={form.ends_at} readOnly={Boolean(selectedPlan)} onChange={(e) => update('ends_at', e.target.value)} /></label><button disabled={busy || !plans.length} type="submit">{busy ? 'Processing…' : 'Continue to Paystack'}</button></form>{message && <p className="advertiser-message" role="status">{message}</p>}</section></main>
}
