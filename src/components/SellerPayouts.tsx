import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../utils/currency'
import './SellerPayouts.css'

type Payout = {
  payout_id: string
  order_id: string
  seller_id: string
  store_id: string
  customer_id: string | null
  gross_amount_minor: number
  commission_amount_minor: number
  seller_payout_amount_minor: number
  currency: string
  eligibility_status: string
  payout_status: string
  paystack_transfer_reference: string | null
  failure_reason: string | null
  created_at: string
  paid_at: string | null
}

const statusLabel: Record<string, string> = {
  HELD: 'Payout Held',
  ELIGIBLE: 'Payout Eligible',
  QUEUED: 'Payout Queued',
  PROCESSING: 'Payout Processing',
  PAID: 'Payout Paid',
  FAILED: 'Payout Failed — requires retry/review',
  REVERSED: 'Payout Reversed',
}

export default function SellerPayouts({ businessIds }: { businessIds?: string[] }) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    if (!supabase) return
    let query = supabase!.from('seller_payouts').select('*').order('created_at', { ascending: false })
    if (businessIds && businessIds.length > 0) query = query.in('store_id', businessIds)
    const { data, error: queryError } = await query
    if (queryError) setError(queryError.message)
    else setPayouts((data || []) as Payout[])
  }

  useEffect(() => { load() }, [businessIds?.join(',')])

  const visible = useMemo(() => payouts.filter((payout) => {
    const matchesStatus = !filter || payout.payout_status === filter
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [payout.payout_id, payout.order_id, payout.seller_id, payout.store_id, payout.paystack_transfer_reference || ''].some((value) => value.toLowerCase().includes(term))
    return matchesStatus && matchesSearch
  }), [payouts, filter, search])

  const totals = useMemo(() => payouts.reduce<Record<string, number>>((result, payout) => {
    result[payout.payout_status] = (result[payout.payout_status] || 0) + 1
    return result
  }, {}), [payouts])

  return (
    <section className="seller-payouts">
      <div className="seller-payouts-header">
        <div>
          <h2>Seller Payouts</h2>
          <p>Customer confirmation makes a payout eligible. Only a verified Paystack success makes it paid.</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="payout-summary-grid">
        {['HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED'].map((status) => (
          <div className="payout-summary-card" key={status}>
            <span>{statusLabel[status]}</span>
            <strong>{totals[status] || 0}</strong>
          </div>
        ))}
      </div>

      <div className="payout-filters">
        <input placeholder="Search payout, order, seller, store or transfer reference" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="">All payout states</option>
          {Object.keys(statusLabel).map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
        </select>
      </div>

      <div className="payout-table-wrap">
        <table className="payout-table">
          <thead><tr><th>Order</th><th>Seller / Store</th><th>Gross</th><th>Commission</th><th>Seller amount</th><th>Status</th><th>Transfer</th></tr></thead>
          <tbody>
            {visible.map((payout) => (
              <tr key={payout.payout_id}>
                <td><strong>#{payout.order_id.slice(0, 8)}</strong><small>{payout.payout_id.slice(0, 8)}</small></td>
                <td><small>{payout.seller_id}</small><small>{payout.store_id}</small></td>
                <td>{formatCurrency(payout.gross_amount_minor / 100)}</td>
                <td>{formatCurrency(payout.commission_amount_minor / 100)}</td>
                <td><strong>{formatCurrency(payout.seller_payout_amount_minor / 100)}</strong></td>
                <td><span className={`payout-badge payout-${payout.payout_status.toLowerCase()}`}>{statusLabel[payout.payout_status] || payout.payout_status}</span>{payout.failure_reason && <small>{payout.failure_reason}</small>}</td>
                <td>{payout.paystack_transfer_reference ? <small>{payout.paystack_transfer_reference}</small> : 'Not initiated'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="payout-empty">No payouts match the current filters.</div>}
      </div>
    </section>
  )
}
