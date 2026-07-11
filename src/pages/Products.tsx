import { useState, useEffect } from 'react'
import { getAllProducts } from '../services/productService'
import type { Product } from '../types'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import './Products.css'

export default function Products() {
  const { addToCart } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await getAllProducts()
        setProducts(data)
        setFilteredProducts(data.filter(p => p.status === 'active'))
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
      {/* Page Header */}
      <div className="products-header">
        <h2>Our Products</h2>
        <p className="products-subtitle">
          {activeCount} product{activeCount !== 1 ? 's' : ''} available
          {showAll && ` (showing ${products.length} total, including inactive)`}
        </p>
      </div>

      {/* Search & Filter */}
      <div className="products-controls">
        <div className="controls-left">
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
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
        <div className="products-grid">
          {filteredProducts.map(product => (
            <div key={product.id} className="product-card">
              {product.image_url ? (
                <>
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="product-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const placeholder = target.nextElementSibling
                      if (placeholder) {
                        placeholder.classList.add('visible')
                      }
                    }}
                  />
                  <div className="product-image-placeholder">
                    <span>No image</span>
                  </div>
                </>
              ) : (
                <div className="product-image-placeholder visible">
                  <span>No image</span>
                </div>
              )}
              <div className="product-info">
                <span className="product-category">{product.category}</span>
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">{formatCurrency(product.price)}</span>
                  {product.stock_quantity === 0 ? (
                    <span className="out-of-stock-badge">Out of Stock</span>
                  ) : product.status === 'inactive' ? (
                    <span className="inactive-badge">Inactive</span>
                  ) : (
                    <span className="in-stock-badge">{product.stock_quantity} in stock</span>
                  )}
                </div>
                <button 
                  className="add-to-cart-btn"
                  onClick={() => addToCart(product)}
                  disabled={product.stock_quantity === 0 || product.status === 'inactive'}
                >
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
