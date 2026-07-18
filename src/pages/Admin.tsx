import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getDashboardStats,
} from '../services/productService'
import {
  getAllOrders,
  updateOrderStatus,
} from '../services/orderService'
import {
  getAllReviews,
  updateReviewStatus,
  deleteReview,
} from '../services/reviewService'
import {
  exportOrdersCSV,
  exportProductsCSV,
  exportCustomersCSV,
} from '../services/adminAnalyticsService'
import { testEmailSending } from '../api/emailNotificationHandler'
import type { Product, DashboardStats, Order, Review } from '../types'
import { formatCurrency } from '../utils/currency'
import InventoryManagement from '../components/InventoryManagement'
import AdminAnalytics from '../components/AdminAnalytics'
import FinancialReports from '../components/FinancialReports'
import SupplierManagement from '../components/SupplierManagement'
import './Admin.css'

type AdminView = 'dashboard' | 'products' | 'add' | 'edit' | 'orders' | 'inventory' | 'analytics' | 'reports' | 'suppliers' | 'reviews'

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
  status: 'active' as 'active' | 'inactive' | 'out-of-stock',
  image: null as File | null,
  existingImageUrl: '',
}

export default function Admin() {
  const { user, signOut } = useAuth()
  const [view, setView] = useState<AdminView>('dashboard')
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState<DashboardStats>({ total: 0, active: 0, outOfStock: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [reviewSearchTerm, setReviewSearchTerm] = useState('')
  const [orderFilterStatus, setOrderFilterStatus] = useState('')
  const [reviewFilterProduct, setReviewFilterProduct] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState(defaultFormState)
  const [formErrors, setFormErrors] = useState<ProductFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [allProducts, statsData, allOrders, allReviews] = await Promise.all([
        getAllProducts(),
        getDashboardStats(),
        getAllOrders(),
        getAllReviews(),
      ])
      setProducts(allProducts)
      setStats(statsData)
      setOrders(allOrders)
      setReviews(allReviews)
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customer_name.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      (order.id && order.id.toLowerCase().includes(orderSearchTerm.toLowerCase()))
    const matchesStatus = !orderFilterStatus || order.status === orderFilterStatus
    return matchesSearch && matchesStatus
  })

  const filteredReviews = reviews.filter(review => {
    const product = products.find(p => p.id === review.product_id)
    const productName = product ? product.name.toLowerCase() : ''
    const matchesSearch = 
      review.customer_name.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
      review.message.toLowerCase().includes(reviewSearchTerm.toLowerCase()) ||
      productName.includes(reviewSearchTerm.toLowerCase())
    const matchesProduct = !reviewFilterProduct || review.product_id === reviewFilterProduct
    return matchesSearch && matchesProduct
  })

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order)
    setShowOrderModal(true)
  }

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const order = orders.find(o => o.id === orderId)
      if (!order) {
        setError('Order not found')
        return
      }
      await updateOrderStatus(orderId, newStatus)
      showNotification('Order status updated successfully!')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleReviewStatusUpdate = async (reviewId: string, status: 'approved' | 'hidden') => {
    try {
      await updateReviewStatus(reviewId, status)
      showNotification(`Review ${status} successfully!`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review status')
    }
  }

  const handleReviewDelete = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    try {
      await deleteReview(reviewId)
      showNotification('Review deleted successfully!')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
    }
  }

  const handleTestEmail = async () => {
    if (!user?.email) return
    setIsTestingEmail(true)
    try {
      const result = await testEmailSending(user.email)
      if (result.success) {
        showNotification(result.message, 'success')
      } else {
        setError(result.error || result.message)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send test email')
    } finally {
      setIsTestingEmail(false)
    }
  }

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExportOrders = async () => {
    try {
      const csv = exportOrdersCSV(orders)
      downloadCSV(csv, `orders-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Orders exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export orders')
    }
  }

  const handleExportProducts = async () => {
    try {
      const csv = await exportProductsCSV(products)
      downloadCSV(csv, `products-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Products exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export products')
    }
  }

  const handleExportCustomers = async () => {
    try {
      const csv = await exportCustomersCSV()
      downloadCSV(csv, `customers-${new Date().toISOString().split('T')[0]}.csv`)
      showNotification('Customers exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export customers')
    }
  }

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
          <button 
            onClick={handleTestEmail} 
            className="btn-test-email" 
            disabled={isTestingEmail}
            style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.8rem' }}
          >
            {isTestingEmail ? 'Testing...' : 'Test Email System'}
          </button>
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
        <button
          className={`tab ${view === 'orders' ? 'active' : ''}`}
          onClick={() => setView('orders')}
        >
          Orders ({orders.length})
        </button>
        <button
          className={`tab ${view === 'reviews' ? 'active' : ''}`}
          onClick={() => setView('reviews')}
        >
          Reviews ({reviews.length})
        </button>
        <button
          className={`tab ${view === 'inventory' ? 'active' : ''}`}
          onClick={() => setView('inventory')}
        >
          Inventory
        </button>
        <button
          className={`tab ${view === 'analytics' ? 'active' : ''}`}
          onClick={() => setView('analytics')}
        >
          Analytics
        </button>
        <button
          className={`tab ${view === 'reports' ? 'active' : ''}`}
          onClick={() => setView('reports')}
        >
          Reports
        </button>
        <button
          className={`tab ${view === 'suppliers' ? 'active' : ''}`}
          onClick={() => setView('suppliers')}
        >
          Suppliers
        </button>
      </div>

      {/* Analytics View */}
      {view === 'analytics' && <AdminAnalytics />}

      {/* Inventory Management View */}
      {view === 'inventory' && <InventoryManagement />}

      {/* Financial Reports View */}
      {view === 'reports' && <FinancialReports />}

      {/* Supplier Management View */}
      {view === 'suppliers' && <SupplierManagement />}

      {/* Reviews Management View */}
      {view === 'reviews' && (
        <div className="reviews-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search reviews by customer, message or product..."
              value={reviewSearchTerm}
              onChange={(e) => setReviewSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={reviewFilterProduct}
              onChange={(e) => setReviewFilterProduct(e.target.value)}
              className="filter-select"
            >
              <option value="">All Products</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="empty-state">
              <h3>{reviews.length === 0 ? 'No reviews yet' : 'No reviews match your search'}</h3>
              <p>{reviews.length === 0 ? 'Reviews will appear here once customers submit them.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="reviews-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Customer</th>
                    <th>Rating</th>
                    <th>Review</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviews.map(review => {
                    const product = products.find(p => p.id === review.product_id)
                    return (
                      <tr key={review.id}>
                        <td>{product ? product.name : 'Unknown Product'}</td>
                        <td>{review.customer_name}</td>
                        <td>
                          <div style={{ color: '#fbbf24' }}>
                            {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '300px' }}>
                            {review.title && <div style={{ fontWeight: 600 }}>{review.title}</div>}
                            <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>{review.message}</div>
                            <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                              {new Date(review.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge status-${review.status}`}>
                            {review.status}
                          </span>
                        </td>
                        <td className="actions-cell">
                          {review.status !== 'approved' && (
                            <button
                              onClick={() => handleReviewStatusUpdate(review.id, 'approved')}
                              className="btn-edit"
                              style={{ backgroundColor: '#16a34a' }}
                            >
                              Approve
                            </button>
                          )}
                          {review.status !== 'hidden' && (
                            <button
                              onClick={() => handleReviewStatusUpdate(review.id, 'hidden')}
                              className="btn-edit"
                              style={{ backgroundColor: '#6b7280' }}
                            >
                              Hide
                            </button>
                          )}
                          <button
                            onClick={() => handleReviewDelete(review.id)}
                            className="btn-delete"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
                    </tr>
                  </thead>
                  <tbody>
                    {products.slice(0, 5).map(product => (
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
                        <td>{formatCurrency(product.price)}</td>
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

      {/* Products Management */}
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
            <button onClick={handleExportProducts} className="btn-export" title="Export products as CSV">
              Export Products
            </button>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <h3>{products.length === 0 ? 'No products yet' : 'No products match your search'}</h3>
              <p>{products.length === 0 ? 'Start by adding your first product.' : 'Try adjusting your search or filters.'}</p>
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
                      <td>{formatCurrency(product.price)}</td>
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

      {/* Orders Management */}
      {view === 'orders' && (
        <div className="orders-list-content">
          <div className="search-filter-bar">
            <input
              type="text"
              placeholder="Search orders by customer or ID..."
              value={orderSearchTerm}
              onChange={(e) => setOrderSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={orderFilterStatus}
              onChange={(e) => setOrderFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="out-of-delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button onClick={handleExportOrders} className="btn-export" title="Export orders as CSV">
              Export Orders
            </button>
            <button onClick={handleExportCustomers} className="btn-export" title="Export customers as CSV">
              Export Customers
            </button>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="empty-state">
              <h3>{orders.length === 0 ? 'No orders yet' : 'No orders match your search'}</h3>
              <p>{orders.length === 0 ? 'Orders will appear here once customers place them.' : 'Try adjusting your search or filters.'}</p>
            </div>
          ) : (
            <div className="orders-table">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(order => (
                    <tr key={order.id}>
                      <td className="order-id-cell">
                        <span className="order-id" title={order.id}>
                          {order.id?.substring(0, 8)}...
                        </span>
                      </td>
                      <td>
                        <div className="customer-info">
                          <div className="customer-name">{order.customer_name}</div>
                          <div className="customer-email">{order.customer_email}</div>
                        </div>
                      </td>
                      <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}</td>
                      <td>{formatCurrency(order.total)}</td>
                      <td>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status.replace('-', ' ')}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id!, e.target.value as Order['status'])}
                          className="status-select"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="processing">Processing</option>
                          <option value="out-of-delivery">Out for Delivery</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="btn-view"
                          title="View order details"
                        >
                          View Details
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

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content order-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details</h3>
              <button className="close-modal" onClick={() => setShowOrderModal(false)}>&times;</button>
            </div>
            
            <div className="order-details-grid">
              {/* Customer Section */}
              <div className="details-section">
                <h4>Customer Information</h4>
                <div className="details-card">
                  <div className="detail-item">
                    <span className="detail-label">Full Name:</span>
                    <span className="detail-value">{selectedOrder.customer_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{selectedOrder.customer_email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{selectedOrder.customer_phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Address:</span>
                    <span className="detail-value">{selectedOrder.delivery_address}, {selectedOrder.city}, {selectedOrder.region}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Customer Type:</span>
                    <span className={`detail-value type-badge ${selectedOrder.user_id ? 'registered' : 'guest'}`}>
                      {selectedOrder.user_id ? 'Registered User' : 'Guest'}
                    </span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="detail-item notes">
                      <span className="detail-label">Notes:</span>
                      <p className="detail-value">{selectedOrder.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary Section */}
              <div className="details-section">
                <h4>Order Information</h4>
                <div className="details-card">
                  <div className="detail-item">
                    <span className="detail-label">Order ID:</span>
                    <span className="detail-value monospace">{selectedOrder.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">
                      {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`status-badge status-${selectedOrder.status}`}>
                      {selectedOrder.status.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="detail-item summary-row">
                    <span className="detail-label">Subtotal:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="detail-item summary-row">
                    <span className="detail-label">Delivery Fee:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.delivery_fee)}</span>
                  </div>
                  <div className="detail-item summary-row grand-total">
                    <span className="detail-label">Grand Total:</span>
                    <span className="detail-value">{formatCurrency(selectedOrder.total)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Payment Status:</span>
                    <span className={`status-badge status-${selectedOrder.payment_status}`}>
                      {selectedOrder.payment_status?.replace('-', ' ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Information Section */}
              {selectedOrder.payment_method && (
                <div className="details-section">
                  <h4>Payment Information</h4>
                  <div className="details-card">
                    <div className="detail-item">
                      <span className="detail-label">Payment Method:</span>
                      <span className="detail-value">{selectedOrder.payment_method}</span>
                    </div>
                    {selectedOrder.paystack_reference && (
                      <div className="detail-item">
                        <span className="detail-label">Paystack Reference:</span>
                        <span className="detail-value monospace">{selectedOrder.paystack_reference}</span>
                      </div>
                    )}
                    {selectedOrder.amount_paid && (
                      <div className="detail-item">
                        <span className="detail-label">Amount Paid:</span>
                        <span className="detail-value">{formatCurrency(selectedOrder.amount_paid)}</span>
                      </div>
                    )}
                    {selectedOrder.payment_date && (
                      <div className="detail-item">
                        <span className="detail-label">Payment Date:</span>
                        <span className="detail-value">
                          {new Date(selectedOrder.payment_date).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Products Section */}
            <div className="details-section products-section">
              <h4>Products Ordered</h4>
              <div className="order-items-list">
                <table>
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => (
                      <tr key={index}>
                        <td className="product-image-cell">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="product-thumb" />
                          ) : (
                            <div className="product-thumb-placeholder">No image</div>
                          )}
                        </td>
                        <td>
                          <div className="product-name">{item.name}</div>
                          <div className="product-id-small">{item.id}</div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.price)}</td>
                        <td>{formatCurrency(item.quantity * item.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-close" onClick={() => setShowOrderModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Form */}
      {(view === 'add' || view === 'edit') && (
        <div className="product-form-content">
          <h3>{view === 'edit' ? `Edit: ${editProduct?.name}` : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="admin-form">
            <div className="form-grid">
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={formErrors.name ? 'error' : ''}
                />
                {formErrors.name && <span className="error-text">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={formErrors.category ? 'error' : ''}
                  list="category-list"
                />
                <datalist id="category-list">
                  {categories.map(cat => <option key={cat} value={cat} />)}
                </datalist>
                {formErrors.category && <span className="error-text">{formErrors.category}</span>}
              </div>

              <div className="form-group">
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className={formErrors.price ? 'error' : ''}
                />
                {formErrors.price && <span className="error-text">{formErrors.price}</span>}
              </div>

              <div className="form-group">
                <label>Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className={formErrors.stock_quantity ? 'error' : ''}
                />
                {formErrors.stock_quantity && <span className="error-text">{formErrors.stock_quantity}</span>}
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="out-of-stock">Out of Stock</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={formErrors.description ? 'error' : ''}
                  rows={4}
                />
                {formErrors.description && <span className="error-text">{formErrors.description}</span>}
              </div>

              <div className="form-group full-width">
                <label>Product Image</label>
                <div className="image-upload-container">
                  {formData.existingImageUrl && !formData.image && (
                    <div className="current-image-preview">
                      <img src={formData.existingImageUrl} alt="Current" />
                      <span>Current Image</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, image: e.target.files?.[0] || null })}
                  />
                  <p className="help-text">Leave empty to keep current image (when editing)</p>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setView('products')}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : view === 'edit' ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
