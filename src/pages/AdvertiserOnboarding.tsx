import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { confirmAdvertisingPayment, generatePaymentReference, initializeAdvertisingPayment } from '../services/paystackService'
import type { AdPlacement } from '../services/adService'
import './AdvertiserOnboarding.css'

const placements: AdPlacement[] = ['HOME_TOP', 'PRODUCT_LIST_TOP', 'PRODUCT_DETAILS', 'STORE_PAGE', 'CATEGORY_PAGE', 'SEARCH_RESULTS', 'SIDEBAR_DESKTOP', 'MOBILE_BANNER']

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
  budget: '',
}

export default function AdvertiserOnboarding() {
  const { user, session } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

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
    const budgetMinor = Math.round(Number(form.budget) * 100)
    if (!Number.isInteger(budgetMinor) || budgetMinor <= 0) { setMessage('Enter a positive advertising budget.'); return }
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
          ad_type: form.ad_type,
          placement: form.placement,
          headline: form.headline,
          description: form.description,
          image_url: form.image_url,
          destination_url: form.destination_url,
          starts_at: form.starts_at,
          ends_at: form.ends_at,
          budget_minor: budgetMinor,
        },
      }, session.access_token)
      window.localStorage.setItem('reliable_advertising_pending', JSON.stringify({ ad_payment_id: result.data.ad_payment_id, reference: result.data.reference }))
      window.location.assign(result.data.authorization_url)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to start advertising checkout.')
      setBusy(false)
    }
  }

  return <main className="advertiser-page"><section className="advertiser-card"><Link to="/" className="advertiser-back">← Back to Reliable</Link><h1>Advertise on Reliable</h1><p>Create a campaign, pay securely through Paystack, and submit it for admin approval. Public advertising remains controlled by Reliable.</p><form onSubmit={submit} className="advertiser-form"><input required placeholder="Advertiser or business name" value={form.advertiser_name} onChange={(e) => update('advertiser_name', e.target.value)} /><input required placeholder="Campaign name" value={form.campaign_name} onChange={(e) => update('campaign_name', e.target.value)} /><select value={form.ad_type} onChange={(e) => update('ad_type', e.target.value)}><option value="BANNER">Banner</option><option value="PRODUCT">Product</option><option value="STORE">Store</option><option value="HOMEPAGE_PROMOTION">Homepage promotion</option></select><select value={form.placement} onChange={(e) => update('placement', e.target.value)}>{placements.map((placement) => <option key={placement} value={placement}>{placement}</option>)}</select><input required placeholder="Headline" maxLength={180} value={form.headline} onChange={(e) => update('headline', e.target.value)} /><textarea placeholder="Description (optional)" maxLength={500} value={form.description} onChange={(e) => update('description', e.target.value)} /><input type="url" placeholder="Image URL (HTTPS, optional)" value={form.image_url} onChange={(e) => update('image_url', e.target.value)} /><input required type="url" placeholder="Destination URL (HTTPS)" value={form.destination_url} onChange={(e) => update('destination_url', e.target.value)} /><label>Start date/time<input required type="datetime-local" value={form.starts_at} onChange={(e) => update('starts_at', e.target.value)} /></label><label>End date/time<input required type="datetime-local" value={form.ends_at} onChange={(e) => update('ends_at', e.target.value)} /></label><label>Campaign budget (GHS)<input required type="number" min="0.01" step="0.01" value={form.budget} onChange={(e) => update('budget', e.target.value)} /></label><button disabled={busy} type="submit">{busy ? 'Processing…' : 'Continue to Paystack'}</button></form>{message && <p className="advertiser-message" role="status">{message}</p>}</section></main>
}
