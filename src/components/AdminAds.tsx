import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/currency'
import type { AdPlacement, Advertisement, AdStatus } from '../services/adService'
import './AdminAds.css'

type Advertiser = { id: string; name: string; advertiser_type: string }
type FormState = {
  advertiser_id: string
  campaign_name: string
  ad_type: string
  placement: AdPlacement
  priority: string
  headline: string
  description: string
  image_url: string
  destination_url: string
  starts_at: string
  ends_at: string
  budget_minor: string
}

const placements: AdPlacement[] = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'PRODUCT_LIST_TOP', 'PRODUCT_LIST_MIDDLE', 'PRODUCT_DETAILS', 'STORE_PAGE', 'CATEGORY_PAGE', 'SEARCH_RESULTS', 'SIDEBAR_DESKTOP', 'MOBILE_BANNER']
const emptyForm: FormState = { advertiser_id: '', campaign_name: '', ad_type: 'BANNER', placement: 'HOME_TOP', priority: '10', headline: '', description: '', image_url: '', destination_url: '', starts_at: '', ends_at: '', budget_minor: '0' }

const toIso = (value: string) => value ? new Date(value).toISOString() : ''
const isValidHttpsUrl = (value: string) => /^https:\/\//i.test(value)

const focusAdsField = (name: string) => {
  const field = document.querySelector<HTMLElement>(`[name="${name}"]`)
  field?.focus()
  field?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

export default function AdminAds() {
  const { user } = useAuth()
  const [ads, setAds] = useState<Advertisement[]>([])
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([])
  const [settings, setSettings] = useState({ advertising_enabled: false, seller_advertising_enabled: false, external_advertising_enabled: false, approval_required: true })
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(false)

  const load = async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    const [{ data: adData }, { data: advertiserData }, { data: settingsData }] = await Promise.all([
      supabase.from('advertisements').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('advertisers').select('id, name, advertiser_type').order('name'),
      supabase.from('advertising_settings').select('advertising_enabled, seller_advertising_enabled, external_advertising_enabled, approval_required').eq('id', true).maybeSingle(),
    ])
    setAds((adData || []) as Advertisement[])
    setAdvertisers((advertiserData || []) as Advertiser[])
    if (settingsData) setSettings(settingsData)
    if (!form.advertiser_id && advertiserData?.[0]) setForm((current) => ({ ...current, advertiser_id: advertiserData[0].id }))
  }

  useEffect(() => { void load() }, [])

  const updateSettings = async (patch: Partial<typeof settings>) => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('advertising_settings').update({ ...patch, updated_at: new Date().toISOString(), updated_by: user?.id || null }).eq('id', true)
    setBusy(false)
    setMessage(error ? error.message : 'Advertising settings updated.')
    if (!error) setSettings((current) => ({ ...current, ...patch }))
  }

  const saveAd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase || !user?.id) return
    if (!form.advertiser_id) { setMessage('Please select an advertiser before creating the ad.'); focusAdsField('advertiser_id'); return }
    if (!form.campaign_name.trim()) { setMessage('Enter a campaign name.'); focusAdsField('campaign_name'); return }
    if (!form.headline.trim()) { setMessage('Enter an advertisement headline.'); focusAdsField('headline'); return }
    if (!form.destination_url) { setMessage('Enter the HTTPS destination URL.'); focusAdsField('destination_url'); return }
    if (!isValidHttpsUrl(form.destination_url) || (form.image_url && !isValidHttpsUrl(form.image_url))) { setMessage('Use a complete HTTPS URL, for example https://example.com.'); focusAdsField(form.image_url && !isValidHttpsUrl(form.image_url) ? 'image_url' : 'destination_url'); return }
    if (!form.starts_at) { setMessage('Choose a start date and time.'); focusAdsField('starts_at'); return }
    if (!form.ends_at) { setMessage('Choose an end date and time.'); focusAdsField('ends_at'); return }
    if (new Date(form.ends_at) <= new Date(form.starts_at)) { setMessage('The end date must be after the start date.'); focusAdsField('ends_at'); return }
    if (Number(form.budget_minor) < 0 || !Number.isFinite(Number(form.budget_minor))) { setMessage('Enter a valid non-negative budget.'); focusAdsField('budget_minor'); return }
    setBusy(true)
    const { error } = await supabase.from('advertisements').insert({ advertiser_id: form.advertiser_id, campaign_name: form.campaign_name.trim(), ad_type: form.ad_type, placement: form.placement, status: settings.approval_required ? 'PENDING_APPROVAL' : 'SCHEDULED', priority: Math.max(1, Math.min(100, Number(form.priority) || 10)), headline: form.headline.trim(), description: form.description.trim() || null, image_url: form.image_url.trim() || null, destination_url: form.destination_url.trim(), starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at), budget_minor: Math.max(0, Math.round(Number(form.budget_minor) || 0) * 100), created_by: user.id })
    setBusy(false)
    setMessage(error ? error.message : 'Advertisement created.')
    if (!error) { setForm({ ...emptyForm, advertiser_id: form.advertiser_id }); await load() }
  }

  const setStatus = async (id: string, status: AdStatus) => {
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.from('advertisements').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    setMessage(error ? error.message : `Advertisement ${status.toLowerCase()}.`)
    if (!error) await load()
  }

  const summary = useMemo(() => ({
    impressions: ads.reduce((sum, ad) => sum + Number(ad.impressions_count || 0), 0),
    clicks: ads.reduce((sum, ad) => sum + Number(ad.clicks_count || 0), 0),
    active: ads.filter((ad) => ['ACTIVE', 'SCHEDULED'].includes(ad.status)).length,
    paused: ads.filter((ad) => ad.status === 'PAUSED').length,
    expired: ads.filter((ad) => ad.status === 'EXPIRED').length,
    revenue: ads.reduce((sum, ad) => sum + Number(ad.revenue_minor || 0), 0),
  }), [ads])
  const previewAd = { ...form, image_url: form.image_url || null, description: form.description || null }

  return <section className="admin-ads animate-fade-in">
    <div className="section-title-wrapper"><h2 className="section-title">Ads / Advertising</h2><p>Manage Reliable’s standalone advertising system. Seller promotions remain a separate feature.</p></div>
    <div className="ads-global-control"><div><strong>Advertising is {settings.advertising_enabled ? 'ON' : 'OFF'}</strong><span>{settings.advertising_enabled ? 'Eligible approved ads may appear in approved placements.' : 'No public ads are visible while this switch is off.'}</span></div><button type="button" disabled={busy} onClick={() => void updateSettings({ advertising_enabled: !settings.advertising_enabled })}>{settings.advertising_enabled ? 'Disable Advertising' : 'Enable Advertising'}</button></div>
    <div className="ads-summary"><div><strong>{summary.impressions.toLocaleString()}</strong><span>Total impressions</span></div><div><strong>{summary.clicks.toLocaleString()}</strong><span>Total clicks</span></div><div><strong>{summary.impressions ? ((summary.clicks / summary.impressions) * 100).toFixed(1) : '0.0'}%</strong><span>CTR</span></div><div><strong>{summary.active}</strong><span>Active campaigns</span></div><div><strong>{summary.paused}</strong><span>Paused</span></div><div><strong>{formatCurrency(summary.revenue / 100, 'GHS')}</strong><span>Ad revenue</span></div></div>
    <form className="ads-form" noValidate onSubmit={saveAd}><h3>Create advertisement</h3><div className="ads-form-grid">
      <select name="advertiser_id" value={form.advertiser_id} onChange={(e) => setForm({ ...form, advertiser_id: e.target.value })}><option value="">Select advertiser</option>{advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name} ({advertiser.advertiser_type})</option>)}</select>
      <input name="campaign_name" placeholder="Campaign name" value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} />
      <select value={form.ad_type} onChange={(e) => setForm({ ...form, ad_type: e.target.value })}><option value="BANNER">Banner</option><option value="PRODUCT">Product</option><option value="STORE">Store</option><option value="HOMEPAGE_PROMOTION">Homepage promotion</option></select>
      <select value={form.placement} onChange={(e) => setForm({ ...form, placement: e.target.value as AdPlacement })}>{placements.map((placement) => <option key={placement} value={placement}>{placement}</option>)}</select>
      <input name="headline" placeholder="Headline" maxLength={180} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
      <input placeholder="Description" maxLength={500} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <input name="image_url" type="url" placeholder="Image URL (HTTPS, optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
      <input name="destination_url" type="url" placeholder="Destination URL (HTTPS)" value={form.destination_url} onChange={(e) => setForm({ ...form, destination_url: e.target.value })} />
      <label>Start date/time<input name="starts_at" type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
      <label>End date/time<input name="ends_at" type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
      <label>Priority<input type="number" min="1" max="100" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></label>
      <label>Budget (GHS)<input name="budget_minor" type="number" min="0" step="0.01" value={form.budget_minor} onChange={(e) => setForm({ ...form, budget_minor: e.target.value })} /></label>
    </div><div className="ads-form-actions"><button type="submit" disabled={busy}>Create Ad</button><button type="button" onClick={() => setPreview(true)}>Preview Advertisement</button></div></form>
    {message && <p className="ads-message" role="status">{message}</p>}
    <div className="ads-list"><h3>Advertisements</h3>{ads.length === 0 ? <p>No advertisements created yet.</p> : <div className="ads-table-wrap"><table><thead><tr><th>Campaign</th><th>Placement</th><th>Status</th><th>Schedule</th><th>Performance</th><th>Actions</th></tr></thead><tbody>{ads.map((ad) => <tr key={ad.id}><td><strong>{ad.campaign_name}</strong><small>{ad.headline}</small></td><td>{ad.placement}</td><td><span className={`ads-status ads-status-${ad.status.toLowerCase()}`}>{ad.status}</span></td><td>{new Date(ad.starts_at).toLocaleDateString()} – {new Date(ad.ends_at).toLocaleDateString()}</td><td>{Number(ad.impressions_count || 0).toLocaleString()} views<br />{Number(ad.clicks_count || 0).toLocaleString()} clicks</td><td className="ads-actions">{ad.status === 'PENDING_APPROVAL' && <button disabled={busy} onClick={() => void setStatus(ad.id, 'ACTIVE')}>Approve</button>}{['ACTIVE', 'SCHEDULED'].includes(ad.status) && <button disabled={busy} onClick={() => void setStatus(ad.id, 'PAUSED')}>Pause</button>}{ad.status === 'PAUSED' && <button disabled={busy} onClick={() => void setStatus(ad.id, 'ACTIVE')}>Resume</button>}<button disabled={busy} onClick={() => void setStatus(ad.id, 'ARCHIVED')}>Archive</button></td></tr>)}</tbody></table></div>}</div>
    {preview && <div className="ads-preview-backdrop" role="dialog" aria-modal="true" aria-label="Advertisement preview" onClick={() => setPreview(false)}><div className="ads-preview-modal" onClick={(e) => e.stopPropagation()}><div className="ads-preview-header"><h3>Advertisement Preview</h3><button type="button" onClick={() => setPreview(false)}>Close</button></div><div className="ads-preview-devices"><div className="ads-preview-device ads-preview-desktop"><span>Desktop</span><AdPreview ad={previewAd} /></div><div className="ads-preview-device ads-preview-mobile"><span>Mobile</span><AdPreview ad={previewAd} /></div></div></div></div>}
  </section>
}

function AdPreview({ ad }: { ad: { headline: string; description: string | null; image_url: string | null } }) {
  return <div className="ads-preview-card">{ad.image_url && <img src={ad.image_url} alt="" /> }<span>Advertisement</span><strong>{ad.headline || 'Your headline will appear here'}</strong>{ad.description && <p>{ad.description}</p>}</div>
}
