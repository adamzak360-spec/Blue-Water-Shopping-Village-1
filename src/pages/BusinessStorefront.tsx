import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { getBoundedPublicCatalogProducts } from '../services/productService'
import type { Product } from '../types'
import type { Business } from '../services/businessService'
import ProductCard from '../components/ProductCard'
import VerifiedSellerBadge from '../components/VerifiedSellerBadge'
import BusinessSocialLinks from '../components/BusinessSocialLinks'
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
      try {
        const storeProducts = await getBoundedPublicCatalogProducts('PRODUCTS', {
          businessId: biz.id,
          limit: 18,
        })
        setProducts(storeProducts.filter(product => product.status === 'active'))
      } catch (productsError) {
        console.error('Error loading store products:', productsError)
        setProducts([])
      }

      setIsLoading(false)
    }

    loadStorefront()
  }, [slug])

  useEffect(() => {
    if (!business || !slug) return

    const origin = window.location.origin
    const storeName = business.business_name || business.name
    const storeUrl = `${origin}/store/${encodeURIComponent(slug)}`
    const description = (business.description || `Browse ${storeName}'s products on Reliable Premium Marketplace.`)
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 155)
    const setMeta = (selector: string, attributes: Record<string, string>, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) {
        element = document.createElement('meta')
        Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value))
        document.head.appendChild(element)
      }
      element.content = content
    }

    document.title = `${storeName} | Reliable Premium Marketplace`
    setMeta('meta[name="description"]', { name: 'description' }, description)
    setMeta('meta[property="og:title"]', { property: 'og:title' }, document.title)
    setMeta('meta[property="og:description"]', { property: 'og:description' }, description)
    setMeta('meta[property="og:url"]', { property: 'og:url' }, storeUrl)
    setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, 'Reliable Premium Marketplace')
    if (business.logo_url || business.banner_url) {
      setMeta('meta[property="og:image"]', { property: 'og:image' }, business.logo_url || business.banner_url || '')
    }

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = storeUrl

    let jsonLd = document.head.querySelector<HTMLScriptElement>('#reliable-store-jsonld')
    if (!jsonLd) {
      jsonLd = document.createElement('script')
      jsonLd.id = 'reliable-store-jsonld'
      jsonLd.type = 'application/ld+json'
      document.head.appendChild(jsonLd)
    }
    jsonLd.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: storeName,
      description,
      url: storeUrl,
      ...(business.logo_url ? { image: business.logo_url } : {}),
      ...(business.location ? { address: { '@type': 'PostalAddress', addressLocality: business.location, addressCountry: 'GH' } } : {}),
    })

    return () => {
      document.title = 'Reliable Premium Marketplace'
      const defaultDescription = 'Reliable Premium Marketplace — quality products from trusted stores, delivered to your doorstep.'
      setMeta('meta[name="description"]', { name: 'description' }, defaultDescription)
      setMeta('meta[property="og:title"]', { property: 'og:title' }, 'Reliable Premium Marketplace')
      setMeta('meta[property="og:description"]', { property: 'og:description' }, defaultDescription)
      setMeta('meta[property="og:url"]', { property: 'og:url' }, origin)
      setMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
      canonical!.href = origin
      jsonLd?.remove()
    }
  }, [business, slug])

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
      <div className="public-store-hero" style={{ 
        backgroundImage: business.banner_url ? `linear-gradient(rgba(3, 18, 48, 0.72), rgba(3, 18, 48, 0.72)), url(${business.banner_url})` : 'linear-gradient(135deg, #0b2d5c, #1769aa)', 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white', 
        padding: '80px 20px', 
        textAlign: 'center' 
      }}>
        <div className="container public-store-hero-content">
          {business.logo_url && (
            <img 
              src={business.logo_url} 
              alt={business.name} 
              style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '20px', border: '4px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }} 
            />
          )}
          <h1 className="public-store-name" style={{ fontSize: '3rem', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {business.name}
            <VerifiedSellerBadge status={business.verification_status} />
          </h1>
          <p style={{ fontSize: '1.25rem', maxWidth: '700px', margin: '0 auto 24px', opacity: 0.95, fontWeight: 500 }}>
            {business.description || 'Welcome to our official online store! Browse our premium products below.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
            {business.show_contact_email_public && business.contact_email && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📧 {business.contact_email}</p>
            )}
            {business.show_contact_phone_public && business.contact_phone && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📞 {business.contact_phone}</p>
            )}
            {business.show_location_public && business.location && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>📍 {business.location}</p>
            )}
            {business.show_delivery_info_public && (business.service_area || business.delivery_instructions || business.pickup_instructions) && (
              <p style={{ fontSize: '1rem', opacity: 0.9 }}>🚚 {business.service_area || 'Delivery and pickup available'} </p>
            )}
          </div>
          <BusinessSocialLinks
            facebook_url={business.facebook_url}
            tiktok_url={business.tiktok_url}
            instagram_url={business.instagram_url}
            x_url={business.x_url}
            whatsapp_url={business.whatsapp_url}
            youtube_url={business.youtube_url}
          />
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
