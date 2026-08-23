import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search, Store as StoreIcon } from 'lucide-react'
import { getPublicBusinesses, type Business } from '../services/businessService'
import './StoresDirectory.css'

export default function StoresDirectory() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getPublicBusinesses('', '')
      .then((data) => {
        if (!cancelled) {
          setAvailableCategories(Array.from(new Set(data.map((business) => business.category).filter(Boolean) as string[])).sort())
          setBusinesses(data)
        }
      })
      .catch(() => {
        if (!cancelled) setError('We could not load store categories right now. Please try again.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const hasDiscoveryFilter = searchTerm.trim().length > 0 || category !== ''

  useEffect(() => {
    let cancelled = false
    setError('')

    if (!hasDiscoveryFilter) {
      setIsLoading(false)
      return () => {
        cancelled = true
      }
    }

    setIsLoading(true)
    getPublicBusinesses(searchTerm.trim(), category)
      .then((data) => {
        if (!cancelled) setBusinesses(data)
      })
      .catch(() => {
        if (!cancelled) setError('We could not load stores right now. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [searchTerm, category, hasDiscoveryFilter])

  return (
    <section className="stores-page" aria-labelledby="stores-page-title">
      <div className="stores-hero">
        <span className="stores-eyebrow">Reliable Marketplace</span>
        <h1 id="stores-page-title">Discover stores you can trust</h1>
        <p>Explore independent sellers, browse their collections, and shop directly from each store.</p>
        <div className="stores-search-row">
          <label className="stores-search" htmlFor="store-search">
            <Search size={19} aria-hidden="true" />
            <input
              id="store-search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search stores, categories, or locations"
            />
          </label>
          <select aria-label="Filter stores by category" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">All categories</option>
            {availableCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="stores-content">
        {isLoading && <div className="stores-state">Loading stores...</div>}
        {!isLoading && error && <div className="stores-state stores-error">{error}</div>}
        {!isLoading && !error && businesses.length === 0 && (
          <div className="stores-state">
            <StoreIcon size={40} aria-hidden="true" />
            <h2>{hasDiscoveryFilter ? 'No stores found' : 'Find a store to get started'}</h2>
            <p>{hasDiscoveryFilter ? 'Try a different search or category.' : 'Search by store name, category, or location, or choose a category above.'}</p>
          </div>
        )}
        {!isLoading && !error && businesses.length > 0 && (
          <div className="stores-grid">
            {businesses.map((business) => (
              <article className="store-card" key={business.id}>
                <div className="store-card-media">
                  {business.banner_url ? <img src={business.banner_url} alt="" /> : <StoreIcon size={42} aria-hidden="true" />}
                </div>
                <div className="store-card-body">
                  <div className="store-card-title-row">
                    <h2>{business.business_name || business.name}</h2>
                    {business.category && <span>{business.category}</span>}
                  </div>
                  <p>{business.description || 'Browse this seller’s products on Reliable.'}</p>
                  {business.location && <div className="store-location"><MapPin size={15} aria-hidden="true" />{business.location}</div>}
                  <Link className="store-card-link" to={`/store/${encodeURIComponent(business.slug)}`}>Visit store</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
