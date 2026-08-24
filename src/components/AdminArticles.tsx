import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Eye, ImagePlus, Link2, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  deleteArticle,
  getArticleForAdmin,
  getArticleRelationSelection,
  listArticleProductOptions,
  listArticleStoreOptions,
  listArticlesForAdmin,
  replaceArticleRelations,
  saveArticle,
  slugifyArticleTitle,
  uploadArticleImage,
} from '../services/articleService'
import { ARTICLE_CATEGORIES, type Article, type ArticleAdminSummary, type ArticleInput, type ArticleProductCard, type ArticleRelationSelection, type ArticleStoreCard } from '../types/articles'
import { estimateReadingTime, sanitizeArticleHtml } from '../utils/articleContent'
import './AdminArticles.css'

type ArticleForm = ArticleInput & { published_at: string }

const emptyForm: ArticleForm = {
  title: '',
  slug: '',
  excerpt: '',
  content_html: '<p>Start writing your article here…</p>',
  featured_image: '',
  category: ARTICLE_CATEGORIES[0],
  author_name: 'Reliable Editorial Team',
  status: 'draft',
  featured: false,
  reading_time_minutes: null,
  primary_keyword: '',
  secondary_topics: [],
  seo_title: '',
  seo_description: '',
  canonical_url: '',
  published_at: '',
}

const emptyRelations: ArticleRelationSelection = { product_ids: [], store_ids: [], related_article_ids: [] }

function inputDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16)
}

function insertAtSelection(textarea: HTMLTextAreaElement, replacement: string) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end) || 'your text'
  const nextValue = `${textarea.value.slice(0, start)}${replacement.replace('your text', selected)}${textarea.value.slice(end)}`
  return { nextValue, cursor: start + replacement.length }
}

