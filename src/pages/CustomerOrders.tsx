import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCustomerOrders } from '../services/customerOrderService'
import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { formatCurrency } from '../utils/currency'
import './CustomerOrders.css'

export default function CustomerOrders() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const ordersData = await getCustomerOrders(user.id)
        setOrders(ordersData)
      } catch (err: any) {
        console.error('Error loading orders:', err)
        setError(err.message || 'Failed to load orders')
      } finally {
        setIsLoading(false)
      }
    }

    loadOrders()

    // Subscribe to real-time order updates
    const subscription = supabase
      .channel('customer-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order change received:', payload)
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(order => 
              order.id === payload.new.id ? { ...order, ...payload.new } : order
            ))
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [user, navigate])

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true
    return order.status === filterStatus
  })

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB
  })

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'processing', label: 'Processing' },
    { value: 'ready-for-pickup', label: 'Ready for Pickup' },
    { value: 'out-for-delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  if (isLoading) {
    return (
      <div className="customer-orders">
        <div className="page-container">
          <div className="loading-spinner">Loading orders...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="customer-orders">
      <div className="page-container">
        <div className="orders-header">
          <h1>My Orders</h1>
          <button className="back-btn" onClick={() => navigate('/customer')}>
            ← Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="orders-controls">
          <div className="control-group">
            <label htmlFor="filter-status">Filter by Status:</label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="sort-by">Sort by:</label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {sortedOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h2>No Orders Found</h2>
            <p>You haven't placed any orders yet.</p>
            <button
              className="shop-btn"
              onClick={() => navigate('/products')}
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {sortedOrders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div className="order-id-section">
                    <h3>Order #{order.id?.slice(0, 8)}</h3>
                    <span className="order-date">
                      {new Date(order.created_at || '').toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="order-status-section">
                    <span className={`status-badge ${order.status}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div className="order-card-body">
                  <div className="order-info">
                    <div className="info-item">
                      <span className="label">Items</span>
                      <span className="value">{order.items?.length || 0} item(s)</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Subtotal</span>
                      <span className="value">{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="info-item">
                      <span className="label">Delivery</span>
                      <span className="value">{formatCurrency(order.delivery_fee)}</span>
                    </div>
                  </div>

                  <div className="order-total">
                    <span className="label">Total</span>
                    <span className="amount">{formatCurrency(order.total)}</span>
                  </div>
                </div>

                <div className="order-card-footer">
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/customer/orders/${order.id}`)}
                  >
                    View Details
                  </button>
                  {order.status === 'delivered' && (
                    <button
                      className="reorder-btn"
                      onClick={() => navigate(`/customer/orders/${order.id}/reorder`)}
                    >
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
