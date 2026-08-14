import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { formatCurrency } from '../utils/currency'
import './SellerPayouts.css'

type WalletSummary = {
  pending_minor: number
  available_minor: number
  total_earnings_minor: number
  total_sales_minor: number
  commission_minor: number
  paid_out_minor: number
  adjustments_minor: number
}

type WalletLedgerEntry = {
  id: string
  transaction_type: string
  amount_minor: number
  status: string
  reference: string
  description: string
  created_at: string
}

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
  payout_mode: 'AUTOMATED' | 'MANUAL' | string
  paystack_transfer_reference: string | null
  manual_payout_method: string | null
  manual_payout_reference: string | null
  manual_payout_notes: string | null
  failure_reason: string | null
  created_at: string
  paid_at: string | null
}

type ManualDraft = {
  reference: string
  notes: string
}

type PayoutProfile = {
  seller_id: string
  store_id: string
  recipient_type: string
  account_name: string | null
  account_number_last4: string | null
  bank_code: string | null
  currency: string | null
  country_code: string | null
  is_active: boolean
  payout_profile_confirmed_at: string | null
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

export default function SellerPayouts({ businessIds, isAdmin = false }: { businessIds?: string[]; isAdmin?: boolean }) {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [payoutProfiles, setPayoutProfiles] = useState<Record<string, PayoutProfile>>({})
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([])
  const [manualDrafts, setManualDrafts] = useState<Record<string, ManualDraft>>({})
  const [savingPayoutId, setSavingPayoutId] = useState<string | null>(null)

  const load = async () => {
    if (!supabase) return
    setError('')
    let query = supabase.from('seller_payouts').select('*').order('created_at', { ascending: false })
    if (businessIds && businessIds.length > 0) query = query.in('store_id', businessIds)
    const { data, error: queryError } = await query
    if (queryError) setError(queryError.message)
    else {
      const loadedPayouts = (data || []) as Payout[]
      setPayouts(loadedPayouts)
      const sellerIds = [...new Set(loadedPayouts.map((payout) => payout.seller_id))]
      const storeIds = [...new Set(loadedPayouts.map((payout) => payout.store_id))]
      if (sellerIds.length > 0 && storeIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('seller_payout_profiles')
          .select('seller_id, store_id, recipient_type, account_name, account_number_last4, bank_code, currency, country_code, is_active, payout_profile_confirmed_at')
          .in('seller_id', sellerIds)
          .in('store_id', storeIds)
        if (profileError) setError(profileError.message)
        else setPayoutProfiles(Object.fromEntries(((profileData || []) as PayoutProfile[]).map((profile) => [`${profile.seller_id}:${profile.store_id}`, profile])))
      }
    }

    if (businessIds && businessIds.length > 0) {
      const [{ data: walletData, error: walletError }, { data: ledgerData, error: ledgerError }] = await Promise.all([
        supabase.rpc('get_seller_wallet_summary'),
        supabase.from('seller_wallet_ledger').select('id, transaction_type, amount_minor, status, reference, description, created_at').order('created_at', { ascending: false }).limit(50),
      ])
      if (walletError) setError(walletError.message)
      else setWallet((walletData?.[0] || null) as WalletSummary | null)
      if (!ledgerError) setLedger((ledgerData || []) as WalletLedgerEntry[])
    }
  }

  useEffect(() => { load() }, [businessIds?.join(',')])

  const updateDraft = (payoutId: string, field: keyof ManualDraft, value: string) => {
    setManualDrafts((previous) => ({
      ...previous,
      [payoutId]: { ...(previous[payoutId] || { reference: '', notes: '' }), [field]: value },
    }))
  }

  const markManualPaid = async (payout: Payout) => {
    if (!supabase) return
    const profile = payoutProfiles[`${payout.seller_id}:${payout.store_id}`]
    const draft = manualDrafts[payout.payout_id] || { reference: '', notes: '' }
    if (!profile?.is_active || !profile.payout_profile_confirmed_at) {
      setError('The seller must confirm an active payout profile before manual settlement.')
      return
    }
    if (!draft.reference.trim()) {
      setError('Manual payout reference is required after you send the transfer.')
      return
    }

    setSavingPayoutId(payout.payout_id)
    setError('')
    setSuccess('')
    try {
      const { error: rpcError } = await supabase.rpc('admin_mark_manual_payout_paid', {
        p_payout_id: payout.payout_id,
        p_method: profile?.recipient_type || null,
        p_reference: draft.reference.trim(),
        p_notes: draft.notes.trim() || null,
      })
      if (rpcError) throw rpcError
      setSuccess(`Manual payout for order #${payout.order_id.slice(0, 8)} was recorded as paid.`)
      setManualDrafts((previous) => ({ ...previous, [payout.payout_id]: { reference: '', notes: '' } }))
      await load()
    } catch (rpcError: any) {
      setError(rpcError.message || 'Manual payout could not be recorded.')
    } finally {
      setSavingPayoutId(null)
    }
  }

  const visible = useMemo(() => payouts.filter((payout) => {
    const matchesStatus = !filter || payout.payout_status === filter
    const term = search.trim().toLowerCase()
    const matchesSearch = !term || [
      payout.payout_id,
      payout.order_id,
      payout.seller_id,
      payout.store_id,
      payout.paystack_transfer_reference || '',
      payout.manual_payout_reference || '',
    ].some((value) => value.toLowerCase().includes(term))
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
          <p>{isAdmin ? 'Ghana/Paystack payouts remain automated. After delivery confirmation, unsupported seller countries appear here for manual sending.' : 'Customer confirmation makes a payout eligible. A verified transfer or administrator-recorded manual payout is required before it is marked paid.'}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {businessIds && businessIds.length > 0 && wallet && (
        <>
          <div className="wallet-heading">
            <div>
              <h3>My Wallet / Earnings</h3>
              <p>Eligible earnings are not marked paid until the verified Paystack transfer succeeds or an administrator records the manual payout.</p>
            </div>
          </div>
          <div className="wallet-summary-grid">
            <div><span>Available Balance</span><strong>{formatCurrency(wallet.available_minor / 100)}</strong></div>
            <div><span>Pending Earnings</span><strong>{formatCurrency(wallet.pending_minor / 100)}</strong></div>
            <div><span>Total Earnings</span><strong>{formatCurrency(wallet.total_earnings_minor / 100)}</strong></div>
            <div><span>Total Sales</span><strong>{formatCurrency(wallet.total_sales_minor / 100)}</strong></div>
            <div><span>Reliable Commission</span><strong>{formatCurrency(wallet.commission_minor / 100)}</strong></div>
            <div><span>Total Paid Out</span><strong>{formatCurrency(wallet.paid_out_minor / 100)}</strong></div>
          </div>
          <div className="wallet-ledger-wrap">
            <h3>Wallet History</h3>
            <table className="payout-table">
              <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleDateString()}</td>
                    <td>{entry.transaction_type.replace('_', ' ')}</td>
                    <td><small>{entry.description}</small><small>{entry.reference}</small></td>
                    <td className={entry.amount_minor >= 0 ? 'wallet-credit' : 'wallet-debit'}>{entry.amount_minor >= 0 ? '+' : ''}{formatCurrency(entry.amount_minor / 100)}</td>
                    <td><span className="payout-badge">{entry.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledger.length === 0 && <div className="payout-empty">No wallet entries yet.</div>}
          </div>
        </>
      )}

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
          <thead><tr><th>Order</th><th>Seller / Store</th><th>Gross</th><th>Commission</th><th>Seller amount</th><th>Mode / status</th><th>Transfer / manual record</th>{isAdmin && <th>Admin action</th>}</tr></thead>
          <tbody>
            {visible.map((payout) => {
              const profile = payoutProfiles[`${payout.seller_id}:${payout.store_id}`]
              const draft = manualDrafts[payout.payout_id] || { reference: '', notes: '' }
              const canMarkManualPaid = isAdmin && payout.payout_mode === 'MANUAL' && ['ELIGIBLE', 'QUEUED', 'FAILED'].includes(payout.payout_status) && Boolean(profile?.is_active && profile.payout_profile_confirmed_at)
              return (
                <tr key={payout.payout_id}>
                  <td><strong>#{payout.order_id.slice(0, 8)}</strong><small>{payout.payout_id.slice(0, 8)}</small></td>
                  <td><small>{payout.seller_id}</small><small>{payout.store_id}</small></td>
                  <td>{formatCurrency(payout.gross_amount_minor / 100)}</td>
                  <td>{formatCurrency(payout.commission_amount_minor / 100)}</td>
                  <td><strong>{formatCurrency(payout.seller_payout_amount_minor / 100)}</strong></td>
                  <td><span className="payout-badge">{payout.payout_mode === 'MANUAL' ? 'Manual payout' : 'Automated Paystack'}</span><span className={`payout-badge payout-${payout.payout_status.toLowerCase()}`}>{statusLabel[payout.payout_status] || payout.payout_status}</span>{payout.failure_reason && <small>{payout.failure_reason}</small>}</td>
                  <td>{payout.payout_mode === 'MANUAL' ? <><small>{profile ? `${profile.country_code || 'Country not set'} · ${profile.currency || payout.currency} · ${profile.recipient_type}` : 'Payout profile not found'}</small><small>{profile?.account_name || 'Account name not confirmed'} · ****{profile?.account_number_last4 || '----'}</small><small>{profile?.bank_code ? `Bank code: ${profile.bank_code}` : 'Bank/mobile provider not set'}</small><small>{payout.manual_payout_reference || 'No transfer reference recorded'}</small></> : payout.paystack_transfer_reference ? <small>{payout.paystack_transfer_reference}</small> : 'Not initiated'}</td>
                  {isAdmin && <td>{canMarkManualPaid ? <div className="manual-payout-form"><small>Use the saved profile above to send the transfer.</small><input aria-label="Manual payout reference" placeholder="Transfer reference" value={draft.reference} onChange={(event) => updateDraft(payout.payout_id, 'reference', event.target.value)} /><input aria-label="Manual payout notes" placeholder="Notes (optional)" value={draft.notes} onChange={(event) => updateDraft(payout.payout_id, 'notes', event.target.value)} /><button className="btn-primary btn-sm" onClick={() => markManualPaid(payout)} disabled={savingPayoutId === payout.payout_id}>{savingPayoutId === payout.payout_id ? 'Recording…' : 'Send manually'}</button></div> : payout.payout_mode === 'MANUAL' ? 'Completed or not ready' : 'Automated'}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
        {visible.length === 0 && <div className="payout-empty">No payouts match the current filters.</div>}
      </div>
    </section>
  )
}
