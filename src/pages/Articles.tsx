import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react'
import ArticleCard from '../components/ArticleCard'
import { listPublishedArticles } from '../services/articleService'
import { ARTICLE_CATEGORIES, type ArticleCard as ArticleCardData } from '../types/articles'
import { applyArticlesListingSeo, resetArticleSeo } from '../utils/seo'
import './Articles.css'

export default function Articles() {
  const [articles, setArticles] = useState<ArticleCardData[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await listPublishedArticles({ search: submittedSearch, category, limit: 24 })
        if (!cancelled) {
          setArticles(data)
          applyArticlesListingSeo(data)
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Unable to load articles right now.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [submittedSearch, category])

  useEffect(() => () => resetArticleSeo(), [])

  const featuredArticle = useMemo(() => articles.find((article) => article.featured) || articles[0], [articles])
  const remainingArticles = useMemo(() => articles.filter((article) => article.id !== featuredArticle?.id), [articles, featuredArticle])

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setSubmittedSearch(search.trim())
  }

  return (
    <div className="articles-page">
      <section className="articles-hero">
        <div className="articles-hero-copy">
          <span className="articles-eyebrow"><Sparkles size={15} /> Reliable Articles</span>
          <h1>Useful ideas for better shopping and better business.</h1>
          <p>Explore practical Ghana-focused guides for customers, sellers, and growing businesses. Every article is written to help you make a confident next step.</p>
          <form className="articles-search" onSubmit={submitSearch} role="search">
            <Search size={19} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search articles, shopping guides, or seller tips" aria-label="Search articles" />
            <button type="submit">Search</button>
          </form>
        </div>
        <div className="articles-hero-aside" aria-label="Articles categories">
          <span>Explore by topic</span>
          <div className="articles-topic-list">
            {ARTICLE_CATEGORIES.slice(0, 5).map((topic) => <button type="button" key={topic} className={category === topic ? 'active' : ''} onClick={() => setCategory(category === topic ? '' : topic)}>{topic}</button>)}
          </div>
        </div>
      </section>

      <section className="articles-content" aria-live="polite">
        <div className="articles-section-heading">
          <div><span className="articles-eyebrow">From the Reliable marketplace</span><h2>{submittedSearch || category ? 'Search results' : 'Latest articles'}</h2></div>
          <label className="articles-category-filter"><SlidersHorizontal size={16} /><span className="sr-only">Filter by category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All topics</option>{ARTICLE_CATEGORIES.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</select></label>
        </div>

        {loading ? <div className="articles-loading"><span className="articles-spinner" /> Loading useful articles…</div> : error ? <div className="articles-empty" role="alert"><h2>Articles are taking a short break</h2><p>{error}</p><button type="button" onClick={() => setSubmittedSearch(`${submittedSearch}`)}>Try again</button></div> : articles.length === 0 ? <div className="articles-empty"><h2>No published articles yet</h2><p>We are preparing practical guides for customers and sellers. Please check back soon.</p></div> : (
          <>
            {featuredArticle && !submittedSearch && !category && <div className="articles-featured"><ArticleCard article={featuredArticle} featured /></div>}
            <div className="articles-grid">{(submittedSearch || category ? articles : remainingArticles).map((article) => <ArticleCard key={article.id} article={article} />)}</div>
          </>
        )}
      </section>
    </div>
  )
}
