import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { getCustomerOrderById, getOrderStatusTimeline } from '../services/customerOrderService'
import { supabase } from '../supabaseClient'
import { Order } from '../types'
import { formatCurrency } from '../utils/currency'
import './OrderDetails.css'

export default function OrderDetails() {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reorderSuccess, setReorderSuccess] = useState(false)

  useEffect(() => {
    if (!user || !orderId) {
      navigate('/login')
      return
    }

    const loadOrder = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const orderData = await getCustomerOrderById(orderId, user.id)
        if (!orderData) {
          setError('Order not found')
          return
        }
        setOrder(orderData)
      } catch (err: any) {
        console.error('Error loading order:', err)
        setError(err.message || 'Failed to load order')
      } finally {
        setIsLoading(false)
      }
    }

    loadOrder()

    // Subscribe to real-time order updates for this specific order
    if (!supabase) return

    const subscription = supabase
      .channel(`order-details-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('Specific order update received:', payload)
          setOrder(payload.new as Order)
        }
      )
      .subscribe()

    return () => {
      if (supabase && subscription) {
        supabase.removeChannel(subscription)
      }
    }
  }, [user, orderId, navigate])

  const handleReorder = () => {
    if (!order || !order.items) return

    try {
      // Add all items from the order to the cart
      order.items.forEach(item => {
        addToCart(item as any)
      })

      setReorderSuccess(true)
      setTimeout(() => {
        navigate('/checkout')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to add items to cart')
    }
  }

  if (isLoading) {
    return (
      <div className="order-details">
        <div className="page-container">
          <div className="loading-spinner">Loading order details...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-details">
        <div className="page-container">
          <div className="error-page">
            <h2>Order Not Found</h2>
            <p>{error || 'The order you are looking for does not exist.'}</p>
            <button onClick={() => navigate('/customer/orders')} className="back-btn">
              ← Back to Orders
            </button>
          </div>
        </div>
      </div>
    )
  }

  const timeline = getOrderStatusTimeline(order.status)

  return (
    <div className="order-details">
      <div className="page-container">
        <div className="details-header">
          <h1>Order Details</h1>
          <button className="back-btn" onClick={() => navigate('/customer/orders')}>
            ← Back to Orders
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {reorderSuccess && (
          <div className="success-message">
            ✓ Items added to cart! Redirecting to checkout...
          </div>
        )}

        <div className="details-grid">
          {/* Order Header */}
          <div className="details-card order-header-card">
            <div className="header-row">
              <div className="header-item">
                <span className="label">Order Number</span>
                <span className="value">#{order.id?.slice(0, 8)}</span>
              </div>
              <div className="header-item">
                <span className="label">Order Date</span>
                <span className="value">
                  {new Date(order.created_at || '').toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="header-item">
                <span className="label">Status</span>
                <span className={`status-badge ${order.status}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Order Timeline */}
          <div className="details-card timeline-card">
            <h2>Order Progress</h2>
            <div className="timeline">
              {timeline.map((stage, index) => (
                <div key={index} className={`timeline-item ${stage.completed ? 'completed' : ''}`}>
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <span className="stage-name">{stage.stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Information */}
          <div className="details-card customer-info-card">
            <h2>Customer Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Name</span>
                <span className="value">{order.customer_name}</span>
              </div>
              <div className="info-item">
                <span className="label">Email</span>
                <span className="value">{order.customer_email}</span>
              </div>
              <div className="info-item">
                <span className="label">Phone</span>
                <span className="value">{order.customer_phone}</span>
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="details-card delivery-info-card">
            <h2>Delivery Address</h2>
            <div className="address-block">
              <p>{order.delivery_address}</p>
              <p>{order.city}, {order.region}</p>
            </div>
            {order.notes && (
              <div className="notes-block">
                <h3>Special Instructions</h3>
                <p>{order.notes}</p>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="details-card items-card">
            <h2>Order Items</h2>
            <div className="items-list">
              {order.items && order.items.length > 0 ? (
                order.items.map(item => (
                  <div key={item.id} className="item-row">
                    <div className="item-image">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.name} />
                      )}
                    </div>
                    <div className="item-details">
                      <h3>{item.name}</h3>
                      <p className="category">{item.category}</p>
                    </div>
                    <div className="item-quantity">
                      <span className="qty">Qty: {item.quantity}</span>
                    </div>
                    <div className="item-price">
                      <span className="unit-price">{formatCurrency(item.price)}</span>
                      <span className="total-price">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-items">No items in this order</p>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div className="details-card summary-card">
            <h2>Order Summary</h2>
            <div className="summary-rows">
              <div className="summary-row">
                <span className="label">Subtotal</span>
                <span className="value">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Delivery Fee</span>
                <span className="value">{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="summary-row total">
                <span className="label">Total</span>
                <span className="value">{formatCurrency(order.total)}</span>
              </div>
              <div className="summary-row">
                <span className="label">Payment Status</span>
                <span className={`payment-status ${order.payment_status}`}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="details-actions">
          {order.status === 'delivered' && (
            <button className="reorder-btn" onClick={handleReorder}>
              Reorder Items
            </button>
          )}
          <button className="continue-shopping-btn" onClick={() => navigate('/products')}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  )
}
