import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getDashboardStats,
} from '../services/productService'
import type { Product, DashboardStats } from '../types'
import './Admin.css'

type AdminView = 'dashboard' | 'products' | 'add' | 'edit'

interface ProductFormErrors {
  name?: string
  description?: string
  price?: string
  category?: string
  stock_quantity?: string
}

const defaultFormState = {
  name: '',
  description: '',
  price: '',
  category: '',
  stock_quantity: '',
  status: 'active' as const,
  image: null as File | null,
  existingImageUrl: '',
}

export default function Admin() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<AdminView>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, outOfStock: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(defaultFormState)
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [allProducts, statsData] = await Promise.all([
        getAllProducts(),
        getDashboardStats(),
      ])
      setProducts(allProducts)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const validateForm = (): boolean => {
    const errors: ProductFormErrors = {}
    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.price || parseFloat(formData.price) <= 0) errors.price = 'Valid price is required'
    if (!formData.category.trim()) errors.category = 'Category is required'
    if (!formData.stock_quantity || parseInt(formData.stock_quantity) < 0) errors.stock_quantity = 'Valid stock quantity is required'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError('')

    try {
      let imageUrl = formData.existingImageUrl
      if (formData.image) {
        imageUrl = await uploadProductImage(formData.image)
      }

      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category.trim(),
        stock_quantity: parseInt(formData.stock_quantity),
        status: formData.status,
        image_url: imageUrl,
      }

      if (view === 'edit' && editProduct) {
        await updateProduct(editProduct.id, productData)
        showNotification('Product updated successfully!')
      } else {
        await createProduct(productData)
        showNotification('Product added successfully!')
      }

      setFormData(defaultFormState)
      setView('products')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      await deleteProduct(id)
      showNotification(`"${name}" has been deleted.`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleEdit = (product: Product) => {
    setEditProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category: product.category,
      stock_quantity: product.stock_quantity.toString(),
      status: product.status,
      image: null,
      existingImageUrl: product.image_url,
    })
    setView('edit')
  }

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const categories = [...new Set(products.map(p => p.category))]

  if (isLoading && products.length === 0) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="admin-header">
        <h2>Admin Dashboard</h2>
        <div className="admin-user-info">
          <span className="user-email">{user?.email}</span>
          <button onClick={() => signOut()} className="admin-logout">Sign Out</button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`tab ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab ${view === 'products' ? 'active' : ''}`}
          onClick={() => { setView('products'); setEditProduct(null); }}
        >
          Products ({products.length})
        </button>
        <button
          className={`tab ${view === 'add' ? 'active' : ''}`}
          onClick={() => { setView('add'); setFormData(defaultFormState); setFormErrors({}); }}
        >
          + Add Product
        </button>
      </div>

      {/* Dashboard Overview */}
      {view === 'dashboard' && (
        <div className="dashboard-content">
          <div className="stats-grid">
            <div className="stat-card stat-total">
              <div className="stat-icon">&#128230;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Products</span>
              </div>
            </div>
            <div className="stat-card stat-active">
              <div className="stat-icon">&#9989;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.active}</span>
                <span className="stat-label">Active Products</span>
              </div>
            </div>
            <div className="stat-card stat-out-of-stock">
              <div className="stat-icon">&#9888;</div>
              <div className="stat-info">
                <span className="stat-value">{stats.outOfStock}</span>
                <span className="stat-label">Out of Stock</span>
              </div>
            </div>
          </div>

          <div className="recent-products">
            <h3>Recent Products</h3>
            {products.length === 0 ? (
              <div className="empty-state">
                <h3>No products yet</h3>
                <p>Start by adding your first product.</p>
                <button onClick={() => setView('add')} className="btn-primary">
                  Add Product
                </button>
              </div>
            ) : (
              <div className="product-preview-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 5).map(product => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td>${product.price.toFixed(2)}</td>
                        <td>{product.stock_quantity}</td>
                        <td>
                          <span className={`status-badge ${product.status}`}>
                            {product.status === 'active' ? 'Active' : product.status === 'out-of-stock' ? 'Out of Stock' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products List */}
      {view === 'products' && (
        <div className="products-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>{products.length === 0 ? 'No products yet' : 'No products match your search'}</h3>
              <p>{products.length === 0 ? 'Start by adding your first product.' : 'Try adjusting your search or filters.'}</p>
              {products.length === 0 && (
                <button onClick={() => setView('add')} className="btn-primary">
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td className="product-image-cell">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="product-thumb" />
                        ) : (
                          <div className="product-thumb-placeholder">No image</div>
                        )}
                      </td>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>${product.price.toFixed(2)}</td>
                      <td>{product.stock_quantity}</td>
                      <td>
                        <span className={`status-badge ${product.status}`}>
                          {product.status === 'active' ? 'Active' : product.status === 'out-of-stock' ? 'Out of Stock' : 'Inactive'}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          onClick={() => handleEdit(product)}
                          className="btn-edit"
                          title="Edit product"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          className="btn-delete"
                          title="Delete product"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Product Form */}
      {(view === 'add' || view === 'edit') && (
        <div className="product-form-content">
          <h3>{view === 'edit' ? `Edit: ${editProduct?.name}` : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="product-form" noValidate>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="product-name">Product Name *</label>
                <input
                  id="product-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={formErrors.name ? 'input-error' : ''}
                  placeholder="e.g., Fresh Organic Tomatoes"
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="product-category">Category *</label>
                <input
                  id="product-category"
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className={formErrors.category ? 'input-error' : ''}
                  placeholder="e.g., Produce"
                  list="category-suggestions"
                />
                <datalist id="category-suggestions">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && <span className="error-text">{formErrors.category}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="product-description">Description *</label>
              <textarea
                id="product-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={formErrors.description ? 'input-error' : ''}
                placeholder="Describe this product..."
              />
              {formErrors.description && <span className="error-text">{formErrors.description}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="product-price">Price ($) *</label>
                <input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className={formErrors.price ? 'input-error' : ''}
                  placeholder="0.00"
                />
                {formErrors.price && <span className="error-text">{formErrors.price}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="product-stock">Stock Quantity *</label>
                <input
                  id="product-stock"
                  type="number"
                  min="0"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                  className={formErrors.stock_quantity ? 'input-error' : ''}
                  placeholder="0"
                />
                {formErrors.stock_quantity && <span className="error-text">{formErrors.stock_quantity}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="product-status">Status</label>
                <select
                  id="product-status"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'out-of-stock' }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="product-image">Product Image</label>
              <input
                id="product-image"
                type="file"
                accept="image/*"
                onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.files?.[0] || null }))}
                className="file-input"
              />
              {(formData.existingImageUrl || formData.image) && (
                <div className="image-preview">
                  <img
                    src={formData.image ? URL.createObjectURL(formData.image) : formData.existingImageUrl}
                    alt="Preview"
                    className="preview-img"
                  />
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => setView('products')} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="spinner-small" />
                    {view === 'edit' ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  view === 'edit' ? 'Update Product' : 'Add Product'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
