import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../utils/currency'
import './AdminPromotions.css'

type Plan = { id: string; code: 'FEATURED_PRODUCT' | 'FEATURED_STORE'; name: string; price_minor: number; currency: string; duration_days: number; placement: string; max_active_promotions: number; is_active: boolean }
type Promotion = { id: string; seller_id: string; store_id: string; product_id: string | null; promotion_type: string; status: string; amount_minor: number; currency: string; starts_at: string | null; ends_at: string | null; payment_reference: string | null; created_at: string }

const emptyPlan = { code: 'FEATURED_PRODUCT' as Plan['code'], name: 'Featured Product', price: '', duration_days: '7', placement: 'MARKETPLACE', max_active_promotions: '10', is_active: false }

export default function AdminPromotions() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [form, setForm] = useState(emptyPlan)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const load = async () => {
    if (!supabase) { setMessage('Supabase is not configured.'); return }
    const [{ data: planData }, { data: promotionData }] = await Promise.all([
      supabase.from('promotion_plans').select('*').order('created_at'),
      supabase.from('seller_promotions').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    setPlans((planData || []) as Plan[]); setPromotions((promotionData || []) as Promotion[])
  }
  useEffect(() => { void load() }, [])
  const savePlan = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    if (!supabase) { setBusy(false); setMessage('Supabase is not configured.'); return }
    const { error } = await supabase.from('promotion_plans').upsert({ code: form.code, name: form.name, price_minor: Math.round(Number(form.price) * 100), currency: 'GHS', duration_days: Number(form.duration_days), placement: form.placement, max_active_promotions: Number(form.max_active_promotions), is_active: form.is_active }, { onConflict: 'code' })
    setBusy(false); setMessage(error ? error.message : 'Promotion plan saved.'); if (!error) { setForm(emptyPlan); await load() }
  }
  const setStatus = async (id: string, status: 'CANCELLED' | 'SUSPENDED' | 'ACTIVE') => { setBusy(true); if (!supabase) { setBusy(false); setMessage('Supabase is not configured.'); return } const { error } = await supabase.from('seller_promotions').update({ status, updated_at: new Date().toISOString() }).eq('id', id); setBusy(false); setMessage(error ? error.message : 'Promotion status updated.'); if (!error) await load() }
  return <section className="admin-promotions animate-fade-in">
    <div className="section-title-wrapper"><h2 className="section-title">Advertising & Promotions</h2><p>Configure paid placements and monitor promotion history. Payment activation remains server-verified.</p></div>
    <form className="promotion-plan-form" onSubmit={savePlan}><h3>Promotion plan settings</h3><div className="promotion-form-grid">
      <select value={form.code} onChange={e => setForm({ ...form, code: e.target.value as Plan['code'], name: e.target.value === 'FEATURED_PRODUCT' ? 'Featured Product' : 'Featured Store', placement: e.target.value === 'FEATURED_PRODUCT' ? 'MARKETPLACE' : 'STORES' })}><option value="FEATURED_PRODUCT">Featured Product</option><option value="FEATURED_STORE">Featured Store</option></select>
      <input required type="number" min="0.01" step="0.01" placeholder="Price (GHS)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
      <input required type="number" min="1" placeholder="Duration (days)" value={form.duration_days} onChange={e => setForm({ ...form, duration_days: e.target.value })} />
      <input required type="number" min="1" placeholder="Maximum active" value={form.max_active_promotions} onChange={e => setForm({ ...form, max_active_promotions: e.target.value })} />
      <label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Available to sellers</label><button disabled={busy} type="submit">Save plan</button>
    </div></form>
    {message && <p className="admin-promotion-message">{message}</p>}
    <div className="promotion-plan-list"><h3>Configured plans</h3>{plans.length === 0 ? <p>No plans configured yet.</p> : plans.map(plan => <div className="promotion-plan-row" key={plan.id}><strong>{plan.name}</strong><span>{formatCurrency(Number(plan.price_minor) / 100, plan.currency)} / {plan.duration_days} days</span><span>{plan.is_active ? 'Available' : 'Inactive'}</span></div>)}</div>
    <div className="promotion-history"><h3>Promotion history</h3>{promotions.length === 0 ? <p>No seller promotions yet.</p> : <div className="promotion-table-wrap"><table><thead><tr><th>Type</th><th>Seller</th><th>Amount</th><th>Status</th><th>Period</th><th>Action</th></tr></thead><tbody>{promotions.map(p => <tr key={p.id}><td>{p.promotion_type}</td><td>{p.seller_id.slice(0, 8)}…</td><td>{formatCurrency(Number(p.amount_minor) / 100, p.currency)}</td><td>{p.status}</td><td>{p.starts_at ? new Date(p.starts_at).toLocaleDateString() : '—'} – {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : '—'}</td><td>{(p.status === 'ACTIVE' || p.status === 'PENDING_PAYMENT') && <button disabled={busy} onClick={() => void setStatus(p.id, 'CANCELLED')}>Cancel</button>}{p.status === 'SUSPENDED' && <button disabled={busy} onClick={() => void setStatus(p.id, 'ACTIVE')}>Restore</button>}</td></tr>)}</tbody></table></div>}</div>
  </section>
}
