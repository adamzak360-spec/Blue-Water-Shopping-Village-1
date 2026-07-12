import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../services/orderService'
import { createGuestOrder } from '../services/guestOrderService'
import { createOrUpdateCustomerProfile } from '../services/customerProfileService'
import { formatCurrency } from '../utils/currency'
import './Checkout.css'

// Configuration for guest checkout - could be moved to a config file
const GUEST_CHECKOUT_ENABLED = true

export default function Checkout() {
  const { cart, cartSubtotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    address: user?.user_metadata?.address || '',
    city: user?.user_metadata?.city || '',
    region: user?.user_metadata?.region || '',
    notes: ''
  })

  const deliveryFee = 5.00
  const total = cartSubtotal + deliveryFee

  if (cart.length === 0) {
    return (
      <div className="checkout-page empty">
        <div className="page-container">
          <h2>Your cart is empty</h2>
          <p>Add some products to your cart before checking out.</p>
          <button className="btn-primary" onClick={() => navigate('/products')}>Browse Products</button>
        </div>
      </div>
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log('[Checkout] Form submission started')
      console.log('[Checkout] Cart items:', cart.length)
      console.log('[Checkout] Total:', total)

      // Determine which service to call
      if (user) {
        console.log('[Checkout] Authenticated user detected')
      } else if (GUEST_CHECKOUT_ENABLED) {
        console.log('[Checkout] Guest user detected')
      }

      const orderPayload = {
        customer_name: formData.fullName,
        customer_email: formData.email,
        customer_phone: formData.phone,
        delivery_address: formData.address,
        city: formData.city,
        region: formData.region,
        notes: formData.notes,
        items: cart,
        subtotal: cartSubtotal,
        delivery_fee: deliveryFee,
        total: total,
        status: 'pending' as const,
        payment_status: 'pending' as const,
      }

      let result;
      if (user) {
        // Authenticated customer checkout - use unified orderService
        console.log('[Checkout] Authenticated user detected, using unified orderService')
        result = await createOrder({
          ...orderPayload,
          user_id: user.id
        })

        // Save customer profile for future orders
        try {
          await createOrUpdateCustomerProfile(user.id, {
            full_name: formData.fullName,
            phone_number: formData.phone,
            delivery_address: formData.address,
            city: formData.city,
            region: formData.region,
          })
          console.log('[Checkout] Customer profile saved')
        } catch (profileError) {
          console.warn('[Checkout] Failed to save customer profile:', profileError)
          // Don't fail the order if profile save fails
        }
      } else if (GUEST_CHECKOUT_ENABLED) {
        // Guest checkout - use guestOrderService
        console.log('[Checkout] Guest user detected, using guestOrderService')
        result = await createGuestOrder(orderPayload)
      } else {
        throw new Error('Guest checkout is disabled. Please log in to place an order.')
      }

      console.log('[Checkout] Order created successfully:', result.id)
      
      clearCart()
      console.log('[Checkout] Cart cleared')
      
      alert('Order placed successfully! Thank you for shopping with us.')
      navigate('/')
    } catch (error: any) {
      console.error('[Checkout] Order submission failed:', error)
      const errorMessage = error?.message || error?.error_description || 'Unknown error'
      alert(`Failed to place order: ${errorMessage}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-form-section">
          <h2>Customer Information</h2>
          <form onSubmit={handleSubmit} className="checkout-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="John Doe"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="0123456789"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="address">Delivery Address *</label>
              <input
                type="text"
                id="address"
                name="address"
                required
                value={formData.address}
                onChange={handleInputChange}
                placeholder="123 Main St"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Accra"
                />
              </div>
              <div className="form-group">
                <label htmlFor="region">Region *</label>
                <input
                  type="text"
                  id="region"
                  name="region"
                  required
                  value={formData.region}
                  onChange={handleInputChange}
                  placeholder="Greater Accra"
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Any special instructions for delivery?"
                rows={3}
              />
            </div>
            <button type="submit" className="submit-order-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : 'Place Order'}
            </button>
          </form>
        </div>

        <div className="order-summary-section">
          <h2>Order Summary</h2>
          <div className="order-summary-card">
            <div className="summary-items">
              {cart.map(item => (
                <div key={item.id} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    <span className="summary-item-qty">x {item.quantity}</span>
                  </div>
                  <span className="summary-item-price">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="summary-totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{formatCurrency(deliveryFee)}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
          <button className="back-to-products" onClick={() => navigate('/products')}>
            &larr; Back to Products
          </button>
        </div>
      </div>
    </div>
  )
}
