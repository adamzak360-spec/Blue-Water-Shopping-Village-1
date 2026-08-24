import { Link } from 'react-router-dom'
import { CalendarDays, Clock3 } from 'lucide-react'
import type { ArticleCard as ArticleCardData } from '../types/articles'
import { getOptimizedImageUrl } from '../utils/imageDelivery'
import { absoluteArticleImageUrl } from '../services/articleService'

type Props = {
  article: ArticleCardData
  featured?: boolean
}

export default function ArticleCard({ article, featured = false }: Props) {
  const image = article.featured_image ? getOptimizedImageUrl(article.featured_image, featured ? 1100 : 640) : ''
  const date = article.published_at ? new Date(article.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Draft'

  return (
    <Link className={`article-card ${featured ? 'article-card-featured' : ''}`} to={`/articles/${encodeURIComponent(article.slug)}`}>
      <div className="article-card-image-wrap">
        {image ? (
          <img src={absoluteArticleImageUrl(image)} alt="" className="article-card-image" loading={featured ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="article-card-image article-card-placeholder" aria-hidden="true"><span>RELIABLE</span></div>
        )}
        <span className="article-card-category">{article.category}</span>
      </div>
      <div className="article-card-body">
        <div className="article-card-meta">
          <span><CalendarDays size={14} /> {date}</span>
          {article.reading_time_minutes ? <span><Clock3 size={14} /> {article.reading_time_minutes} min read</span> : null}
        </div>
        <h3>{article.title}</h3>
        <p>{article.excerpt}</p>
        <div className="article-card-footer"><span>By {article.author_name}</span><span className="article-card-read">Read article →</span></div>
      </div>
    </Link>
  )
}
