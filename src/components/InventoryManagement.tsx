import React, { useState, useEffect, useCallback } from 'react'
import { Product } from '../types'
import { formatCurrency } from '../utils/currency'
import StockStatus from './StockStatus'
import {
  getAllProductsWithInventory,
  adminUpdateProductStock,
  adminGetLowStockProducts,
  adminGetInventorySummary,
  adminExportInventoryCSV,
} from '../services/adminInventoryService'
import { supplierService, Supplier } from '../services/supplierService'
import './InventoryManagement.css'

type InventoryView = 'overview' | 'all-products' | 'low-stock' | 'adjust'

interface InventorySummary {
  totalItems: number
  lowStockCount: number
  outOfStockCount: number
  totalProducts: number
}

export default function InventoryManagement() {
  const [view, setView] = useState<InventoryView>('overview')
  const [products, setProducts] = useState<Product[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [summary, setSummary] = useState<InventorySummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productSuppliers, setProductSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 3000)
  }, [])

  const loadInventoryData = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const [allProducts, lowStock, inventorySummary, allSuppliers] = await Promise.all([
        getAllProductsWithInventory(),
        adminGetLowStockProducts(),
        adminGetInventorySummary(),
        supplierService.getSuppliers()
      ])
      setProducts(allProducts)
      setLowStockProducts(lowStock)
      setSummary(inventorySummary)
      setSuppliers(allSuppliers)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadInventoryData()
  }, [loadInventoryData])

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProduct || !newStock) return

    try {
      const stock = parseInt(newStock)
      if (stock < 0) {
        setError('Stock quantity cannot be negative')
        return
      }

      await adminUpdateProductStock(selectedProduct.id, stock)
      showNotification(`Stock updated for ${selectedProduct.name}`)
      // Update local state to reflect change immediately
      setProducts(prev => prev.map(p => p.id === selectedProduct.id ? { ...p, stock_quantity: stock } : p))
      setSummary(prev => prev ? { ...prev, totalItems: prev.totalItems - selectedProduct.stock_quantity + stock } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock')
    }
  }

  const loadProductSuppliers = async (productId: string) => {
    try {
      const data = await supplierService.getProductSuppliers(productId)
      setProductSuppliers(data)
    } catch (err) {
      console.error('Failed to load product suppliers:', err)
    }
  }

  const handleLinkSupplier = async () => {
    if (!selectedProduct || !selectedSupplierId) return
    try {
      await supplierService.linkProductToSupplier(selectedProduct.id, selectedSupplierId)
      showNotification('Supplier linked successfully')
      setSelectedSupplierId('')
      loadProductSuppliers(selectedProduct.id)
    } catch (err: any) {
      setError(err.message || 'Failed to link supplier')
    }
  }

  const handleUnlinkSupplier = async (supplierId: string) => {
    if (!selectedProduct) return
    try {
      await supplierService.unlinkProductFromSupplier(selectedProduct.id, supplierId)
      showNotification('Supplier unlinked')
      loadProductSuppliers(selectedProduct.id)
    } catch (err: any) {
      setError(err.message || 'Failed to unlink supplier')
    }
  }

  const handleExportCSV = async () => {
    try {
      const csv = await adminExportInventoryCSV()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showNotification('Inventory exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export inventory')
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="inventory-management">
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
      <div className="inventory-header">
        <h3>Inventory Management</h3>
        <button className="export-btn" onClick={handleExportCSV}>
          📥 Export CSV
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="inventory-tabs">
        <button
          className={`tab ${view === 'overview' ? 'active' : ''}`}
          onClick={() => setView('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${view === 'all-products' ? 'active' : ''}`}
          onClick={() => setView('all-products')}
        >
          All Products
        </button>
        <button
          className={`tab ${view === 'low-stock' ? 'active' : ''}`}
          onClick={() => setView('low-stock')}
        >
          Low Stock ({lowStockProducts.length})
        </button>
        <button
          className={`tab ${view === 'adjust' ? 'active' : ''}`}
          onClick={() => setView('adjust')}
        >
          Adjust Stock
        </button>
      </div>

      {isLoading && !products.length ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>Loading inventory...</p>
        </div>
      ) : (
        <div className="inventory-content">
          {/* Overview Tab */}
          {view === 'overview' && summary && (
            <div className="inventory-overview">
              <div className="summary-card">
                <h4>Total Items</h4>
                <p className="summary-value">{summary.totalItems}</p>
              </div>
              <div className="summary-card">
                <h4>Total Products</h4>
                <p className="summary-value">{summary.totalProducts}</p>
              </div>
              <div className="summary-card warning">
                <h4>Low Stock</h4>
                <p className="summary-value">{summary.lowStockCount}</p>
              </div>
              <div className="summary-card alert">
                <h4>Out of Stock</h4>
                <p className="summary-value">{summary.outOfStockCount}</p>
              </div>
            </div>
          )}

          {/* All Products Tab */}
          {view === 'all-products' && (
            <div className="inventory-products">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="products-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.category}</td>
                        <td className="stock-cell">
                          <StockStatus stock={product.stock_quantity} size="small" />
                        </td>
                        <td>{formatCurrency(product.price)}</td>
                        <td>{product.status}</td>
                        <td>
                          <button
                            className="adjust-btn"
                            onClick={() => {
                              setSelectedProduct(product)
                              setNewStock(product.stock_quantity.toString())
                              loadProductSuppliers(product.id)
                              setView('adjust')
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Low Stock Tab */}
          {view === 'low-stock' && (
            <div className="inventory-low-stock">
              {lowStockProducts.length === 0 ? (
                <p className="empty-state">No products with low stock!</p>
              ) : (
                <div className="products-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Category</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lowStockProducts.map(product => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.category}</td>
                          <td className="stock-cell">
                            <StockStatus stock={product.stock_quantity} size="small" />
                          </td>
                          <td>{formatCurrency(product.price)}</td>
                          <td>
                            <button
                              className="adjust-btn"
                              onClick={() => {
                                setSelectedProduct(product)
                                setNewStock(product.stock_quantity.toString())
                                loadProductSuppliers(product.id)
                                setView('adjust')
                              }}
                            >
                              Adjust
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

          {/* Adjust Stock Tab */}
          {view === 'adjust' && (
            <div className="inventory-adjust">
              {selectedProduct ? (
                <>
                <form onSubmit={handleUpdateStock} className="adjust-form">
                  <div className="form-group">
                    <label>Product</label>
                    <p className="product-display">{selectedProduct.name}</p>
                  </div>
                  <div className="form-group">
                    <label>Current Stock</label>
                    <p className="stock-display">{selectedProduct.stock_quantity}</p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="newStock">New Stock Quantity *</label>
                    <input
                      type="number"
                      id="newStock"
                      min="0"
                      value={newStock}
                      onChange={(e) => setNewStock(e.target.value)}
                      placeholder="Enter new stock quantity"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      Update Stock
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setSelectedProduct(null)
                        setNewStock('')
                        setView('all-products')
                      }}
                    >
                      Back to List
                    </button>
                  </div>
                </form>

                <div className="supplier-link-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Linked Suppliers</h4>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <select 
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                    >
                      <option value="">Select a supplier to link...</option>
                      {suppliers
                        .filter(s => !productSuppliers.some(ps => ps.id === s.id))
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.company_name}</option>
                        ))
                      }
                    </select>
                    <button 
                      style={{ backgroundColor: '#10b981', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', border: 'none' }}
                      onClick={handleLinkSupplier}
                      disabled={!selectedSupplierId}
                    >
                      Link Supplier
                    </button>
                  </div>

                  <div className="linked-suppliers-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {productSuppliers.length === 0 ? (
                      <p style={{ color: '#666', fontStyle: 'italic' }}>No suppliers linked to this product.</p>
                    ) : (
                      productSuppliers.map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9f9f9', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
                          <div>
                            <p style={{ fontWeight: '500', margin: 0 }}>{s.company_name}</p>
                            <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>{s.contact_person} | {s.email_address}</p>
                          </div>
                          <button 
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500' }}
                            onClick={() => handleUnlinkSupplier(s.id)}
                          >
                            Unlink
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                </>
              ) : (
                <p className="empty-state">Select a product to adjust stock</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
