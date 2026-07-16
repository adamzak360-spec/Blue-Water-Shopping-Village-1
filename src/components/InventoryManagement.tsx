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
import { 
  LayoutDashboard, 
  Package, 
  AlertTriangle, 
  RefreshCcw, 
  Download, 
  Search, 
  Link as LinkIcon, 
  Unlink,
  ChevronRight,
  Plus
} from 'lucide-react'
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
      
      // Refresh all data to ensure consistency
      loadInventoryData()
      
      // Clear selection after update
      setSelectedProduct(null)
      setNewStock('')
      setView('all-products')
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
    <div className="inventory-management-container">
      {/* Notifications & Errors */}
      {notification && (
        <div className={`inventory-notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}

      {error && (
        <div className="inventory-error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Header Section */}
      <div className="inventory-header-section">
        <div>
          <h2 className="inventory-title">Inventory Control</h2>
          <p className="inventory-subtitle">Monitor stock levels and manage product suppliers</p>
        </div>
        <button className="inventory-export-btn" onClick={handleExportCSV}>
          <Download size={18} />
          <span>Export Inventory</span>
        </button>
      </div>

      {/* Summary Dashboard */}
      <div className="inventory-summary-grid">
        <div className="inventory-summary-card total">
          <div className="summary-icon-wrapper">
            <Package size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Total Stock Items</span>
            <span className="summary-value">{summary?.totalItems || 0}</span>
          </div>
        </div>
        <div className="inventory-summary-card products">
          <div className="summary-icon-wrapper">
            <LayoutDashboard size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Unique Products</span>
            <span className="summary-value">{summary?.totalProducts || 0}</span>
          </div>
        </div>
        <div className="inventory-summary-card warning">
          <div className="summary-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Low Stock Alerts</span>
            <span className="summary-value">{summary?.lowStockCount || 0}</span>
          </div>
        </div>
        <div className="inventory-summary-card danger">
          <div className="summary-icon-wrapper">
            <AlertTriangle size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Out of Stock</span>
            <span className="summary-value">{summary?.outOfStockCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="inventory-nav-tabs">
        <button
          className={`inventory-tab ${view === 'overview' ? 'active' : ''}`}
          onClick={() => setView('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`inventory-tab ${view === 'all-products' ? 'active' : ''}`}
          onClick={() => setView('all-products')}
        >
          <Package size={18} />
          <span>All Products</span>
        </button>
        <button
          className={`inventory-tab ${view === 'low-stock' ? 'active' : ''}`}
          onClick={() => setView('low-stock')}
        >
          <AlertTriangle size={18} />
          <span>Low Stock ({lowStockProducts.length})</span>
        </button>
        <button
          className={`inventory-tab ${view === 'adjust' ? 'active' : ''}`}
          onClick={() => setView('adjust')}
        >
          <RefreshCcw size={18} />
          <span>Stock Adjustment</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="inventory-content-wrapper">
        {isLoading && !products.length ? (
          <div className="inventory-loading">
            <div className="inventory-spinner" />
            <p>Syncing inventory data...</p>
          </div>
        ) : (
          <div className="inventory-view-container">
            {/* Dashboard Overview */}
            {view === 'overview' && (
              <div className="inventory-dashboard-view">
                <div className="dashboard-welcome">
                  <h3>Welcome to Inventory Control</h3>
                  <p>Quickly identify stock issues and restock popular items.</p>
                </div>
                <div className="dashboard-quick-actions">
                  <div className="action-card" onClick={() => setView('low-stock')}>
                    <AlertTriangle className="text-amber-500" />
                    <h4>Restock Needed</h4>
                    <p>{summary?.lowStockCount || 0} products are below threshold</p>
                    <ChevronRight size={20} />
                  </div>
                  <div className="action-card" onClick={() => setView('all-products')}>
                    <Package className="text-blue-500" />
                    <h4>Manage Catalog</h4>
                    <p>Update stock levels for {summary?.totalProducts || 0} products</p>
                    <ChevronRight size={20} />
                  </div>
                </div>
              </div>
            )}

            {/* Products List (Shared for All and Low Stock) */}
            {(view === 'all-products' || view === 'low-stock') && (
              <div className="inventory-list-view">
                <div className="list-controls">
                  <div className="inventory-search-bar">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Search by product name or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="inventory-table-container">
                  <table className="inventory-data-table">
                    <thead>
                      <tr>
                        <th>Product Details</th>
                        <th>Category</th>
                        <th>Current Stock</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(view === 'all-products' ? filteredProducts : lowStockProducts).map(product => (
                        <tr key={product.id}>
                          <td>
                            <div className="product-info-cell">
                              <span className="p-name">{product.name}</span>
                              <span className="p-id">ID: {product.id.substring(0, 8)}</span>
                            </div>
                          </td>
                          <td><span className="category-badge">{product.category}</span></td>
                          <td>
                            <div className="stock-level-cell">
                              <StockStatus stock={product.stock_quantity} size="small" />
                              <span className="stock-count">{product.stock_quantity} units</span>
                            </div>
                          </td>
                          <td><span className="price-tag">{formatCurrency(product.price)}</span></td>
                          <td>
                            <span className={`status-pill ${product.status}`}>
                              {product.status === 'active' ? 'Active' : 'Out of Stock'}
                            </span>
                          </td>
                          <td>
                            <button
                              className="inventory-action-btn"
                              onClick={() => {
                                setSelectedProduct(product)
                                setNewStock(product.stock_quantity.toString())
                                loadProductSuppliers(product.id)
                                setView('adjust')
                              }}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(view === 'all-products' ? filteredProducts : lowStockProducts).length === 0 && (
                    <div className="inventory-empty-state">
                      <Package size={48} />
                      <p>No products found matching your criteria.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stock Adjustment & Supplier Linking */}
            {view === 'adjust' && (
              <div className="inventory-adjustment-view">
                {selectedProduct ? (
                  <div className="adjustment-grid">
                    {/* Left: Stock Form */}
                    <div className="adjustment-form-card">
                      <div className="card-header">
                        <RefreshCcw size={20} />
                        <h3>Stock Adjustment</h3>
                      </div>
                      <form onSubmit={handleUpdateStock} className="stock-form">
                        <div className="form-info-group">
                          <label>Product Name</label>
                          <div className="info-value">{selectedProduct.name}</div>
                        </div>
                        <div className="form-info-group">
                          <label>Current Stock</label>
                          <div className="info-value highlight">{selectedProduct.stock_quantity} units</div>
                        </div>
                        <div className="form-input-group">
                          <label htmlFor="newStock">New Stock Level</label>
                          <input
                            type="number"
                            id="newStock"
                            min="0"
                            value={newStock}
                            onChange={(e) => setNewStock(e.target.value)}
                            placeholder="Enter quantity"
                            required
                          />
                        </div>
                        <div className="form-button-row">
                          <button type="submit" className="inventory-btn-primary">
                            Update Inventory
                          </button>
                          <button
                            type="button"
                            className="inventory-btn-secondary"
                            onClick={() => setView('all-products')}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Right: Supplier Management */}
                    <div className="adjustment-suppliers-card">
                      <div className="card-header">
                        <LinkIcon size={20} />
                        <h3>Product Suppliers</h3>
                      </div>
                      
                      <div className="supplier-link-box">
                        <select 
                          className="inventory-select"
                          value={selectedSupplierId}
                          onChange={(e) => setSelectedSupplierId(e.target.value)}
                        >
                          <option value="">Link a new supplier...</option>
                          {suppliers
                            .filter(s => !productSuppliers.some(ps => ps.id === s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>{s.company_name}</option>
                            ))
                          }
                        </select>
                        <button 
                          className="inventory-add-btn"
                          onClick={handleLinkSupplier}
                          disabled={!selectedSupplierId}
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      <div className="linked-suppliers-container">
                        <h4 className="container-title">Current Suppliers</h4>
                        {productSuppliers.length === 0 ? (
                          <div className="suppliers-empty">
                            <p>No suppliers linked to this product yet.</p>
                          </div>
                        ) : (
                          <div className="suppliers-list">
                            {productSuppliers.map(s => (
                              <div key={s.id} className="supplier-item-row">
                                <div className="s-details">
                                  <span className="s-name">{s.company_name}</span>
                                  <span className="s-contact">{s.contact_person}</span>
                                </div>
                                <button 
                                  className="s-unlink-btn"
                                  onClick={() => handleUnlinkSupplier(s.id)}
                                  title="Unlink Supplier"
                                >
                                  <Unlink size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="inventory-empty-state selection-needed">
                    <Package size={64} />
                    <h3>No Product Selected</h3>
                    <p>Please select a product from the list to manage its stock and suppliers.</p>
                    <button className="inventory-btn-primary" onClick={() => setView('all-products')}>
                      View Product List
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
