import React, { useState, useEffect } from 'react'
import { verificationService } from '../services/verificationService'
import { supabase } from '../supabaseClient'
import { IdentityVerification, VerificationStatus } from '../types'
import './IdentityVerificationForm.css'

interface Props {
  userId: string
  currentStatus?: VerificationStatus
  onSuccess?: () => void
}

export const IdentityVerificationForm: React.FC<Props> = ({ userId, currentStatus, onSuccess }) => {
  const [verification, setVerification] = useState<IdentityVerification | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    id_type: 'national_id' as 'passport' | 'national_id' | 'driver_license',
    id_number: '',
  })
  const [files, setFiles] = useState<{
    front: File | null
    back: File | null
  }>({
    front: null,
    back: null,
  })

  useEffect(() => {
    const loadVerification = async () => {
      try {
        const data = await verificationService.getMyIdentityVerification()
        setVerification(data)
      } catch (err) {
        console.error('Error loading verification:', err)
      } finally {
        setIsLoading(false)
      }
    }
    loadVerification()
  }, [userId])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [side]: e.target.files![0] }))
    }
  }

  const uploadImage = async (file: File, side: 'front' | 'back') => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${side}-${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('identity-documents')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('identity-documents')
      .getPublicUrl(fileName)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files.front) {
      setError('Front image of ID is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const frontUrl = await uploadImage(files.front, 'front')
      let backUrl = ''
      if (files.back) {
        backUrl = await uploadImage(files.back, 'back')
      }

      await verificationService.submitIdentityVerification({
        id_type: formData.id_type,
        id_number: formData.id_number,
        id_image_front_url: frontUrl,
        id_image_back_url: backUrl || undefined,
      })

      const updated = await verificationService.getMyIdentityVerification()
      setVerification(updated)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error('Error submitting verification:', err)
      setError(err.message || 'Failed to submit verification')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="verification-loading">Loading verification status...</div>

  const status = verification?.status || currentStatus || 'not_submitted'

  if (status === 'approved') {
    return (
      <div className="verification-status approved">
        <span className="status-icon">✓</span>
        <div>
          <h3>Identity Verified</h3>
          <p>Your identity has been successfully verified.</p>
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
          <p>Your documents are currently being reviewed by our team.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="verification-container">
      <div className="verification-header">
        <h3>Identity Verification</h3>
        {status === 'rejected' && (
          <div className="rejection-notice">
            <strong>Rejected:</strong> {verification?.rejection_reason || 'Please re-submit clear documents.'}
          </div>
        )}
        <p>To ensure a secure marketplace, we require identity verification for all sellers and high-value buyers.</p>
      </div>

      <form onSubmit={handleSubmit} className="verification-form">
        <div className="form-group">
          <label>ID Type</label>
          <select 
            value={formData.id_type} 
            onChange={e => setFormData({...formData, id_type: e.target.value as any})}
            disabled={isSubmitting}
          >
            <option value="national_id">National ID / Ghana Card</option>
            <option value="passport">Passport</option>
            <option value="driver_license">Driver's License</option>
          </select>
        </div>

        <div className="form-group">
          <label>ID Number (Optional)</label>
          <input 
            type="text" 
            value={formData.id_number}
            onChange={e => setFormData({...formData, id_number: e.target.value})}
            placeholder="Enter ID number"
            disabled={isSubmitting}
          />
        </div>

        <div className="upload-row">
          <div className="upload-group">
            <label>Front Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => handleFileChange(e, 'front')}
              disabled={isSubmitting}
            />
            {files.front && <span className="file-name">{files.front.name}</span>}
          </div>

          <div className="upload-group">
            <label>Back Image (Optional)</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={e => handleFileChange(e, 'back')}
              disabled={isSubmitting}
            />
            {files.back && <span className="file-name">{files.back.name}</span>}
          </div>
        </div>

        {error && <div className="error-text">{error}</div>}

        <button type="submit" className="submit-verification-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Uploading Documents...' : 'Submit for Verification'}
        </button>
      </form>
    </div>
  )
}
