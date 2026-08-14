import { useState, useEffect } from 'react'
import { getAllProducts } from '../services/productService'
import { getMarketplaceProductCountVisibility } from '../services/businessService'
import { shuffle } from '../utils/shuffle'
import { getActivePromotedProducts, type ActivePromotedProduct } from '../services/promotionService'
import type { Product } from '../types'
import ProductCard from '../components/ProductCard'
import AdSlot from '../components/AdSlot'
import { ArrowRight, Search, X } from 'lucide-react'
import './Products.css'

interface SearchSuggestion {
  type: 'product' | 'category' | 'recent'
  value: string
  label: string
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
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

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const [data, shouldShowProductCount, activePromotionIds] = await Promise.all([
          getAllProducts(),
          getMarketplaceProductCountVisibility(),
          getActivePromotedProducts(),
        ])
        setShowProductCount(shouldShowProductCount)
        setActivePromotions(activePromotionIds)
        const rotatedProducts = shuffle(data)
        setProducts(rotatedProducts)
        setFilteredProducts(rotatedProducts.filter(p => p.status === 'active'))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    let result = showAll ? [...products] : products.filter(p => p.status === 'active')

    if (searchTerm) {
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
  }, [searchTerm, selectedCategory, showAll, products])

  const categories = [...new Set(products.map(p => p.category))].sort()
  const activeCount = products.filter(p => p.status === 'active').length
  const promotedProductIdSet = new Set(activePromotions.map(promotion => promotion.productId))
  const promotionIdByProductId = new Map(activePromotions.map(promotion => [promotion.productId, promotion.promotionId]))
  const promotedProducts = filteredProducts.filter(product => promotedProductIdSet.has(product.id))
  const organicFilteredProducts = filteredProducts.filter(product => !promotedProductIdSet.has(product.id))

  // Keep every organic product unique while alternating four vertical pairs (8 cards)
  // with three pairs in a horizontal scroller (6 cards).
  const productSections: Array<{ type: 'grid' | 'horizontal'; products: Product[] }> = []
  for (let start = 0; start < organicFilteredProducts.length;) {
      const verticalProducts = organicFilteredProducts.slice(start, start + 8)
    if (verticalProducts.length > 0) {
      productSections.push({ type: 'grid', products: verticalProducts })
      start += verticalProducts.length
    }

      const horizontalProducts = organicFilteredProducts.slice(start, start + 6)
    if (horizontalProducts.length > 0) {
      productSections.push({ type: 'horizontal', products: horizontalProducts })
      start += horizontalProducts.length
    }
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
          <p>Loading products...</p>
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
              placeholder="Search products..."
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
            <h1>Our Products</h1>
            {showProductCount && (
              <p className="products-subtitle">
                {activeCount} product{activeCount !== 1 ? 's' : ''} available
                {showAll && ` (showing ${products.length} total, including inactive)`}
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
                placeholder="Search products, brands, categories..."
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
              <option value="">All Categories</option>
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
            <span>Include inactive</span>
          </label>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-state">
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
          </div>
        )}

        <AdSlot placement="PRODUCT_LIST_TOP" />

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <h3>{products.length === 0 ? 'No products yet' : 'No products match your search'}</h3>
            <p>
              {products.length === 0
                ? 'We\'re stocking up! Check back soon for our latest products.'
                : 'Try adjusting your search terms or filters.'}
            </p>
          </div>
        ) : (
          <>
            {showProductCount && (
              <div className="results-info">
                Showing {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
              </div>
            )}
            {promotedProducts.length > 0 && (
              <section className="products-sponsored-section" aria-labelledby="sponsored-products-title">
                <div className="products-sponsored-header">
                  <div>
                    <span className="products-sponsored-kicker">Paid placement</span>
                    <h2 id="sponsored-products-title">Sponsored Products</h2>
                  </div>
                  <p>Promoted by participating sellers</p>
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
                ) : (
                  <section className="products-horizontal-section" key={`horizontal-${sectionIndex}`} aria-label="More products">
                    <div className="products-horizontal-header">
                      <span className="products-horizontal-label">More products</span>
                      <span className="products-horizontal-hint" role="note">
                        <span className="products-horizontal-hint-label">Swipe left to see more</span>
                        <ArrowRight size={18} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    </div>
                    <div className="products-horizontal-scroll" tabIndex={0} aria-label="More products. Swipe left or scroll horizontally to see more products.">
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
