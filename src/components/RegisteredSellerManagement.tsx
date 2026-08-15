import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { deleteBusiness, getAllBusinesses, reviewBusinessVerification, type Business } from '../services/businessService'
import { getAllProducts } from '../services/productService'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../types'
import './RegisteredSellerManagement.css'

const DEFAULT_MARKETPLACE_ID = '00000000-0000-0000-0000-000000000001'

type ReviewStatus = 'approved' | 'rejected' | 'suspended' | 'pending'

const statusLabel = (status?: string | null) => {
  if (!status || status === 'not_submitted') return 'Not Submitted'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export default function RegisteredSellerManagement() {
  const { role } = useAuth()
  const normalizedRole = String(role || '').toLowerCase().replace(/-/g, '_')
  const isAdmin = ['admin', 'general_admin'].includes(normalizedRole)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('approved')
  const [reviewReason, setReviewReason] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)

  const loadBusinesses = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [businessData, productData] = await Promise.all([
        getAllBusinesses(),
        getAllProducts(),
      ])
      setBusinesses(businessData)
      setProducts(productData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load registered sellers')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) loadBusinesses()
  }, [isAdmin, loadBusinesses])

  const filteredBusinesses = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return businesses
    return businesses.filter((business) => [
      business.name,
      business.business_name,
      business.slug,
      business.owner_id,
      business.contact_email,
      business.category,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term)))
  }, [businesses, search])

  const productCountByBusiness = useMemo(() => products.reduce<Record<string, number>>((counts, product) => {
    if (product.business_id) counts[product.business_id] = (counts[product.business_id] || 0) + 1
    return counts
  }, {}), [products])

  const openVerificationReview = (business: Business) => {
    setSelectedBusiness(business)
    setReviewStatus(business.verification_status === 'approved' ? 'approved' : 'pending')
    setReviewReason(business.rejection_reason || '')
    setError('')
  }

  const closeVerificationReview = () => {
    if (!isReviewing) {
      setSelectedBusiness(null)
      setReviewReason('')
    }
  }

  const handleVerificationSubmit = async () => {
    if (!selectedBusiness) return
    const needsReason = reviewStatus === 'rejected' || reviewStatus === 'suspended'
    if (needsReason && !reviewReason.trim()) {
      setError('A reason is required for rejected or suspended sellers.')
      return
    }

    setIsReviewing(true)
    setError('')
    try {
      await reviewBusinessVerification(selectedBusiness.id, reviewStatus, needsReason ? reviewReason.trim() : undefined)
      await loadBusinesses()
      setSelectedBusiness(null)
      setReviewReason('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update seller verification')
    } finally {
      setIsReviewing(false)
    }
  }

  const handleDelete = async (business: Business) => {
    if (business.id === DEFAULT_MARKETPLACE_ID) return
    const confirmed = window.confirm(
      `Delete “${business.name}”? This removes the store and its associated test products, orders, and records. This action cannot be undone.`
    )
    if (!confirmed) return

    setDeletingId(business.id)
    setError('')
    try {
      await deleteBusiness(business.id)
      setBusinesses((current) => current.filter((item) => item.id !== business.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete this store')
    } finally {
      setDeletingId(null)
    }
  }

  if (!isAdmin) {
    return <div className="seller-management-empty">Registered seller management is available to administrators only.</div>
  }

  return (
    <section className="registered-sellers-content">
      <div className="registered-sellers-header">
        <div>
          <p className="section-eyebrow">Marketplace administration</p>
          <h2>Registered Sellers &amp; Stores</h2>
          <p>Review seller accounts, open submitted documents, and approve or reject verification requests from this page.</p>
        </div>
        <div className="seller-management-count">{businesses.length} stores</div>
      </div>

      <div className="registered-sellers-toolbar">
        <input
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search store, seller ID, category, or email..."
          aria-label="Search registered sellers"
        />
        <button className="btn-secondary" onClick={loadBusinesses} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="verification-help-banner">
        <strong>Where to verify sellers:</strong> find a seller below, then use <strong>Open Review</strong> in the Verification column. Submitted registration and address documents open in a new tab.
      </div>

      {error && <div className="seller-management-error">{error}</div>}

      {isLoading ? (
        <div className="empty-state"><p>Loading registered sellers...</p></div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="empty-state">
          <h3>{businesses.length === 0 ? 'No registered seller stores' : 'No sellers match your search'}</h3>
          <p>{businesses.length === 0 ? 'New seller stores will appear here after onboarding.' : 'Try a different store name or search term.'}</p>
        </div>
      ) : (
        <div className="registered-sellers-table-wrap">
          <table className="registered-sellers-table">
            <thead>
              <tr>
                <th>Store</th>
                <th>Seller / owner</th>
                <th>Category</th>
                <th>Products</th>
                <th>Verification</th>
                <th>Storefront</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.map((business) => {
                const isDefault = business.id === DEFAULT_MARKETPLACE_ID
                const hasDocuments = Boolean(business.registration_document_url || business.proof_of_address_url)
                return (
                  <tr key={business.id}>
                    <td>
                      <strong>{business.name}</strong>
                      <span className="seller-slug">/{business.slug}</span>
                    </td>
                    <td>
                      <span className="seller-owner">{business.business_name || 'Registered seller'}</span>
                      <span className="seller-slug">{business.contact_email || business.owner_id || 'Owner ID unavailable'}</span>
                    </td>
                    <td>{business.category || 'Uncategorized'}</td>
                    <td>{productCountByBusiness[business.id] || 0}</td>
                    <td>
                      <div className="verification-status-cell">
                        <span className={`status-badge status-${business.verification_status || 'not_submitted'}`}>
                          {statusLabel(business.verification_status)}
                        </span>
                        {hasDocuments && <span className="documents-ready-label">Documents submitted</span>}
                        {(business.verification_status === 'pending' || business.verification_status === 'approved' || business.verification_status === 'rejected' || business.verification_status === 'suspended') && (
                          <button className="btn-sm btn-secondary review-button" onClick={() => openVerificationReview(business)}>
                            Open Review
                          </button>
                        )}
                        {business.verification_status === 'not_submitted' && !hasDocuments && (
                          <span className="seller-slug">Awaiting documents</span>
                        )}
                        <div className="commission-line">
                          Comm: {((business as any).commission_bps || 0) / 100}%
                          <button
                            className="btn-sm"
                            aria-label={`Edit commission for ${business.name}`}
                            onClick={() => {
                              const bps = prompt('Enter new commission in BPS (e.g. 500 for 5%):', (business as any).commission_bps)
                              if (bps) {
                                supabase!.from('businesses').update({ commission_bps: parseInt(bps, 10) }).eq('id', business.id).then(() => loadBusinesses())
                              }
                            }}
                          >
                            ✎
                          </button>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a href={`/store/${business.slug}`} target="_blank" rel="noreferrer">View store</a>
                    </td>
                    <td>
                      {isDefault ? (
                        <span className="protected-store">Protected marketplace</span>
                      ) : (
                        <button className="btn-delete" onClick={() => handleDelete(business)} disabled={deletingId === business.id}>
                          {deletingId === business.id ? 'Deleting...' : 'Delete store'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedBusiness && (
        <div className="verification-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeVerificationReview()
        }}>
          <div className="verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-modal-title">
            <div className="verification-modal-header">
              <div>
                <p className="section-eyebrow">Seller verification</p>
                <h3 id="verification-modal-title">{selectedBusiness.business_name || selectedBusiness.name}</h3>
                <p>{selectedBusiness.contact_email || 'Seller email unavailable'}</p>
              </div>
              <button className="modal-close-button" onClick={closeVerificationReview} aria-label="Close seller verification review">×</button>
            </div>

            <div className="verification-detail-grid">
              <div><span>Store</span><strong>{selectedBusiness.name}</strong></div>
              <div><span>Current status</span><strong>{statusLabel(selectedBusiness.verification_status)}</strong></div>
              <div><span>Registration number</span><strong>{selectedBusiness.registration_number || 'Not provided'}</strong></div>
              <div><span>Tax ID</span><strong>{selectedBusiness.tax_id || 'Not provided'}</strong></div>
              <div><span>Location</span><strong>{selectedBusiness.location || 'Not provided'}</strong></div>
              <div><span>Submitted</span><strong>{selectedBusiness.updated_at ? new Date(selectedBusiness.updated_at).toLocaleString() : 'Not available'}</strong></div>
            </div>

            <div className="verification-documents">
              <h4>Submitted documents</h4>
              <div className="document-links">
                {selectedBusiness.registration_document_url ? (
                  <a href={selectedBusiness.registration_document_url} target="_blank" rel="noreferrer" className="document-link">Open registration document</a>
                ) : <span className="document-missing">Registration document not submitted</span>}
                {selectedBusiness.proof_of_address_url ? (
                  <a href={selectedBusiness.proof_of_address_url} target="_blank" rel="noreferrer" className="document-link">Open proof of address</a>
                ) : <span className="document-missing">Proof of address not submitted</span>}
              </div>
            </div>

            {selectedBusiness.rejection_reason && (
              <div className="previous-review-note"><strong>Previous review note:</strong> {selectedBusiness.rejection_reason}</div>
            )}

            <div className="verification-decision-panel">
              <label htmlFor="verification-decision">Decision</label>
              <select id="verification-decision" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)}>
                <option value="approved">Approve / Verify seller</option>
                <option value="rejected">Reject submission</option>
                <option value="suspended">Suspend verification</option>
                <option value="pending">Return to pending</option>
              </select>
              {(reviewStatus === 'rejected' || reviewStatus === 'suspended') && (
                <label htmlFor="verification-reason">
                  Reason required
                  <textarea id="verification-reason" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} placeholder="Explain the review decision for the audit trail..." rows={3} />
                </label>
              )}
              <div className="verification-modal-actions">
                <button className="btn-secondary" onClick={closeVerificationReview} disabled={isReviewing}>Cancel</button>
                <button className="btn-primary" onClick={handleVerificationSubmit} disabled={isReviewing}>
                  {isReviewing ? 'Saving review...' : 'Save verification decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

