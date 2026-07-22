import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getCustomerOrders } from '../services/customerOrderService'
import { supabase } from '../supabaseClient'
import { getCustomerProfile } from '../services/customerProfileService'
import { Order, CustomerProfile } from '../types'
import { formatCurrency } from '../utils/currency'
import './CustomerDashboard.css'

export default function CustomerDashboard() {
  const { user, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Load customer profile
        const profileData = await getCustomerProfile(user.id)
        setProfile(profileData)

        // Load customer orders
        const ordersData = await getCustomerOrders(user.id)
        setOrders(ordersData)
      } catch (err: any) {
        console.error('Error loading dashboard data:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Subscribe to real-time order updates
    const subscription = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Order change received on dashboard:', payload)
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

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      alert('Failed to logout: ' + error.message)
    } else {
      navigate('/')
    }
  }

  if (isLoading) {
    return (
      <div className="customer-dashboard">
        <div className="page-container">
          <div className="loading-spinner">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'approved' || o.status === 'processing' || o.status === 'ready-for-pickup' || o.status === 'out-for-delivery')
  const completedOrders = orders.filter(o => o.status === 'delivered')
  const cancelledOrders = orders.filter(o => o.status === 'cancelled')

  return (
    <div className="customer-dashboard">
      <div className="page-container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1>Welcome, {profile?.full_name || user?.email?.split('@')[0] || 'Customer'}!</h1>
            <p className="tagline">Manage your account and orders</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-card account-overview">
            <h2>Account Overview</h2>
            <div className="overview-content">
              <div className="overview-item">
                <span className="label">Email</span>
                <span className="value">{user?.email}</span>
              </div>
              <div className="overview-item">
                <span className="label">Full Name</span>
                <span className="value">{profile?.full_name || 'Not set'}</span>
              </div>
              <div className="overview-item">
                <span className="label">Phone</span>
                <span className="value">{profile?.phone_number || 'Not set'}</span>
              </div>
              <div className="overview-item">
                <span className="label">Default Address</span>
                <span className="value">{profile?.delivery_address || 'Not set'}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-card quick-actions">
            <h2>Quick Actions</h2>
            <div className="actions-list">
              {isAdmin && (
                <button 
                  className="action-btn admin-btn" 
                  onClick={() => navigate('/admin')}
                  style={{ backgroundColor: '#0066cc', color: 'white' }}
                >
                  <span className="icon">🛡️</span>
                  <span>Admin Dashboard</span>
                </button>
              )}
              <button className="action-btn" onClick={() => navigate('/customer/profile')}>
                <span className="icon">👤</span>
                <span>Edit Profile</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/customer/orders')}>
                <span className="icon">📦</span>
                <span>My Orders</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/customer/settings')}>
                <span className="icon">⚙️</span>
                <span>Account Settings</span>
              </button>
              <button className="action-btn" onClick={() => navigate('/products')}>
                <span className="icon">🛍️</span>
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-number">{pendingOrders.length}</div>
            <div className="stat-label">Active Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{completedOrders.length}</div>
            <div className="stat-label">Completed Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{cancelledOrders.length}</div>
            <div className="stat-label">Cancelled Orders</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>

        {pendingOrders.length > 0 && (
          <div className="dashboard-card recent-orders">
            <h2>Active Orders</h2>
            <div className="orders-preview">
              {pendingOrders.slice(0, 3).map(order => (
                <div key={order.id} className="order-preview-item">
                  <div className="order-info">
                    <div className="order-id">Order #{order.id?.slice(0, 8)}</div>
                    <div className="order-date">{new Date(order.created_at || '').toLocaleDateString()}</div>
                  </div>
                  <div className="order-status">
                    <span className={`status-badge ${order.status}`}>{order.status}</span>
                  </div>
                  <div className="order-total">{formatCurrency(order.total)}</div>
                  <button
                    className="view-btn"
                    onClick={() => navigate(`/customer/orders/${order.id}`)}
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
            {pendingOrders.length > 3 && (
              <button
                className="view-all-btn"
                onClick={() => navigate('/customer/orders')}
              >
                View All Orders
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
