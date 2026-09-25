import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getBoundedPublicCatalogProducts } from '../services/productService'
import { getMarketplaceProductCountVisibility } from '../services/businessService'
import { createRotationSeed, rotateWithSeed } from '../utils/shuffle'
import { getActivePromotedProducts, type ActivePromotedProduct } from '../services/promotionService'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard'
import { applyCatalogSeo } from '../utils/seo'
import AdSlot from '../components/AdSlot'
import { ArrowRight, Search, X } from 'lucide-react'
import { useI18n } from '../i18n'
import './Products.css'

interface SearchSuggestion {
  type: 'product' | 'category' | 'recent'
  value: string
  label: string
}

export default function Products() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchMatches, setSearchMatches] = useState<Product[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const [showProductCount, setShowProductCount] = useState(false)
  const [activePromotions, setActivePromotions] = useState<ActivePromotedProduct[]>([])
  const rotationSeedRef = useRef(createRotationSeed())

  // Keep direct links such as /products?category=Oil&search=shea synchronized
  // with the existing local filter state when navigating from the homepage or sharing a URL.
  useEffect(() => {
    const urlSearch = searchParams.get('search') || ''
    const urlCategory = searchParams.get('category') || ''
    setSearchTerm(previous => previous === urlSearch ? previous : urlSearch)
    setSelectedCategory(previous => previous === urlCategory ? previous : urlCategory)
  }, [searchParams])
  const [hasMoreProducts, setHasMoreProducts] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const PAGE_SIZE = 18

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Track scroll for sticky search
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 100)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadProductPage = async (offset: number, append: boolean) => {
    const data = await getBoundedPublicCatalogProducts('PRODUCTS', { limit: PAGE_SIZE, offset })
    const nextProducts = rotateWithSeed(data, rotationSeedRef.current + offset)
    setProducts(previous => append ? [...previous, ...nextProducts] : nextProducts)
    setHasMoreProducts(data.length === PAGE_SIZE)
  }

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [_, shouldShowProductCount, activePromotionIds] = await Promise.all([
          loadProductPage(0, false),
          getMarketplaceProductCountVisibility(),
          getActivePromotedProducts(),
        ])
        setShowProductCount(shouldShowProductCount)
        setActivePromotions(activePromotionIds)
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadingProducts'))
      } finally {
        setIsLoading(false)
      }
    }
    void loadProducts()
  }, [])

  const loadMoreProducts = async () => {
    if (isLoadingMore || !hasMoreProducts || searchTerm.trim()) return
    setIsLoadingMore(true)
    try {
      await loadProductPage(products.length, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadingMoreProducts'))
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Catalog page SEO: rich titles + ItemList schema so the whole listing ranks for shopping queries
  useEffect(() => {
    const visible = filteredProducts.length > 0 ? filteredProducts : products.filter(p => p.status === 'active')
    let title = 'Products'
    let description = `Browse ${products.length} products from trusted seller stores on Reliable Premium Marketplace — pay securely online by card, Mobile Money, or bank transfer.`
    if (selectedCategory) {
      title = `${selectedCategory} Products`
      description = `Shop ${selectedCategory.toLowerCase()} products from trusted seller stores on Reliable Premium Marketplace. Browse prices, specifications, and sellers, and pay securely online by card, Mobile Money, or bank transfer.`
    }
    if (searchTerm.trim()) {
      title = `Search results for "${searchTerm.trim()}"`
    }
    applyCatalogSeo(title, description, visible)
    return () => {
      document.head.querySelector<HTMLScriptElement>('script#reliable-catalog-jsonld')?.remove()
    }
  }, [filteredProducts, products, selectedCategory, searchTerm])

  useEffect(() => {
    const trimmedSearch = searchTerm.trim()
    if (trimmedSearch.length < 2) {
      setSearchMatches(null)
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      void getBoundedPublicCatalogProducts('PRODUCTS', {
        searchTerm: trimmedSearch,
        category: selectedCategory || undefined,
        limit: PAGE_SIZE,
      })
        .then(data => { if (!cancelled) setSearchMatches(rotateWithSeed(data.filter(p => p.status === 'active'), rotationSeedRef.current)) })
        .catch(() => { if (!cancelled) setSearchMatches([]) })
    }, 320)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [searchTerm, selectedCategory])

  useEffect(() => {
    let result = searchTerm.trim() && searchMatches ? [...searchMatches] : (showAll ? [...products] : products.filter(p => p.status === 'active'))

    if (searchTerm && !searchMatches) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.description.toLowerCase().includes(lower) ||
        p.category.toLowerCase().includes(lower)
      )
    }

    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory)
    }

    setFilteredProducts(result)
  }, [searchTerm, selectedCategory, showAll, products, searchMatches])

  const categories = [...new Set(products.map(p => p.category))].sort()
  const activeCount = products.filter(p => p.status === 'active').length
  const promotedProductIdSet = new Set(activePromotions.map(promotion => promotion.productId))
  const promotionIdByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion.promotionId]))
  const promotedProducts = filteredProducts.filter(product => promotedProductIdSet.has(product.id))
  const organicFilteredProducts = filteredProducts.filter(product => !promotedProductIdSet.has(product.id))

  // Keep compact-grid products out of the latest-products flow so their shorter
  // cards do not create uneven empty space beside full-height cards.
  const compactGridProducts = organicFilteredProducts.filter(product => product.card_style === 'compact-grid')
  const regularOrganicProducts = organicFilteredProducts.filter(product => product.card_style !== 'compact-grid')

  // Keep every regular organic product unique while alternating four vertical pairs
  // (8 cards) with three pairs in a horizontal scroller (6 cards).
  const productSections: Array<{ type: 'grid' | 'horizontal' | 'compact'; products: Product[] }> = []
  for (let start = 0; start < regularOrganicProducts.length;) {
    const verticalProducts = regularOrganicProducts.slice(start, start + 8)
    if (verticalProducts.length > 0) {
      productSections.push({ type: 'grid', products: verticalProducts })
      start += verticalProducts.length
    }

    const horizontalProducts = regularOrganicProducts.slice(start, start + 6)
    if (horizontalProducts.length > 0) {
      productSections.push({ type: 'horizontal', products: horizontalProducts })
      start += horizontalProducts.length
    }
  }

  if (compactGridProducts.length > 0) {
    productSections.push({ type: 'compact', products: compactGridProducts })
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term && !recentSearches.includes(term)) {
      const updated = [term, ...recentSearches.slice(0, 4)]
      setRecentSearches(updated)
      localStorage.setItem('recentSearches', JSON.stringify(updated))
    }
    setShowSuggestions(false)
  }

  const getSearchSuggestions = (): SearchSuggestion[] => {
    const suggestions: SearchSuggestion[] = []
    
    if (!searchTerm) {
      // Show recent searches and popular categories
      recentSearches.forEach(search => {
        suggestions.push({ type: 'recent', value: search, label: search })
      })
      categories.slice(0, 3).forEach(cat => {
        suggestions.push({ type: 'category', value: cat, label: `Browse ${cat}` })
      })
    } else {
      const lower = searchTerm.toLowerCase()
      // Show matching products
      const matchingProducts = products.filter(p =>
        p.name.toLowerCase().includes(lower)
      ).slice(0, 3)
      matchingProducts.forEach(p => {
        suggestions.push({ type: 'product', value: p.name, label: p.name })
      })
      // Show matching categories
      const matchingCategories = categories.filter(c =>
        c.toLowerCase().includes(lower)
      ).slice(0, 2)
      matchingCategories.forEach(cat => {
        suggestions.push({ type: 'category', value: cat, label: `Browse ${cat}` })
      })
    }
    
    return suggestions
  }

  const suggestions = getSearchSuggestions()

  const clearSearch = () => {
    setSearchTerm('')
    setShowSuggestions(false)
  }

  if (isLoading) {
    return (
      <div className="products-page">
        <div className="loading-container">
          <div className="spinner" />
                <p>{t('loadingProducts')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="products-page">
      {/* Sticky Search Bar */}
      <div className={`sticky-search-bar ${isSticky ? 'visible' : ''}`}>
        <div className="container">
          <div className="sticky-search-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder={t('searchProducts')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSuggestions(true)
              }}
              onFocus={() => setShowSuggestions(true)}
            />
            {searchTerm && (
              <button onClick={clearSearch} className="clear-btn">
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container">
        <div className="section-container">
          {/* Page Header */}
          <div className="products-header">
            <h1>{t('ourProducts')}</h1>
            {showProductCount && (
              <p className="products-subtitle">
                {activeCount} {t('productsAvailable')}
                {showAll && ` (${t('showingProducts')} ${products.length} ${t('productsTotal')}, ${t('includingInactive')})`}
              </p>
            )}
          </div>

        {/* Search & Filter */}
        <div className="products-controls">
          <div className="search-filter-wrapper">
            <div className="search-container">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder={t('searchProductsBrands')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="search-input"
              />
              {searchTerm && (
                <button onClick={clearSearch} className="clear-btn">
                  <X size={18} />
                </button>
              )}

              {/* Search Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className={`suggestion-item suggestion-${suggestion.type}`}
                      onClick={() => {
                        if (suggestion.type === 'category') {
                          setSelectedCategory(suggestion.value)
                          setSearchTerm('')
                        } else {
                          handleSearch(suggestion.value)
                        }
                      }}
                    >
                      <span className="suggestion-icon">
                        {suggestion.type === 'recent' && '🕐'}
                        {suggestion.type === 'category' && '📁'}
                        {suggestion.type === 'product' && '📦'}
                      </span>
                      <span className="suggestion-text">{suggestion.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-filter"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <label className="show-all-toggle">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            <span>{t('includeInactive')}</span>
          </label>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-state">
            <h3>{t('somethingWentWrong')}</h3>
            <p>{error}</p>
          </div>
        )}

        <AdSlot placement="PRODUCT_LIST_TOP" />

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h3>{products.length === 0 ? t('noProductsYet') : t('noProductsMatch')}</h3>
            <p>
              {products.length === 0
                ? t('stockingUp')
                : t('adjustSearch')}
            </p>
          </div>
        ) : (
          <>
            {showProductCount && (
              <div className="results-info">
                {t('showingProducts')} {filteredProducts.length} {t('productsAvailable')}
              </div>
            )}
            {promotedProducts.length > 0 && (
              <section className="products-sponsored-section" aria-labelledby="sponsored-products-title">
                <div className="products-sponsored-header">
                  <div>
                    <span className="products-sponsored-kicker">{t('paidPlacement')}</span>
                    <h2 id="sponsored-products-title">{t('sponsoredProducts')}</h2>
                  </div>
                  <p>{t('promotedBySellers')}</p>
                </div>
                <div className="products-grid sponsored-products-grid">
                  {promotedProducts.map(product => (
                    <ProductCard key={product.id} product={product} isSponsored promotionId={promotionIdByProductId.get(product.id)} />
                  ))}
                </div>
              </section>
            )}
            <div className="products-browse-sections">
              {productSections.map((section, sectionIndex) => (
                section.type === 'grid' ? (
                  <div className="products-grid" key={`grid-${sectionIndex}`}>
                    {section.products.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : section.type === 'compact' ? (
                  <section className="products-compact-section" key={`compact-${sectionIndex}`} aria-labelledby="compact-products-title">
                    <div className="products-compact-header">
                      <div>
                        <span className="products-compact-kicker">{t('specialOffers')}</span>
                        <h2 id="compact-products-title">{t('moreDeals')}</h2>
                      </div>
                      <p>{t('clearSavings')}</p>
                    </div>
                    <div className="products-grid compact-products-grid">
                      {section.products.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="products-horizontal-section" key={`horizontal-${sectionIndex}`} aria-label={t('moreProducts')}>
                    <div className="products-horizontal-header">
                      <span className="products-horizontal-label">{t('moreProducts')}</span>
                      <span className="products-horizontal-hint" role="note">
                        <span className="products-horizontal-hint-label">{t('swipeForMore')}</span>
                        <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="products-horizontal-scroll" tabIndex={0} aria-label={`${t('moreProducts')}. ${t('swipeForMore')}`}>
                      {section.products.map(product => (
                        <div className="products-horizontal-item" key={product.id}>
                          <ProductCard product={product} />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              ))}
            </div>
            {!searchTerm.trim() && hasMoreProducts && (
              <div className="products-load-more" style={{ display: 'flex', justifyContent: 'center', margin: '28px 0 8px' }}>
                <button type="button" className="view-details-btn" onClick={() => void loadMoreProducts()} disabled={isLoadingMore}>
                  {isLoadingMore ? t('loadingMoreProducts') : t('loadMoreProducts')}
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
