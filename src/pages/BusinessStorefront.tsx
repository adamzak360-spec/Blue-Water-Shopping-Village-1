import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Product } from '../types'
import type { Business } from '../services/businessService'
import ProductCard from '../components/ProductCard'
import VerifiedSellerBadge from '../components/VerifiedSellerBadge'
import './Home.css'
import './BusinessStorefront.css'

export default function BusinessStorefront() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadStorefront() {
      if (!slug) {
        setError('Store not found')
        setIsLoading(false)
        return
      }

      if (!isSupabaseConfigured || !supabase) {
        setError('Supabase not configured')
        setIsLoading(false)
        return
      }

      // Fetch business by slug
      const { data: bizData, error: bizError } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (bizError || !bizData) {
        setError('Store not found')
        setIsLoading(false)
        return
      }

      const biz = bizData as Business
      setBusiness(biz)

      // Only show active products assigned to this business. An empty store must
      // remain empty instead of falling back to the marketplace catalog.
      const { data: prodData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', biz.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (productsError) {
        console.error('Error loading store products:', productsError)
      }

      setProducts((prodData || []) as Product[])

      setIsLoading(false)
    }

    loadStorefront()
  }, [slug])

  if (isLoading) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Loading store...</h2>
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h2>Store Not Found</h2>
        <p>The store you are looking for does not exist or has been removed.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
          Back to Marketplace
        </Link>
      </div>
    )
  }

  return (
    <div className="home-page">
      {/* Store Banner / Header */}
      <div style={{ 
        backgroundImage: business.banner_url ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${business.banner_url})` : 'linear-gradient(135deg, #1e3a8a, #3b82f6)', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white', 
        padding: '80px 20px', 
        textAlign: 'center' 
      }}>
        <div className="container">
          {business.logo_url && (
            <img 
              src={business.logo_url} 
              alt={business.name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '20px', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} 
            />
          )}
          <h1 style={{ fontSize: '3rem', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {business.name}
            <VerifiedSellerBadge status={business.verification_status} />
          </h1>
          <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 24px', opacity: 0.95, fontWeight: 500 }}>
            {business.description || 'Welcome to our official online store! Browse our premium products below.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {business.contact_email && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📧 {business.contact_email}</p>
            )}
            {business.contact_phone && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📞 {business.contact_phone}</p>
            )}
            {business.location && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📍 {business.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Products Catalog */}
      <div className="container" style={{ padding: '40px 20px' }}>
        <h2 style={{ marginBottom: '30px', fontSize: '1.8rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '10px' }}>
          Store Products ({products.length})
        </h2>

        {products.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>No active products available in this store right now.</p>
        ) : (
          <div className="public-store-products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
