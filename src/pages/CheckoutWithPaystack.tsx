import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { createOrder } from '../services/orderService'
import { createGuestOrder } from '../services/guestOrderService'
import { createOrUpdateCustomerProfile } from '../services/customerProfileService'
import { 
  initializePayment, 
  verifyPayment, 
  generatePaymentReference,
  getPublicKey 
} from '../services/paystackService'
import { formatCurrency } from '../utils/currency'
import './Checkout.css'

const GUEST_CHECKOUT_ENABLED = true

export default function Checkout() {
  const { cart, cartSubtotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'verifying'>('form')
  const [paymentReference, setPaymentReference] = useState<string>('')
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

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v1/inline.js'
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log('[Checkout] Form validation started')
      
      // Initialize payment with Paystack
      const reference = generatePaymentReference()
      setPaymentReference(reference)

      console.log('[Checkout] Initializing Paystack payment with reference:', reference)

      const paymentInit = await initializePayment({
        email: formData.email,
        amount: Math.round(total * 100), // Convert to kobo
        reference: reference,
        metadata: {
          customer_name: formData.fullName,
          customer_phone: formData.phone,
          delivery_address: formData.address,
          city: formData.city,
          region: formData.region,
          items_count: cart.length,
          subtotal: cartSubtotal,
          delivery_fee: deliveryFee,
        }
      })

      console.log('[Checkout] Paystack payment initialized, redirecting to payment page')
      setPaymentStep('payment')

      // Redirect to Paystack payment page
      if (typeof window !== 'undefined' && (window as any).PaystackPop) {
        ;(window as any).PaystackPop.resumeTransaction(paymentInit.data.reference)
      } else {
        // Fallback: redirect to authorization URL
        window.location.href = paymentInit.data.authorization_url
      }
    } catch (error: any) {
      console.error('[Checkout] Payment initialization failed:', error)
      alert(`Payment initialization failed: ${error.message}`)
      setIsSubmitting(false)
    }
  }

  const handlePaymentVerification = async () => {
    if (!paymentReference) {
      alert('Payment reference not found')
      return
    }

    setPaymentStep('verifying')
    setIsSubmitting(true)

    try {
      console.log('[Checkout] Verifying payment with reference:', paymentReference)

      // Verify payment with Paystack
      const verification = await verifyPayment(paymentReference)

      if (verification.status && verification.data.status === 'success') {
        console.log('[Checkout] Payment verified successfully')

        // Create order with payment details
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
          payment_status: 'paid' as const,
          payment_method: 'paystack',
          paystack_reference: paymentReference,
          amount_paid: verification.data.amount / 100, // Convert from kobo
          payment_date: new Date().toISOString(),
        }

        let result;
        if (user) {
          console.log('[Checkout] Creating order for authenticated user')
          result = await createOrder({
            ...orderPayload,
            user_id: user.id
          })

          // Save customer profile
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
          }
        } else if (GUEST_CHECKOUT_ENABLED) {
          console.log('[Checkout] Creating guest order')
          result = await createGuestOrder(orderPayload)
        } else {
          throw new Error('Guest checkout is disabled. Please log in to place an order.')
        }

        console.log('[Checkout] Order created successfully:', result.id)
        clearCart()
        alert('Payment successful! Your order has been placed.')
        navigate('/')
      } else {
        throw new Error('Payment was not successful. Please try again.')
      }
    } catch (error: any) {
      console.error('[Checkout] Payment verification failed:', error)
      alert(`Payment verification failed: ${error.message}`)
      setPaymentStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-form-section">
          {paymentStep === 'form' && (
            <>
              <h2>Customer Information</h2>
              <form onSubmit={handleFormSubmit} className="checkout-form">
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
                  {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </form>
            </>
          )}

          {paymentStep === 'payment' && (
            <div className="payment-processing">
              <h2>Processing Payment</h2>
              <p>You will be redirected to Paystack to complete your payment.</p>
              <p>If you are not redirected, click the button below:</p>
              <button className="submit-order-btn" onClick={handlePaymentVerification}>
                Verify Payment
              </button>
            </div>
          )}

          {paymentStep === 'verifying' && (
            <div className="payment-verifying">
              <h2>Verifying Payment</h2>
              <p>Please wait while we verify your payment...</p>
            </div>
          )}
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
          {paymentStep === 'form' && (
            <button className="back-to-products" onClick={() => navigate('/products')}>
              &larr; Back to Products
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
