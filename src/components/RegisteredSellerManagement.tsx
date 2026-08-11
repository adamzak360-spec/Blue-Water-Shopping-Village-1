import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteBusiness, getAllBusinesses, type Business } from '../services/businessService'
import { getAllProducts } from '../services/productService'
import { useAuth } from '../context/AuthContext'
import type { Product } from '../types'
import './RegisteredSellerManagement.css'

const DEFAULT_MARKETPLACE_ID = '00000000-0000-0000-0000-000000000001'

export default function RegisteredSellerManagement() {
  const { role } = useAuth()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

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
    if (role === 'admin') loadBusinesses()
  }, [role, loadBusinesses])

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

  if (role !== 'admin') {
    return <div className="seller-management-empty">Registered seller management is available to administrators only.</div>
  }

  return (
    <section className="registered-sellers-content">
      <div className="registered-sellers-header">
        <div>
          <p className="section-eyebrow">Marketplace administration</p>
          <h2>Registered Sellers &amp; Stores</h2>
          <p>Review every registered seller store and remove test or abandoned stores without opening Supabase.</p>
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
                          {business.verification_status || 'Not Submitted'}
                        </span>
                        {business.verification_status === 'pending' && (
                          <button 
                            className="btn-sm btn-secondary" 
                            style={{ marginTop: '4px' }}
                            onClick={() => {
                              const reason = prompt('Approve or Reject? Type "approve" or enter rejection reason:');
                              if (reason === 'approve') {
                                supabase!.from('businesses').update({ 
                                  verification_status: 'approved', 
                                  verified_at: new Date().toISOString() 
                                }).eq('id', business.id).then(() => loadBusinesses());
                              } else if (reason) {
                                supabase!.from('businesses').update({ 
                                  verification_status: 'rejected', 
                                  rejection_reason: reason 
                                }).eq('id', business.id).then(() => loadBusinesses());
                              }
                            }}
                          >
                            Review
                          </button>
                        )}
                        <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
                          Comm: {(business as any).commission_bps / 100}% 
                          <button 
                            className="btn-sm" 
                            style={{ marginLeft: '4px', padding: '2px 4px' }}
                            onClick={() => {
                              const bps = prompt('Enter new commission in BPS (e.g. 500 for 5%):', (business as any).commission_bps);
                              if (bps) {
                                supabase!.from('businesses').update({ 
                                  commission_bps: parseInt(bps) 
                                }).eq('id', business.id).then(() => loadBusinesses());
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
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(business)}
                          disabled={deletingId === business.id}
                        >
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
    </section>
  )
}