export default function AdminArticles() {
  const { role } = useAuth()
  const canManage = ['admin', 'general_admin'].includes(String(role || '').toLowerCase().replace(/-/g, '_'))
  const [articles, setArticles] = useState<ArticleAdminSummary[]>([])
  const [products, setProducts] = useState<ArticleProductCard[]>([])
  const [stores, setStores] = useState<ArticleStoreCard[]>([])
  const [form, setForm] = useState<ArticleForm>(emptyForm)
  const [relations, setRelations] = useState<ArticleRelationSelection>(emptyRelations)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Article | null>(null)
  const [productSearch, setProductSearch] = useState('')
  const [storeSearch, setStoreSearch] = useState('')
  const [relatedSearch, setRelatedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const load = useCallback(async () => {
    if (!canManage) return
    setLoading(true)
    setError('')
    try {
      const [articleData, productData, storeData] = await Promise.all([listArticlesForAdmin(), listArticleProductOptions(), listArticleStoreOptions()])
      setArticles(articleData)
      setProducts(productData)
      setStores(storeData)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load article management.')
    } finally {
      setLoading(false)
    }
  }, [canManage])

  useEffect(() => { void load() }, [load])

  const setField = <K extends keyof ArticleForm>(field: K, value: ArticleForm[K]) => setForm((current) => ({ ...current, [field]: value }))

  const beginNew = () => {
    setEditingId(null)
    setForm(emptyForm)
    setRelations(emptyRelations)
    setNotice('')
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const beginEdit = async (summary: ArticleAdminSummary) => {
    setEditingId(summary.id)
    setNotice('')
    setError('')
    try {
      const [article, selection] = await Promise.all([getArticleForAdmin(summary.id), getArticleRelationSelection(summary.id)])
      setForm({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content_html: article.content_html,
        featured_image: article.featured_image || '',
        category: article.category,
        author_name: article.author_name,
        status: article.status,
        featured: article.featured,
        reading_time_minutes: article.reading_time_minutes,
        primary_keyword: article.primary_keyword || '',
        secondary_topics: article.secondary_topics || [],
        seo_title: article.seo_title || '',
        seo_description: article.seo_description || '',
        canonical_url: article.canonical_url || '',
        published_at: inputDate(article.published_at),
      })
      setRelations(selection)
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load article.') }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event: React.FormEvent, status: 'draft' | 'published' = form.status) => {
    event.preventDefault()
    if (!form.title.trim() || !form.excerpt.trim() || !form.content_html.trim()) {
      setError('Title, excerpt, and article content are required.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload: ArticleInput = {
        ...form,
        status,
        slug: slugifyArticleTitle(form.slug || form.title),
        reading_time_minutes: form.reading_time_minutes || estimateReadingTime(form.content_html),
        published_at: form.published_at ? new Date(form.published_at).toISOString() : null,
      }
      const saved = await saveArticle(payload, editingId)
      await replaceArticleRelations(saved.id, relations)
      setForm((current) => ({ ...current, slug: saved.slug, status: saved.status, published_at: inputDate(saved.published_at), reading_time_minutes: saved.reading_time_minutes }))
      setEditingId(saved.id)
      setNotice(status === 'published' ? 'Article published. It is now eligible for the public Articles page and sitemap.' : 'Draft saved. It remains private until you publish it.')
      await load()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save article.')
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (summary: ArticleAdminSummary) => {
    setSaving(true)
    setError('')
    try {
      const article = await getArticleForAdmin(summary.id)
      const nextStatus = article.status === 'published' ? 'draft' : 'published'
      const saved = await saveArticle({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        content_html: article.content_html,
        featured_image: article.featured_image,
        category: article.category,
        author_name: article.author_name,
        status: nextStatus,
        featured: article.featured,
        reading_time_minutes: article.reading_time_minutes,
        primary_keyword: article.primary_keyword,
        secondary_topics: article.secondary_topics,
        seo_title: article.seo_title,
        seo_description: article.seo_description,
        canonical_url: article.canonical_url,
        published_at: article.published_at,
      }, article.id)
      setNotice(saved.status === 'published' ? 'Article published.' : 'Article unpublished and removed from public discovery.')
      await load()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Unable to change publication status.')
    } finally {
      setSaving(false)
    }
  }

  const openPreview = async (summary: ArticleAdminSummary) => {
    setError('')
    try { setPreview(await getArticleForAdmin(summary.id)) }
    catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'Unable to load preview.') }
  }

  const remove = async (article: ArticleAdminSummary) => {
    if (!window.confirm(`Delete “${article.title}”? This removes the article and its recommendations.`)) return
    setSaving(true)
    try {
      await deleteArticle(article.id)
      if (editingId === article.id) beginNew()
      setNotice('Article deleted.')
      await load()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete article.')
    } finally { setSaving(false) }
  }

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    try { setField('featured_image', await uploadArticleImage(file)); setNotice('Featured image uploaded and compressed where possible.') }
    catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload the featured image.') }
    finally { setUploading(false) }
  }

  const insertFormat = (format: 'strong' | 'em' | 'h2' | 'h3' | 'blockquote' | 'ul' | 'ol' | 'link') => {
    const textarea = editorRef.current
    if (!textarea) return
    const selected = textarea.value.slice(textarea.selectionStart, textarea.selectionEnd) || 'your text'
    const templates: Record<string, string> = { strong: `<strong>${selected}</strong>`, em: `<em>${selected}</em>`, h2: `<h2>${selected}</h2>`, h3: `<h3>${selected}</h3>`, blockquote: `<blockquote>${selected}</blockquote>`, ul: `<ul><li>${selected}</li></ul>`, ol: `<ol><li>${selected}</li></ol>`, link: `<a href="https://">${selected}</a>` }
    const { nextValue } = insertAtSelection(textarea, templates[format])
    setField('content_html', nextValue)
    window.setTimeout(() => { textarea.focus() }, 0)
  }

  const filteredProducts = useMemo(() => products.filter((product) => `${product.name} ${product.id}`.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 40), [products, productSearch])
  const filteredStores = useMemo(() => stores.filter((store) => `${store.name} ${store.location || ''}`.toLowerCase().includes(storeSearch.toLowerCase())).slice(0, 40), [stores, storeSearch])
  const filteredRelated = useMemo(() => articles.filter((article) => article.id !== editingId && `${article.title} ${article.category}`.toLowerCase().includes(relatedSearch.toLowerCase())).slice(0, 40), [articles, relatedSearch, editingId])

  const toggleRelation = (key: keyof ArticleRelationSelection, id: string) => {
    setRelations((current) => {
      const values = current[key]
      const next = values.includes(id) ? values.filter((value) => value !== id) : [...values, id]
      const limit = key === 'product_ids' ? 8 : key === 'store_ids' ? 6 : 6
      return { ...current, [key]: next.slice(0, limit) }
    })
  }

  if (!canManage) return null

  return (
    <div className="admin-articles animate-fade-in">
      <div className="section-title-wrapper admin-articles-heading"><div><span className="admin-articles-eyebrow">Organic discovery</span><h2 className="section-title">Articles</h2><p>Write useful Ghana-focused content, connect it to the marketplace, and publish only after review.</p></div><button type="button" className="btn-primary" onClick={beginNew}><Plus size={16} /> New Article</button></div>
      {(error || notice) && <div className={error ? 'admin-articles-alert error' : 'admin-articles-alert success'} role="status">{error || notice}</div>}

      <div className="admin-articles-editor-layout">
        <section className="admin-articles-form-panel">
          <div className="admin-articles-panel-heading"><div><h3>{editingId ? 'Edit article' : 'Create article'}</h3><p>Save as a draft while writing. Nothing is public until you publish it.</p></div>{editingId && <button type="button" className="btn-secondary btn-sm" onClick={beginNew}><X size={15} /> New</button>}</div>
          <form onSubmit={(event) => void save(event, form.status)}>
            <div className="article-form-grid">
              <label className="article-form-wide">Title<input value={form.title} onChange={(event) => { setField('title', event.target.value); if (!editingId && !form.slug) setField('slug', slugifyArticleTitle(event.target.value)) }} placeholder="e.g. How to Shop Online Safely in Ghana" /></label>
              <label>Slug<input value={form.slug} onChange={(event) => setField('slug', slugifyArticleTitle(event.target.value))} placeholder="how-to-shop-online-safely-in-ghana" /><small>Public URL: /articles/{form.slug || 'your-article-slug'}</small></label>
              <label>Category<select value={form.category} onChange={(event) => setField('category', event.target.value)}>{ARTICLE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Author display name<input value={form.author_name} onChange={(event) => setField('author_name', event.target.value)} /></label>
              <label>Reading time (minutes)<input type="number" min="1" max="180" value={form.reading_time_minutes || ''} onChange={(event) => setField('reading_time_minutes', event.target.value ? Number(event.target.value) : null)} placeholder="Auto-estimate" /></label>
              <label>Publish date/time<input type="datetime-local" value={form.published_at} onChange={(event) => setField('published_at', event.target.value)} /><small>Used when publishing; leave blank for now.</small></label>
              <label className="article-form-wide">Excerpt / meta summary<textarea rows={3} value={form.excerpt} onChange={(event) => setField('excerpt', event.target.value)} placeholder="A useful one- or two-sentence summary for cards and search results." /></label>
              <label>Primary topic / keyword<input value={form.primary_keyword || ''} onChange={(event) => setField('primary_keyword', event.target.value)} placeholder="shop online safely in Ghana" /></label>
              <label>Secondary topics<input value={(form.secondary_topics || []).join(', ')} onChange={(event) => setField('secondary_topics', event.target.value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="buyer safety, delivery, payments" /></label>
              <label className="article-form-wide">SEO title<input value={form.seo_title || ''} onChange={(event) => setField('seo_title', event.target.value)} placeholder="Optional custom title; otherwise the article title is used." /></label>
              <label className="article-form-wide">SEO description<textarea rows={2} value={form.seo_description || ''} onChange={(event) => setField('seo_description', event.target.value)} placeholder="Optional custom description for Google and social sharing." /></label>
            </div>

            <div className="article-image-field"><div><strong>Featured image</strong><p>Use one clear image. It is compressed where possible and loaded lazily on cards.</p></div><div className="article-image-actions"><label className="btn-secondary"><ImagePlus size={15} /> {uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadImage} hidden disabled={uploading} /></label>{form.featured_image && <button type="button" className="btn-secondary" onClick={() => setField('featured_image', '')}>Remove image</button>}</div>{form.featured_image && <img src={form.featured_image} alt="Featured article preview" />}</div>

            <div className="article-editor"><div className="article-editor-heading"><div><strong>Article body</strong><p>Use semantic HTML formatting. The public page sanitizes content before rendering.</p></div><span>{estimateReadingTime(form.content_html)} min estimated</span></div><div className="article-editor-toolbar" role="toolbar" aria-label="Article formatting"><button type="button" onClick={() => insertFormat('h2')}>H2</button><button type="button" onClick={() => insertFormat('h3')}>H3</button><button type="button" onClick={() => insertFormat('strong')}><strong>B</strong></button><button type="button" onClick={() => insertFormat('em')}><em>I</em></button><button type="button" onClick={() => insertFormat('ul')}>List</button><button type="button" onClick={() => insertFormat('blockquote')}>Quote</button><button type="button" onClick={() => insertFormat('link')}><Link2 size={14} /></button></div><textarea ref={editorRef} value={form.content_html} onChange={(event) => setField('content_html', event.target.value)} rows={16} spellCheck placeholder="Write the article using paragraphs, headings, lists, quotes, and useful links…" /></div>

            <div className="article-selection-grid"><RelationPicker title="Recommended products" hint="Existing products only; unavailable products are handled gracefully on the public page." search={productSearch} setSearch={setProductSearch} items={filteredProducts} selected={relations.product_ids} onToggle={(id) => toggleRelation('product_ids', id)} render={(item) => `${item.name} · ${item.currency || 'GHS'} ${Number(item.price).toFixed(2)}`} /><RelationPicker title="Featured stores" hint="Link to existing seller stores; no store records are duplicated." search={storeSearch} setSearch={setStoreSearch} items={filteredStores} selected={relations.store_ids} onToggle={(id) => toggleRelation('store_ids', id)} render={(item) => `${item.name}${item.location ? ` · ${item.location}` : ''}`} /><RelationPicker title="Related articles" hint="Only lightweight article cards are loaded for readers." search={relatedSearch} setSearch={setRelatedSearch} items={filteredRelated} selected={relations.related_article_ids} onToggle={(id) => toggleRelation('related_article_ids', id)} render={(item) => `${item.title} · ${item.category}`} /></div>

            <div className="article-form-options"><label><input type="checkbox" checked={form.featured} onChange={(event) => setField('featured', event.target.checked)} /> Feature this article on the Articles page</label><label>Status<select value={form.status} onChange={(event) => setField('status', event.target.value as ArticleForm['status'])}><option value="draft">Draft</option><option value="published">Published</option></select></label></div>
            <div className="article-form-actions"><button type="submit" className="btn-secondary" disabled={saving || uploading}><Save size={16} /> {saving ? 'Saving…' : 'Save Draft'}</button><button type="button" className="btn-primary" disabled={saving || uploading} onClick={(event) => void save(event as unknown as React.FormEvent, 'published')}><Eye size={16} /> Publish</button></div>
          </form>
        </section>

        <section className="admin-articles-list-panel"><div className="admin-articles-panel-heading"><div><h3>Article library</h3><p>{articles.length} article{articles.length === 1 ? '' : 's'} · drafts stay private</p></div></div>{loading ? <p>Loading articles…</p> : articles.length === 0 ? <div className="admin-articles-empty">No articles yet. Start with a reviewed draft.</div> : <div className="admin-articles-table-wrap"><table className="admin-articles-table"><thead><tr><th>Title</th><th>Category</th><th>Author</th><th>Status</th><th>Published</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{articles.map((article) => <tr key={article.id}><td><strong>{article.title}</strong><small>/articles/{article.slug}</small></td><td>{article.category}</td><td>{article.author_name}</td><td><span className={`article-status ${article.status}`}>{article.status}</span>{article.featured && <small>Featured</small>}</td><td>{article.published_at ? new Date(article.published_at).toLocaleDateString() : '—'}</td><td>{new Date(article.updated_at).toLocaleDateString()}</td><td><div className="article-row-actions"><button type="button" title="Preview" onClick={() => void openPreview(article)}><Eye size={15} /></button><button type="button" title="Edit" onClick={() => void beginEdit(article)}><Pencil size={15} /></button><button type="button" title={article.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => void togglePublished(article)}>{article.status === 'published' ? 'Unpublish' : 'Publish'}</button><button type="button" title="Delete" onClick={() => void remove(article)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}</section>
      </div>

      {preview && <div className="article-preview-backdrop" role="dialog" aria-modal="true" aria-label="Article preview" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null) }}><div className="article-preview-modal"><div className="article-preview-heading"><div><span>{preview.category} · {preview.status}</span><h2>{preview.title}</h2></div><button type="button" onClick={() => setPreview(null)} aria-label="Close preview"><X size={20} /></button></div>{preview.featured_image && <img src={preview.featured_image} alt="" />}{preview.excerpt && <p className="article-preview-excerpt">{preview.excerpt}</p>}<div className="article-preview-body" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(preview.content_html) }} /></div></div>}
    </div>
  )
}

function RelationPicker<T extends { id: string }>({ title, hint, search, setSearch, items, selected, onToggle, render }: { title: string; hint: string; search: string; setSearch: (value: string) => void; items: T[]; selected: string[]; onToggle: (id: string) => void; render: (item: T) => string }) {
  return <div className="article-relation-picker"><div className="article-relation-heading"><div><strong>{title}</strong><small>{hint}</small></div><span>{selected.length} selected</span></div><label className="article-picker-search"><Search size={14} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${title.toLowerCase()}`} /></label><div className="article-picker-list">{items.length === 0 ? <small>Nothing found.</small> : items.map((item) => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span>{render(item)}</span></label>)}</div></div>
}
