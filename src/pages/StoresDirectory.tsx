import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Search, Store as StoreIcon } from 'lucide-react'
import { getPublicBusinesses, type Business } from '../services/businessService'
import './StoresDirectory.css'

export default function StoresDirectory() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')
    getPublicBusinesses(searchTerm, category)
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
  }, [searchTerm, category])

  const categories = useMemo(() => {
    return Array.from(new Set(businesses.map((business) => business.category).filter(Boolean) as string[])).sort()
  }, [businesses])

  return (
    <section className="stores-page">
      <div className="stores-hero">
        <span className="stores-eyebrow">Reliable Marketplace</span>
        <h1>Discover stores you can trust</h1>
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
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
      </div>

      <div className="stores-content">
        {isLoading && <div className="stores-state">Loading stores...</div>}
        {!isLoading && error && <div className="stores-state stores-error">{error}</div>}
        {!isLoading && !error && businesses.length === 0 && (
          <div className="stores-state">
            <StoreIcon size={40} aria-hidden="true" />
            <h2>No stores found</h2>
            <p>Try a different search or check back soon for new sellers.</p>
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
