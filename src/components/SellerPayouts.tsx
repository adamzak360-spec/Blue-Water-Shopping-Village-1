import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
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

type WalletAccumulation = {
  seller_id: string
  store_id: string
  currency: string
  payout_method: string | null
  available_minor: number
  applicable_fee_minor: number | null
  minimum_transfer_minor: number | null
  required_wallet_minor: number | null
  shortfall_minor: number | null
  threshold_reached: boolean
  expected_transfer_minor: number
  expected_provider_debit_minor: number | null
  eligible_earning_count: number
  last_earning_at: string | null
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

type OrderDelivery = {
  user_id: string | null
  status: string
  customer_delivery_confirmation: string | null
  customer_delivery_confirmation_at: string | null
  admin_delivery_confirmation: boolean
  admin_delivery_confirmation_at: string | null
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
  payout_fee_minor: number | null
  seller_amount_sent_minor: number | null
  provider_total_debit_minor: number | null
  minimum_transfer_minor: number | null
  payout_method: string | null
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
  order?: OrderDelivery
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
  RETRY_REQUIRED: 'Retry Required',
  PENDING_FUNDS: 'Pending Paystack Funds',
  ON_HOLD: 'Payout On Hold',
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
  const [walletAccumulations, setWalletAccumulations] = useState<Record<string, WalletAccumulation>>({})
  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([])
  const [manualDrafts, setManualDrafts] = useState<Record<string, ManualDraft>>({})
  const [savingPayoutId, setSavingPayoutId] = useState<string | null>(null)
  const [orderDetails, setOrderDetails] = useState<Record<string, OrderDelivery>>({})
  const { session } = useAuth()

  const payoutMethodLabel = (method: string | null) => method === 'mobile_money' ? 'Mobile Money' : method === 'bank' ? 'Bank' : 'Not verified'

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
      const orderIds = [...new Set(loadedPayouts.map((payout) => payout.order_id))]
      if (orderIds.length > 0) {
        const { data: orderData, error: orderError } = await supabase.from('orders').select('id, user_id, status, customer_delivery_confirmation, customer_delivery_confirmation_at, admin_delivery_confirmation, admin_delivery_confirmation_at').in('id', orderIds)
        if (!orderError) setOrderDetails(Object.fromEntries((orderData || []).map((order: any) => [order.id, order])))
      }
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

        if (isAdmin) {
          try {
            const accumulationEntries = await Promise.all(loadedPayouts
              .filter((payout) => payout.seller_id && payout.store_id)
              .filter((payout, index, all) => index === all.findIndex((candidate) => candidate.seller_id === payout.seller_id && candidate.store_id === payout.store_id))
              .map(async (payout) => {
                const { data: accumulationData, error: accumulationError } = await supabase!.rpc('get_seller_wallet_accumulation', {
                  p_seller_id: payout.seller_id,
                  p_store_id: payout.store_id,
                })
                if (accumulationError) throw accumulationError
                const accumulation = (accumulationData?.[0] || null) as WalletAccumulation | null
                return accumulation ? [`${accumulation.seller_id}:${accumulation.store_id}`, accumulation] as const : null
              }))
            setWalletAccumulations(Object.fromEntries(accumulationEntries.filter(Boolean) as Array<readonly [string, WalletAccumulation]>))
          } catch (accumulationError: any) {
            setWalletAccumulations({})
            setError(accumulationError.message || 'Seller wallet threshold status could not be loaded.')
          }
        }
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

  const performAdminAction = async (payout: Payout, action: 'hold' | 'release' | 'retry') => {
    if (!supabase || !isAdmin) return
    const reason = action === 'hold' ? window.prompt('Reason for placing this payout on hold:') : null
    if (action === 'hold' && !reason?.trim()) return
    setSavingPayoutId(payout.payout_id)
    setError('')
    setSuccess('')
    try {
      const rpcName = action === 'hold' ? 'admin_hold_payout' : action === 'release' ? 'admin_release_held_payout' : 'admin_retry_failed_payout'
      const { error: rpcError } = await supabase.rpc(rpcName, { p_payout_id: payout.payout_id, p_reason: reason?.trim() || null })
      if (rpcError) throw rpcError
      setSuccess(`Payout ${action} action completed for order #${payout.order_id.slice(0, 8)}.`)
      await load()
    } catch (rpcError: any) {
      setError(rpcError.message || `Could not ${action} payout.`)
    } finally {
      setSavingPayoutId(null)
    }
  }

  const executePaystackPayout = async (payout: Payout) => {
    if (!isAdmin || !session?.access_token) {
      setError('Administrator authentication is required to execute a Paystack payout.')
      return
    }
    const expectedDebit = formatCurrency((payout.provider_total_debit_minor || 0) / 100)
    const expectedSent = formatCurrency((payout.seller_amount_sent_minor || 0) / 100)
    const confirmation = window.prompt(`This sends ${expectedSent} to the verified seller recipient and debits ${expectedDebit} from Paystack including the fee. Type EXECUTE to continue.`)
    if (confirmation !== 'EXECUTE') return

    setSavingPayoutId(payout.payout_id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/payouts?action=admin-process-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ payout_id: payout.payout_id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Paystack payout execution failed.')
      setSuccess(`Paystack execution completed: ${result.processed || 0} paid, ${result.pending || 0} pending.`)
      await load()
    } catch (executionError: any) {
      setError(executionError.message || 'Paystack payout execution failed.')
    } finally {
      setSavingPayoutId(null)
    }
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
          <p>{isAdmin ? 'Automated Paystack payouts remain disabled until controlled verification is approved. After delivery confirmation, unsupported seller countries appear here for manual sending.' : 'Customer confirmation makes a payout eligible. A verified transfer or administrator-recorded manual payout is required before it is marked paid.'}</p>
        </div>
        <button className="btn-secondary btn-sm" onClick={load}>Refresh</button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}

      {isAdmin && Object.values(walletAccumulations).length > 0 && (
        <section className="wallet-threshold-section">
          <div className="wallet-heading">
            <div>
              <h3>Seller Wallet Thresholds</h3>
              <p>Accumulated seller earnings are held until the transfer amount reaches the provider minimum.</p>
            </div>
          </div>
          <div className="wallet-threshold-grid">
            {Object.values(walletAccumulations).map((accumulation) => (
              <div className="wallet-threshold-card" key={`${accumulation.seller_id}:${accumulation.store_id}`}>
                <div className="wallet-threshold-card-header"><strong>Seller {accumulation.seller_id.slice(0, 8)}</strong><span className={`payout-badge ${accumulation.threshold_reached ? 'payout-paid' : 'payout-queued'}`}>{accumulation.threshold_reached ? 'Ready for payout' : 'Accumulating'}</span></div>
                <small>Store: {accumulation.store_id.slice(0, 8)} · {payoutMethodLabel(accumulation.payout_method)}</small>
                <div className="wallet-threshold-values"><span>Available<strong>{formatCurrency(accumulation.available_minor / 100)}</strong></span><span>Required<strong>{accumulation.required_wallet_minor == null ? 'Not configured' : formatCurrency(accumulation.required_wallet_minor / 100)}</strong></span><span>Shortfall<strong>{accumulation.shortfall_minor == null ? 'Not configured' : formatCurrency(accumulation.shortfall_minor / 100)}</strong></span><span>Expected sent<strong>{formatCurrency(accumulation.expected_transfer_minor / 100)}</strong></span></div>
              </div>
            ))}
          </div>
        </section>
      )}

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
        {['HELD', 'ELIGIBLE', 'QUEUED', 'PROCESSING', 'PAID', 'FAILED', 'RETRY_REQUIRED', 'PENDING_FUNDS', 'ON_HOLD', 'REVERSED'].map((status) => (
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
          <thead><tr><th>Created / paid</th><th>Order / customer</th><th>Seller / Store</th><th>Delivery confirmation</th><th>Eligibility</th><th>Gross</th><th>Commission</th><th>Seller allocation</th><th>Fee / actual sent</th><th>Provider debit</th><th>Mode / transfer status</th><th>Transfer / manual record</th>{isAdmin && <th>Admin action</th>}</tr></thead>
          <tbody>
            {visible.map((payout) => {
              const profile = payoutProfiles[`${payout.seller_id}:${payout.store_id}`]
              const order = orderDetails[payout.order_id]
              const accumulation = walletAccumulations[`${payout.seller_id}:${payout.store_id}`]
              const draft = manualDrafts[payout.payout_id] || { reference: '', notes: '' }
              const canMarkManualPaid = isAdmin && payout.payout_mode === 'MANUAL' && ['ELIGIBLE', 'QUEUED', 'FAILED'].includes(payout.payout_status) && Boolean(profile?.is_active && profile.payout_profile_confirmed_at)
              const canHold = isAdmin && ['HELD', 'ELIGIBLE', 'FAILED', 'RETRY_REQUIRED', 'PENDING_FUNDS', 'ON_HOLD'].includes(payout.payout_status)
              const canRelease = isAdmin && ['HELD', 'ON_HOLD'].includes(payout.payout_status)
              const canRetry = isAdmin && ['FAILED', 'RETRY_REQUIRED', 'PENDING_FUNDS'].includes(payout.payout_status)
              const canExecutePaystack = isAdmin && accumulation?.threshold_reached === true && payout.payout_mode !== 'MANUAL' && payout.payout_status === 'QUEUED' && payout.eligibility_status === 'ELIGIBLE' && Boolean(profile?.is_active && profile.payout_profile_confirmed_at && payout.payout_fee_minor != null && payout.seller_amount_sent_minor != null && payout.provider_total_debit_minor != null)
              return (
                <tr key={payout.payout_id}>
                  <td><small>{new Date(payout.created_at).toLocaleString()}</small><small>{payout.paid_at ? `Paid ${new Date(payout.paid_at).toLocaleString()}` : 'Not paid'}</small></td>
                  <td><strong>#{payout.order_id.slice(0, 8)}</strong><small>{payout.payout_id.slice(0, 8)}</small><small>Customer: {order?.user_id || payout.customer_id || 'Not available'}</small></td>
                  <td><small>{payout.seller_id}</small><small>{payout.store_id}</small></td>
                  <td><small>Customer: {order?.customer_delivery_confirmation || 'PENDING'}</small><small>{order?.customer_delivery_confirmation_at ? new Date(order.customer_delivery_confirmation_at).toLocaleString() : 'Not confirmed'}</small><small>Admin: {order?.admin_delivery_confirmation ? 'CONFIRMED' : 'Not confirmed'}</small></td>
                  <td><span className="payout-badge">{payout.eligibility_status}</span></td>
                  <td>{formatCurrency(payout.gross_amount_minor / 100)}</td>
                  <td>{formatCurrency(payout.commission_amount_minor / 100)}</td>
                  <td><strong>{formatCurrency(payout.seller_payout_amount_minor / 100)}</strong><small>{payoutMethodLabel(payout.payout_method)}</small></td>
                  <td><small>Fee: {payout.payout_fee_minor == null ? 'Not verified' : formatCurrency(payout.payout_fee_minor / 100)}</small><small>Actual sent: {payout.seller_amount_sent_minor == null ? 'Not calculated' : formatCurrency(payout.seller_amount_sent_minor / 100)}</small></td>
                  <td>{payout.provider_total_debit_minor == null ? 'Not calculated' : formatCurrency(payout.provider_total_debit_minor / 100)}</td>
                  <td><span className="payout-badge">{payout.payout_mode === 'MANUAL' ? 'Manual payout' : 'Automated Paystack'}</span><span className={`payout-badge payout-${payout.payout_status.toLowerCase()}`}>{statusLabel[payout.payout_status] || payout.payout_status}</span>{payout.failure_reason && <small>{payout.failure_reason}</small>}</td>
                  <td>{payout.payout_mode === 'MANUAL' ? <><small>{profile ? `${profile.country_code || 'Country not set'} · ${profile.currency || payout.currency} · ${profile.recipient_type}` : 'Payout profile not found'}</small><small>{profile?.account_name || 'Account name not confirmed'} · ****{profile?.account_number_last4 || '----'}</small><small>{profile?.bank_code ? `Bank code: ${profile.bank_code}` : 'Bank/mobile provider not set'}</small><small>{payout.manual_payout_reference || 'No transfer reference recorded'}</small></> : payout.paystack_transfer_reference ? <small>{payout.paystack_transfer_reference}</small> : 'Not initiated'}</td>
                  {isAdmin && <td><div className="payout-admin-actions">{canHold && <button className="btn-secondary btn-sm" onClick={() => performAdminAction(payout, 'hold')} disabled={savingPayoutId === payout.payout_id}>Hold</button>}{canRelease && <button className="btn-secondary btn-sm" onClick={() => performAdminAction(payout, 'release')} disabled={savingPayoutId === payout.payout_id}>Release</button>}{canRetry && <button className="btn-secondary btn-sm" onClick={() => performAdminAction(payout, 'retry')} disabled={savingPayoutId === payout.payout_id}>Retry</button>}{canExecutePaystack && <button className="btn-primary btn-sm" onClick={() => executePaystackPayout(payout)} disabled={savingPayoutId === payout.payout_id}>{savingPayoutId === payout.payout_id ? 'Executing…' : 'Execute Paystack payout'}</button>}{isAdmin && payout.payout_mode !== 'MANUAL' && accumulation && !accumulation.threshold_reached && <small className="wallet-threshold-note">Accumulating: {formatCurrency((accumulation.shortfall_minor || 0) / 100)} more needed before the minimum transfer.</small>}{canMarkManualPaid ? <div className="manual-payout-form"><small>Use the saved profile above to send the transfer.</small><input aria-label="Manual payout reference" placeholder="Transfer reference" value={draft.reference} onChange={(event) => updateDraft(payout.payout_id, 'reference', event.target.value)} /><input aria-label="Manual payout notes" placeholder="Notes (optional)" value={draft.notes} onChange={(event) => updateDraft(payout.payout_id, 'notes', event.target.value)} /><button className="btn-primary btn-sm" onClick={() => markManualPaid(payout)} disabled={savingPayoutId === payout.payout_id}>{savingPayoutId === payout.payout_id ? 'Recording…' : 'Record manual payout'}</button></div> : payout.payout_mode === 'MANUAL' ? 'Completed or not ready' : 'Monitoring only'}</div></td>}
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
