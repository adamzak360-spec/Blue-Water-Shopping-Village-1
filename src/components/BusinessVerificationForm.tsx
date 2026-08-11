import React, { useState } from 'react'
import { submitBusinessVerification, type Business } from '../services/businessService'
import { supabase } from '../supabaseClient'
import './IdentityVerificationForm.css' // Reuse verification styles

interface Props {
  business: Business
  onSuccess?: () => void
}

export const BusinessVerificationForm: React.FC<Props> = ({ business, onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    registration_number: business.registration_number || '',
    tax_id: business.tax_id || '',
  })
  const [files, setFiles] = useState<{
    registration: File | null
    address: File | null
  }>({
    registration: null,
    address: null,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'registration' | 'address') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
    }
  }

  const uploadImage = async (file: File, type: 'registration' | 'address') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${business.owner_id}/${business.id}/${type}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('business-documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('business-documents')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files.registration && !business.registration_document_url) {
      setError('Business registration document is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      let registrationUrl = business.registration_document_url || ''
      if (files.registration) {
        registrationUrl = await uploadImage(files.registration, 'registration')
      }

      let addressUrl = business.proof_of_address_url || ''
      if (files.address) {
        addressUrl = await uploadImage(files.address, 'address')
      }

      await submitBusinessVerification(business.id, {
        registration_number: formData.registration_number,
        tax_id: formData.tax_id,
        registration_document_url: registrationUrl,
        proof_of_address_url: addressUrl || undefined,
      })

      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Error submitting business verification:', err)
      setError(err.message || 'Failed to submit verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  const status = business.verification_status || 'not_submitted'

  if (status === 'approved') {
    return (
      <div className="verification-status approved">
        <span className="status-icon">✓</span>
        <div>
          <h3>Business Verified</h3>
          <p>Your business has been successfully verified.</p>
        </div>
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div className="verification-status pending">
        <span className="status-icon">⏳</span>
        <div>
          <h3>Verification Pending</h3>
          <p>Your business documents are currently being reviewed.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="verification-container">
      <div className="verification-header">
        <h3>Business Verification</h3>
        {status === 'rejected' && (
          <div className="rejection-notice">
            <strong>Rejected:</strong> {business.rejection_reason || 'Please re-submit valid business documents.'}
          </div>
        )}
        <p>Submit your business documents to unlock higher payout limits and the "Verified Store" badge.</p>
      </div>

      <form onSubmit={handleSubmit} className="verification-form">
        <div className="form-group">
          <label>Business Registration Number</label>
          <input 
            type="text" 
            value={formData.registration_number}
            onChange={e => setFormData({...formData, registration_number: e.target.value})}
            placeholder="e.g. BN12345678"
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>Tax ID / TIN</label>
          <input 
            type="text" 
            value={formData.tax_id}
            onChange={e => setFormData({...formData, tax_id: e.target.value})}
            placeholder="e.g. T123456789"
            disabled={isSubmitting}
          />
        </div>

        <div className="upload-row">
          <div className="upload-group">
            <label>Registration Document (PDF/Image)</label>
            <input 
              type="file" 
              onChange={e => handleFileChange(e, 'registration')}
              disabled={isSubmitting}
            />
            {files.registration && <span className="file-name">{files.registration.name}</span>}
          </div>

          <div className="upload-group">
            <label>Proof of Address (Utility Bill)</label>
            <input 
              type="file" 
              onChange={e => handleFileChange(e, 'address')}
              disabled={isSubmitting}
            />
            {files.address && <span className="file-name">{files.address.name}</span>}
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <button type="submit" className="submit-verification-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Uploading Documents...' : 'Submit Business for Verification'}
        </button>
      </form>
    </div>
  )
}
