import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Product } from '../types'
import type { Business } from '../services/businessService'
import { useCart } from '../context/CartContext'
import './Home.css'

export default function BusinessStorefront() {
  const { slug } = useParams<{ slug: string }>()
  const [business, setBusiness] = useState<Business | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const { addToCart } = useCart()

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

      // Fetch products for this business
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', biz.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (!prodError && prodData) {
        setProducts(prodData as Product[])
      }

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
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: 'white', padding: '60px 20px', textAlign: 'center' }}>
        <div className="container">
          {business.logo_url && (
            <img 
              src={business.logo_url} 
              alt={business.name} 
              style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '20px', border: '3px solid white' }} 
            />
          )}
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>{business.name}</h1>
          <p style={{ fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 20px', opacity: 0.9 }}>
            {business.description || 'Welcome to our official online store! Browse our premium products below.'}
          </p>
          {business.contact_email && (
            <p style={{ fontSize: '0.95rem', opacity: 0.8 }}>Contact: {business.contact_email} {business.contact_phone ? `| ${business.contact_phone}` : ''}</p>
          )}
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
          <div className="products-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {products.map(product => (
              <div key={product.id} className="product-card" style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: '200px', background: '#f3f4f6', position: 'relative' }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>No image</div>
                  )}
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <span style={{ fontSize: '0.85rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 600, marginBottom: '6px' }}>{product.category}</span>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 600 }}>{product.name}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#4b5563', marginBottom: '16px', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111827' }}>GH₵{product.price.toFixed(2)}</span>
                    <button 
                      onClick={() => addToCart(product)}
                      className="btn btn-primary"
                      style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
