import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CalendarDays, Check, Clock3, Copy, ExternalLink, MessageCircle, Share2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import { absoluteArticleImageUrl, getPublishedArticleBySlug } from '../services/articleService'
import type { ArticleDetail } from '../types/articles'
import { getOptimizedImageUrl } from '../utils/imageDelivery'
import { applyArticleSeo, resetArticleSeo } from '../utils/seo'
import { sanitizeArticleHtml } from '../utils/articleContent'
import './Articles.css'

function slugifyHeading(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'section'
}

function prepareArticleBody(html: string) {
  const clean = sanitizeArticleHtml(html)
  if (typeof DOMParser === 'undefined') return { html: clean, headings: [] as { id: string; text: string; level: number }[] }
  const document = new DOMParser().parseFromString(clean, 'text/html')
  const usedIds = new Set<string>()
  const headings: { id: string; text: string; level: number }[] = []
  document.querySelectorAll('h2, h3').forEach((heading) => {
    const text = heading.textContent?.trim() || 'Section'
    const base = slugifyHeading(text)
    let id = base
    let suffix = 2
    while (usedIds.has(id)) id = `${base}-${suffix++}`
    usedIds.add(id)
    heading.id = id
    headings.push({ id, text, level: heading.tagName === 'H3' ? 3 : 2 })
  })
  return { html: document.body.innerHTML, headings }
}

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ArticleDetails() {
  const { slug = '' } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    getPublishedArticleBySlug(slug)
      .then((result) => {
        if (cancelled) return
        setArticle(result)
        if (result) applyArticleSeo(result)
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load this article.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; resetArticleSeo() }
  }, [slug])

  const preparedBody = useMemo(() => prepareArticleBody(article?.content_html || ''), [article?.content_html])
  const articleUrl = typeof window !== 'undefined' ? window.location.href : ''

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(articleUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch { setCopied(false) }
  }

  const shareArticle = async () => {
    if (navigator.share && article) {
      try { await navigator.share({ title: article.title, text: article.excerpt, url: articleUrl }); return } catch { /* user cancelled */ }
    }
    await copyLink()
  }

  if (loading) return <div className="article-state"><span className="articles-spinner" /> Loading article…</div>
  if (error) return <div className="article-state" role="alert"><h1>We could not load this article</h1><p>{error}</p><Link to="/articles" className="article-button">Back to Articles</Link></div>
  if (!article) return <div className="article-state"><h1>Article not found</h1><p>This article may have been unpublished or the link may be outdated.</p><Link to="/articles" className="article-button">Browse Articles</Link></div>

  return (
    <div className="article-detail-page">
      <div className="article-detail-topbar"><Link to="/articles" className="article-back-link"><ArrowLeft size={17} /> All Articles</Link><button type="button" className="article-share-button" onClick={() => void shareArticle()}><Share2 size={17} /> {copied ? 'Link copied' : 'Share article'}</button></div>
      <article className="article-detail">
        <header className="article-detail-header">
          <span className="articles-eyebrow">{article.category}</span>
          <h1>{article.title}</h1>
          <p className="article-detail-excerpt">{article.excerpt}</p>
          <div className="article-detail-meta"><span><CalendarDays size={16} /> {formatDate(article.published_at)}</span><span><Clock3 size={16} /> {article.reading_time_minutes || 1} min read</span><span>By {article.author_name}</span></div>
        </header>
        {article.featured_image ? <img className="article-featured-image" src={absoluteArticleImageUrl(getOptimizedImageUrl(article.featured_image, 1200))} alt={article.title} loading="eager" decoding="async" /> : <div className="article-featured-placeholder">RELIABLE ARTICLES</div>}
        <div className="article-detail-layout">
          <aside className="article-toc" aria-label="Table of contents">
            <div className="article-toc-heading">In this article</div>
            {preparedBody.headings.length ? <nav>{preparedBody.headings.map((heading) => <a key={heading.id} className={heading.level === 3 ? 'article-toc-sub' : ''} href={`#${heading.id}`}>{heading.text}</a>)}</nav> : <p>Read the full guide below.</p>}
          </aside>
          <div className="article-body-column">
            <div className="article-body" dangerouslySetInnerHTML={{ __html: preparedBody.html }} />
            <div className="article-inline-share"><strong>Found this useful?</strong><span>Share it with someone who may need it.</span><div><button type="button" onClick={() => void shareArticle()}><Share2 size={16} /> Share</button><a href={`https://wa.me/?text=${encodeURIComponent(`${article.title} ${articleUrl}`)}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a><button type="button" onClick={() => void copyLink()}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}</button></div></div>
          </div>
        </div>

        {article.related_products.length > 0 && <section className="article-recommendation-section"><div className="article-related-heading"><div><span className="articles-eyebrow">Explore the marketplace</span><h2>Recommended products</h2></div><Link to="/products">Browse products <ExternalLink size={15} /></Link></div><div className="article-product-grid">{article.related_products.map((product) => { const available = product.status === 'active' && Number(product.stock_quantity ?? 1) > 0; return <div className={`article-product-card ${available ? '' : 'unavailable'}`} key={product.id}>{product.image_url ? <img src={absoluteArticleImageUrl(getOptimizedImageUrl(product.image_url, 420))} alt="" loading="lazy" decoding="async" /> : <div className="article-product-placeholder">Reliable</div>}<div><h3>{product.name}</h3><p>{product.currency || 'GHS'} {Number(product.price).toFixed(2)}</p>{available ? <Link to={`/product/${product.id}`}>View product</Link> : <span>Currently unavailable</span>}</div></div> })}</div></section>}

        {article.related_stores.length > 0 && <section className="article-recommendation-section"><div className="article-related-heading"><div><span className="articles-eyebrow">Meet the sellers</span><h2>Discover stores</h2></div><Link to="/stores">View all stores <ExternalLink size={15} /></Link></div><div className="article-store-grid">{article.related_stores.map((store) => <Link className="article-store-card" to={`/store/${encodeURIComponent(store.slug)}`} key={store.id}>{store.logo_url ? <img src={absoluteArticleImageUrl(store.logo_url)} alt="" loading="lazy" /> : <div className="article-store-initial">{store.name.slice(0, 1).toUpperCase()}</div>}<div><h3>{store.name}</h3>{store.location && <p>{store.location}</p>}<span>View store →</span></div></Link>)}</div></section>}

        <section className="article-cta"><div><span className="articles-eyebrow">Ready for your next find?</span><h2>Discover products and trusted stores on Reliable.</h2></div><div className="article-cta-actions"><Link to="/products">Browse Products</Link><Link to="/stores">Discover Stores</Link><Link to="/seller/register">Start Selling</Link></div></section>
      </article>
      {article.related_articles.length > 0 && <section className="article-related-articles"><div className="article-related-heading"><div><span className="articles-eyebrow">Keep reading</span><h2>Related articles</h2></div></div><div className="articles-grid">{article.related_articles.map((related) => <ArticleCard key={related.id} article={related} />)}</div></section>}
    </div>
  )
}
