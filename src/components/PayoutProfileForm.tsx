import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { configurePaystackRecipient } from '../services/paystackRecipientService'
import { listPaystackInstitutions, PaystackInstitution } from '../services/paystackBanksService'
import './IdentityVerificationForm.css' // Reuse verification styles

interface Props {
  sellerId: string
  storeId: string
  onSuccess?: () => void
}

export const PayoutProfileForm: React.FC<Props> = ({ sellerId, storeId, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [institutions, setInstitutions] = useState<PaystackInstitution[]>([])
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(false)
  // const [profile, setProfile] = useState<any>(null)
  
  const [formData, setFormData] = useState({
    recipient_type: 'bank_account',
    account_name: '',
    account_number: '',
    bank_code: '',
    swift_code: '',
    iban: '',
    currency: 'GHS',
    country_code: 'GH',
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error: _error } = await supabase!
          .from('seller_payout_profiles')
          .select('*')
          .eq('seller_id', sellerId)
          .eq('store_id', storeId)
          .single()

        if (data) {
          // setProfile(data)
          setFormData({
            recipient_type: data.recipient_type || 'bank_account',
            account_name: data.account_name || '',
            // Full account numbers are never read back from the database. The seller must re-enter the full number when changing or re-confirming a profile.
            account_number: '',
            bank_code: data.bank_code || '',
            swift_code: data.swift_code || '',
            iban: data.iban || '',
            currency: data.currency || 'GHS',
            country_code: data.country_code || 'GH',
          })
        }
      } catch (err) {
        console.error('Error loading payout profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [sellerId, storeId])

  useEffect(() => {
    let cancelled = false
    const loadInstitutions = async () => {
      if (formData.country_code !== 'GH' || formData.currency !== 'GHS' || formData.recipient_type === 'paypal') {
        setInstitutions([])
        return
      }
      setIsLoadingInstitutions(true)
      try {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession()
        if (sessionError || !sessionData.session?.access_token) throw new Error('Please sign in again before loading payout options.')
        const type = formData.recipient_type === 'mobile_money' ? 'mobile_money' : 'ghipss'
        const values = await listPaystackInstitutions(type, sessionData.session.access_token)
        if (!cancelled) setInstitutions(values)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Could not load Paystack payout options')
      } finally {
        if (!cancelled) setIsLoadingInstitutions(false)
      }
    }
    loadInstitutions()
    return () => { cancelled = true }
  }, [formData.country_code, formData.currency, formData.recipient_type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    try {
      if (!formData.account_number.trim()) throw new Error('For security, re-enter the full bank account number or mobile-money number before saving this payout profile.')

      const isPaystackAutomatedRoute = formData.country_code === 'GH' && formData.currency === 'GHS'
      if (isPaystackAutomatedRoute && !formData.bank_code.trim()) {
        throw new Error('Enter the Paystack bank code or mobile-money provider code before saving.')
      }
      let recipientData: { recipient_code: string; recipient_type: string; provider_onboarding_status: 'ACTIVE' } | null = null

      if (isPaystackAutomatedRoute) {
        const { data: sessionData, error: sessionError } = await supabase!.auth.getSession()
        if (sessionError || !sessionData.session?.access_token) throw new Error('Please sign in again before configuring automated payouts.')
        const recipientType = formData.recipient_type === 'mobile_money' ? 'mobile_money' : 'ghipss'
        const recipient = await configurePaystackRecipient({
          store_id: storeId,
          recipient_type: recipientType,
          account_name: formData.account_name,
          account_number: formData.account_number,
          bank_code: formData.bank_code,
          currency: formData.currency,
          country_code: formData.country_code,
        }, sessionData.session.access_token)
        recipientData = recipient.data
      }

      const payload = {
        seller_id: sellerId,
        store_id: storeId,
        recipient_type: recipientData?.recipient_type || formData.recipient_type,
        recipient_code: recipientData?.recipient_code || null,
        account_name: formData.account_name,
        account_number_last4: formData.account_number.slice(-4),
        bank_code: formData.bank_code,
        swift_code: formData.swift_code,
        iban: formData.iban,
        currency: formData.currency,
        country_code: formData.country_code,
        payment_provider: recipientData ? 'paystack' : null,
        provider_account_reference: recipientData?.recipient_code || null,
        provider_onboarding_status: recipientData ? 'ACTIVE' : 'NOT_STARTED',
        is_active: true,
        payout_profile_confirmed_at: new Date().toISOString(),
        payout_profile_confirmation_note: recipientData ? 'Paystack recipient verified and activated.' : 'Seller confirmed payout details for manual settlement.',
        updated_at: new Date().toISOString(),
      }

      const { error: saveError } = await supabase!.from('seller_payout_profiles').upsert(payload, { onConflict: 'seller_id,store_id' })
      if (saveError) throw saveError
      
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Error saving payout profile:', err)
      setError(err.message || 'Failed to save payout profile')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div>Loading payout settings...</div>

  return (
    <div className="verification-container">
      <div className="verification-header">
        <h3>Payout Method</h3>
          <p>Configure how you receive your earnings from Reliable. Ghana/GHS sellers can be verified for automated Paystack payouts; other countries remain eligible for manual settlement until an approved payout route is enabled.</p>
      </div>

      <form onSubmit={handleSubmit} className="verification-form">
        <div className="form-row">
          <div className="form-group">
            <label>Country</label>
            <select 
              value={formData.country_code} 
              onChange={e => setFormData({...formData, country_code: e.target.value})}
              disabled={isSaving}
            >
              <option value="GH">Ghana</option>
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Currency</label>
            <select 
              value={formData.currency} 
              onChange={e => setFormData({...formData, currency: e.target.value})}
              disabled={isSaving}
            >
              <option value="GHS">GHS</option>
              <option value="NGN">NGN</option>
              <option value="KES">KES</option>
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Payout Type</label>
          <select 
            value={formData.recipient_type} 
            onChange={e => setFormData({...formData, recipient_type: e.target.value})}
            disabled={isSaving}
          >
            <option value="bank_account">Bank Account</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>

        <div className="form-group">
          <label>Account Name</label>
          <input 
            type="text" 
            value={formData.account_name}
            onChange={e => setFormData({...formData, account_name: e.target.value})}
            placeholder="Name on account"
            required
            disabled={isSaving}
          />
        </div>

        {formData.country_code === 'GH' && formData.currency === 'GHS' && (
          <div className="form-group">
            <label>{formData.recipient_type === 'mobile_money' ? 'Mobile-money network' : 'Bank'}</label>
            <select
              value={formData.bank_code}
              onChange={e => setFormData({...formData, bank_code: e.target.value})}
              required
              disabled={isSaving || isLoadingInstitutions}
            >
              <option value="">{isLoadingInstitutions ? 'Loading Paystack options...' : 'Select an institution'}</option>
              {institutions.map(institution => (
                <option key={institution.code} value={institution.code}>{institution.name}</option>
              ))}
            </select>
            <small>Select the seller’s actual bank or mobile-money network. Reliable sends the verified Paystack code automatically.</small>
          </div>
        )}

        {formData.recipient_type === 'bank_account' && (
          <>
            <div className="form-group">
              <label>Account Number</label>
              <input 
                type="text" 
                value={formData.account_number}
                onChange={e => setFormData({...formData, account_number: e.target.value})}
                placeholder="Enter full account number (not the masked last four)"
                required
                disabled={isSaving}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>SWIFT/BIC Code</label>
                <input 
                  type="text" 
                  value={formData.swift_code}
                  onChange={e => setFormData({...formData, swift_code: e.target.value})}
                  placeholder="For international transfers"
                  disabled={isSaving}
                />
              </div>
              <div className="form-group">
                <label>IBAN (Optional)</label>
                <input 
                  type="text" 
                  value={formData.iban}
                  onChange={e => setFormData({...formData, iban: e.target.value})}
                  placeholder="For EU/International"
                  disabled={isSaving}
                />
              </div>
            </div>
          </>
        )}

        {formData.recipient_type === 'mobile_money' && (
          <div className="form-group">
            <label>Mobile Number</label>
            <input 
              type="tel" 
              value={formData.account_number}
              onChange={e => setFormData({...formData, account_number: e.target.value})}
              placeholder="e.g. 0538557781"
              required
              disabled={isSaving}
            />
          </div>
        )}

        {error && <div className="error-text">{error}</div>}

        <button type="submit" className="submit-verification-btn" disabled={isSaving}>
          {isSaving ? 'Saving Settings...' : 'Save Payout Method'}
        </button>
      </form>
    </div>
  )
}
