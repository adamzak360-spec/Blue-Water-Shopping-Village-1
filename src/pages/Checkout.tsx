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
} from '../services/paystackService'
import { formatCurrency } from '../utils/currency'
import { getDeliveryMethodsForBusiness, getProductDeliveryMethods, DELIVERY_CONTROL_MODE, type DeliveryMethod } from '../services/deliveryService'
import { getProductById } from '../services/productService'
import './Checkout.css'

const GUEST_CHECKOUT_ENABLED = true

// Default marketplace business (multi-tenant foundation migration)
const DEFAULT_BUSINESS_ID = '00000000-0000-0000-0000-000000000001'

export default function Checkout() {
  const { cart, cartSubtotal, clearCart } = useCart()
  const { user, isLoading: authLoading } = useAuth()
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
    notes: '',
    deliveryMethod: ''
  })
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryMethod[]>([])
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState('')
  const [resolvedBusinessIds, setResolvedBusinessIds] = useState<Record<string, string>>({})
  const [businessResolutionPending, setBusinessResolutionPending] = useState(false)

  useEffect(() => {
    let isMounted = true
    const missingProductIds = Array.from(new Set(
      cart
        .filter(item => !item.business_id && !resolvedBusinessIds[item.id])
        .map(item => item.id),
    ))

    if (missingProductIds.length === 0) {
      setBusinessResolutionPending(false)
      return () => { isMounted = false }
    }

    setBusinessResolutionPending(true)
    Promise.all(missingProductIds.map(async productId => {
      try {
        const product = await getProductById(productId)
        // A successfully loaded legacy marketplace product may still have no
        // owner; only that case can safely use the marketplace business. A
        // lookup error must remain unresolved rather than silently becoming
        // the global GH₵15 delivery method.
        return [productId, product ? (product.business_id || DEFAULT_BUSINESS_ID) : ''] as const
      } catch {
        return [productId, ''] as const
      }
    })).then(entries => {
      if (!isMounted) return
      setResolvedBusinessIds(previous => ({
        ...previous,
        ...Object.fromEntries(entries.filter(([, businessId]) => Boolean(businessId))),
      }))
      setBusinessResolutionPending(false)
    })

    return () => { isMounted = false }
  }, [cart, resolvedBusinessIds])

  const getCartBusinessId = (item: typeof cart[number]) =>
    item.business_id || resolvedBusinessIds[item.id] || ''
  const totalItemQuantity = cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartBusinessIds = Array.from(new Set(cart.map(getCartBusinessId).filter(Boolean)))
  const unresolvedBusinessItems = cart.some(item => !getCartBusinessId(item))
  const checkoutBusinessId = cartBusinessIds.length === 1 && !unresolvedBusinessItems ? cartBusinessIds[0] : undefined
  const cartStoreGroups = Array.from(
    cart.reduce((groups, item) => {
      const storeKey = getCartBusinessId(item)
      const group = groups.get(storeKey) || []
      group.push(item)
      groups.set(storeKey, group)
      return groups
    }, new Map<string, typeof cart>()).entries()
  )
  const hasMultipleStores = cartStoreGroups.length > 1
  const selectedDeliveryMethod = deliveryOptions.find(method => method.id === formData.deliveryMethod)
  const deliveryFee = selectedDeliveryMethod
    ? selectedDeliveryMethod.price * (selectedDeliveryMethod.pricing_type === 'per_item' ? totalItemQuantity : 1)
    : 0
  const total = cartSubtotal + deliveryFee

  useEffect(() => {
    let isMounted = true
    const loadDeliveryOptions = async () => {
      if (cart.length === 0 || businessResolutionPending || unresolvedBusinessItems || hasMultipleStores) {
        setDeliveryOptions([])
        setFormData(previous => ({ ...previous, deliveryMethod: '' }))
        return
      }

      setDeliveryLoading(true)
      setDeliveryError('')
      try {
        let options = await getDeliveryMethodsForBusiness(
          checkoutBusinessId,
          undefined,
          cart[0]?.currency || 'GHS',
        )

        // In seller-managed mode, product-level seller fees are the fallback
        // when the seller has not created rows in delivery_methods. This keeps
        // valid seller fees from silently becoming GH₵0.00 after global rules
        // are removed. Marketplace mode intentionally skips this fallback.
        if (DELIVERY_CONTROL_MODE === 'SELLER' && options.length === 0) {
          options = cart.flatMap(item => getProductDeliveryMethods(item))
            .filter((option, index, all) => all.findIndex(candidate => candidate.name === option.name && candidate.price === option.price) === index)
        }

        if (!isMounted) return
        setDeliveryOptions(options)
        setFormData(previous => ({
          ...previous,
          deliveryMethod: options.some(option => option.id === previous.deliveryMethod)
            ? previous.deliveryMethod
            : options[0]?.id || '',
        }))
      } catch (error) {
        if (!isMounted) return
        setDeliveryOptions([])
        setDeliveryError(error instanceof Error ? error.message : 'Delivery options could not be loaded.')
      } finally {
        if (isMounted) setDeliveryLoading(false)
      }
    }

    loadDeliveryOptions()
    return () => { isMounted = false }
  }, [checkoutBusinessId, cart[0]?.currency, cart.length, businessResolutionPending, unresolvedBusinessItems, hasMultipleStores])

  // Load Paystack script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.async = true
    document.body.appendChild(script)

    // Check for persisted checkout state after redirect
    const persistedState = localStorage.getItem('checkout_state')
    if (persistedState) {
      try {
        const { reference, formData: savedFormData, timestamp } = JSON.parse(persistedState)
        // Only restore if it's recent (e.g., last 30 minutes)
        if (Date.now() - timestamp < 30 * 60 * 1000) {
          setPaymentReference(reference)
          setFormData(savedFormData)
          setPaymentStep('payment')
        } else {
          localStorage.removeItem('checkout_state')
        }
      } catch (e) {
        console.error('Error restoring checkout state:', e)
      }
    }

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

  if (!authLoading && !user) {
    return (
      <div className="checkout-page account-required-checkout">
        <div className="page-container">
          <div className="account-required-card">
            <h2>Create a customer account to continue.</h2>
            <p>Sign in or create an account to keep your order history, delivery details, and notifications together.</p>
            <div className="account-required-actions">
              <button className="btn-primary" onClick={() => navigate(`/register?redirect=${encodeURIComponent('/checkout')}`)}>Create Customer Account</button>
              <button className="btn-secondary" onClick={() => navigate(`/login?redirect=${encodeURIComponent('/checkout')}`)}>Login</button>
            </div>
          </div>
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

      if (businessResolutionPending || unresolvedBusinessItems) {
        throw new Error('We are still identifying the store for one or more cart items. Please wait a moment and try again.')
      }

      if (hasMultipleStores || !checkoutBusinessId) {
        throw new Error('Your cart contains products from multiple stores. Please checkout one store at a time.')
      }
      
      // Initialize payment with Paystack
      const reference = generatePaymentReference()
      setPaymentReference(reference)

      console.log('[Checkout] Initializing Paystack payment with reference:', reference)

      // Get currency from the first item (or default to GHS)
        const currency = cart[0]?.currency || 'GHS'

      const paymentInit = await initializePayment({
        email: formData.email,
        amount: Math.round(total * 100), // Convert to kobo
        currency: currency,
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
          delivery_method: selectedDeliveryMethod?.name || undefined,
          delivery_area: selectedDeliveryMethod?.coverage_area || undefined,
          delivery_currency: selectedDeliveryMethod?.currency_code || currency,
          paystack_public_key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
          payment_provider: 'paystack',
          payment_country: 'GH',
          payment_currency: currency,
        }
      })

      // Persist state before redirecting
      localStorage.setItem('checkout_state', JSON.stringify({
        reference,
        formData,
        timestamp: Date.now()
      }))

      console.log('[Checkout] Paystack payment initialized, redirecting to payment page')
      setPaymentStep('payment')

      // Redirect to Paystack payment page using the authorization URL
      // This is the most reliable method for both mobile and desktop
      window.location.href = paymentInit.data.authorization_url
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
      
      // Verify payment with Paystack. A successful API response does not
      // necessarily mean the transaction itself succeeded; Paystack keeps
      // the transaction state in verification.data.status.
      const verification = await verifyPayment(paymentReference)
      const transactionStatus = String(verification.data?.status || '').toLowerCase()
      const explicitFailureStatuses = new Set(['failed', 'abandoned', 'reversed'])

      const expectedAmountInKobo = Math.round(total * 100)
      const verifiedReference = verification.data?.reference
      const verifiedAmount = verification.data?.amount

      if (
        verification.status &&
        verification.data.status === 'success' &&
        verifiedReference === paymentReference &&
        verifiedAmount >= expectedAmountInKobo
      ) {
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
          delivery_method: selectedDeliveryMethod?.name || undefined,
          delivery_area: selectedDeliveryMethod?.coverage_area || undefined,
          currency: cart[0]?.currency || 'GHS',
          total: total,
          status: 'pending' as const,
          payment_status: 'paid' as const,
          payment_method: 'paystack',
          paystack_reference: paymentReference,
          payment_provider: 'paystack',
          provider_reference: paymentReference,
          provider_transaction_id: verification.data.id.toString(),
          payment_metadata: {
            international_payments_enabled: true,
            settlement_currency: String(verification.data.currency || cart[0]?.currency || 'GHS').toUpperCase(),
          },
          business_id: checkoutBusinessId,
          source: 'ONLINE',
          amount_paid: verification.data.amount / 100, // Convert from kobo
          payment_date: new Date().toISOString(),
          paid_at: verification.data.paid_at,
          transaction_id: verification.data.id.toString(),
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
        
        localStorage.removeItem('checkout_state')
        clearCart()
        alert('Payment successful! Your order has been placed. A confirmation email has been sent.')
        
        if (user) {
          navigate('/customer/orders')
        } else {
          // For guests, navigate to home or a success page since they can't access /customer/orders
          navigate('/')
        }
      } else if (verification.data?.reference !== paymentReference) {
        throw new Error('Payment reference mismatch. Please contact support before retrying.')
      } else if ((verification.data?.amount || 0) < expectedAmountInKobo) {
        throw new Error('The verified payment amount does not cover this order total.')
      } else if (explicitFailureStatuses.has(transactionStatus)) {
        throw new Error(`PAYMENT_EXPLICIT_FAILURE:${transactionStatus}`)
      } else {
        // `pending`, `ongoing`, `processing`, `queued`, API/reference errors,
        // and amount mismatches must remain recoverable. A customer may have
        // been debited even when the browser could not complete verification.
        throw new Error(`PAYMENT_PENDING:${transactionStatus || 'verification_unavailable'}`)
      }
    } catch (error: any) {
      console.error('[Checkout] Payment verification failed:', error)

      const rawMessage = String(error?.message || '')
      const isExplicitPaymentFailure = rawMessage.startsWith('PAYMENT_EXPLICIT_FAILURE:')
      const paymentFailureReason = rawMessage.replace(/^PAYMENT_(?:EXPLICIT_FAILURE|PENDING):?/, '').trim()
      const orderStatus = isExplicitPaymentFailure ? 'cancelled' as const : 'pending' as const
      const paymentStatus = isExplicitPaymentFailure ? 'failed' as const : 'pending' as const
      const customerMessage = isExplicitPaymentFailure
        ? 'Paystack reported that this payment failed. No successful order was created.'
        : 'Payment verification is still pending. Your order was saved for verification; please do not pay again until the status is checked.'
      
      // Record the attempt without treating an unavailable or in-progress
      // verification as a failed payment. This prevents a real debit from
      // being shown as cancelled while Paystack is still settling it.
      if (paymentReference && formData.email) {
        try {
          const failedPayload = {
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
            status: orderStatus,
            payment_status: paymentStatus,
            payment_method: 'paystack',
            paystack_reference: paymentReference,
            payment_provider: 'paystack',
            provider_reference: paymentReference,
            payment_metadata: {
              payment_attempt_status: isExplicitPaymentFailure ? 'failed' : 'pending_verification',
              paystack_transaction_status: paymentFailureReason || null,
              verification_required: !isExplicitPaymentFailure,
              international_payments_enabled: true,
            },
            business_id: checkoutBusinessId,
            source: 'ONLINE',
          }
          
          if (user) {
            await createOrder({ ...failedPayload, user_id: user.id })
          } else if (GUEST_CHECKOUT_ENABLED) {
            await createGuestOrder(failedPayload)
          }
        } catch (err) {
          console.error('[Checkout] Failed to record failed payment:', err)
        }
      }
      
      alert(customerMessage)
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
              <div className={`checkout-store-status ${hasMultipleStores ? 'multiple' : 'single'}`} role="status">
                <strong>{hasMultipleStores ? 'Multiple stores in this cart' : 'Single-store checkout'}</strong>
                {hasMultipleStores ? (
                  <>
                    <span>Your cart contains items from {cartStoreGroups.length} stores.</span>
                    <span>For accurate delivery, payment, and seller processing, checkout one store at a time. Return to the cart and remove the other stores before proceeding.</span>
                  </>
                ) : (
                  <span>All items below will be processed together under one store order.</span>
                )}
                <div className="checkout-store-list">
                  {cartStoreGroups.map(([storeKey, storeItems], index) => (
                    <div key={storeKey} className="checkout-store-row">
                      <span>Store {index + 1}: {storeKey === DEFAULT_BUSINESS_ID ? 'Reliable Marketplace' : `Store ID ${storeKey.slice(0, 8)}…`}</span>
                      <span>{storeItems.reduce((sum, item) => sum + item.quantity, 0)} item(s)</span>
                    </div>
                  ))}
                </div>
              </div>
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
                    placeholder="Tamale"
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
                    placeholder="Northern Region"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="deliveryMethod">Delivery Method *</label>
                  {deliveryLoading ? (
                    <p className="delivery-loading-message">Loading delivery options...</p>
                  ) : deliveryOptions.length === 0 ? (
                    <p className="delivery-empty-message">
                      {businessResolutionPending || unresolvedBusinessItems
                        ? 'Identifying the seller delivery settings...'
                        : hasMultipleStores
                          ? 'Checkout one store at a time so the correct seller delivery fee can be applied.'
                          : DELIVERY_CONTROL_MODE === 'MARKETPLACE'
                            ? 'Marketplace delivery is active, but no administrator delivery method is available.'
                            : 'The seller has not configured a delivery fee for this product or store. Please contact the seller.'}
                    </p>
                  ) : (
                    <select
                      id="deliveryMethod"
                      name="deliveryMethod"
                      required
                      value={formData.deliveryMethod}
                      onChange={(e) => setFormData({ ...formData, deliveryMethod: e.target.value })}
                      className="delivery-method-select"
                    >
                      {deliveryOptions.map(method => {
                        const methodFee = method.price * (method.pricing_type === 'per_item' ? totalItemQuantity : 1)
                        return (
                          <option key={method.id} value={method.id}>
                            {method.name} — {method.coverage_area} — {formatCurrency(methodFee, method.currency_code)}{method.estimated_days ? ` (${method.estimated_days})` : ''}
                          </option>
                        )
                      })}
                    </select>
                  )}
                  {deliveryError && <small className="delivery-error-message">{deliveryError}</small>}
                </div>
                {selectedDeliveryMethod && (
                  <div className="delivery-info-box">
                    <p><strong>Selected Delivery:</strong> {selectedDeliveryMethod.name}</p>
                    <p><strong>Coverage Area:</strong> {selectedDeliveryMethod.coverage_area}</p>
                    <p><strong>Estimated Delivery:</strong> {selectedDeliveryMethod.estimated_days || 'To be confirmed'}</p>
                    <p><strong>Delivery Fee:</strong> {formatCurrency(deliveryFee, selectedDeliveryMethod.currency_code)}</p>
                  </div>
                )}
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
                <button type="submit" className="submit-order-btn" disabled={isSubmitting || businessResolutionPending || unresolvedBusinessItems || hasMultipleStores || deliveryLoading || deliveryOptions.length === 0 || !formData.deliveryMethod}>
                  {isSubmitting ? 'Processing...' : 'Proceed to Payment'}
                </button>
              </form>
              
              <div className="checkout-help-section">
                <p>Need help with your order?</p>
                <a href="tel:+233595609966" className="checkout-call-btn">
                  📞 Call us: +233 59 560 9966
                </a>
              </div>
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
              {cart.map((item, index) => (
                <div key={`${item.id}-${item.selected_size || index}`} className="summary-item">
                  <div className="summary-item-info">
                    <span className="summary-item-name">{item.name}</span>
                    {item.selected_size && (
                      <span className="summary-item-variant">Size: {item.selected_size}</span>
                    )}
                    <span className="summary-item-qty">x {item.quantity}</span>
                  </div>
                  <span className="summary-item-price">{formatCurrency(item.price * item.quantity, item.currency || 'GHS')}</span>
                </div>
              ))}
            </div>
            <div className="summary-totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatCurrency(cartSubtotal, cart[0]?.currency || 'GHS')}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{formatCurrency(deliveryFee, cart[0]?.currency || 'GHS')}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatCurrency(total, cart[0]?.currency || 'GHS')}</span>
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
