import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  confirmPOSSubscription,
  generatePaymentReference,
  initializePayment,
  verifyPayment,
} from '../services/paystackService'
import { supabase } from '../supabaseClient'
import { getAllProducts } from '../services/productService'
import { createOrder } from '../services/orderService'
import type { Product, Order } from '../types'
import { formatCurrency } from '../utils/currency'
import { CreditCard, Plus, Minus, Trash2, Printer, X, Search } from 'lucide-react'
import './POS.css'

interface CartItem {
  product: Product
  quantity: number
  selected_size?: string
}

interface POSState {
  cartItems: CartItem[]
  products: Product[]
  isLoading: boolean
  error: string
  searchTerm: string
  selectedCategory: string
  showReceipt: boolean
  lastOrder: Order | null
  customerName: string
  customerPhone: string
  customerEmail: string
  paymentMethod: 'cash' | 'card' | 'mobile'
  amountPaid: number
  isSubscribed: boolean
  subscriptionChecked: boolean
  businessCountry: string
  businessCurrency: string
  subscriptionPrice: { price: number; currency: string } | null
  subscriptionExpiresAt: string | null
}

export default function POS({ businessIds }: { businessIds?: string[] } = {}) {
  const [state, setState] = useState<POSState>({
    cartItems: [],
    products: [],
    isLoading: true,
    error: '',
    searchTerm: '',
    selectedCategory: '',
    showReceipt: false,
    lastOrder: null,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: 'cash',
    amountPaid: 0,
    isSubscribed: false,
    subscriptionChecked: false,
    businessCountry: 'GH',
    businessCurrency: 'GHS',
    subscriptionPrice: null,
    subscriptionExpiresAt: null,
  })
  const { user, session } = useAuth()

  // Fetch products and check subscription on mount
  useEffect(() => {
    const initPOS = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: '' }))
        
        // 1. Check Subscription if seller
        if (businessIds !== undefined) {
          if (businessIds.length === 0) {
            setState(prev => ({
              ...prev,
              subscriptionChecked: true,
              isSubscribed: false,
              isLoading: false,
              error: 'No seller business is available for POS access.',
            }))
            return
          }

          const { data: bizData, error: businessError } = await supabase!
            .from('businesses')
            .select('pos_subscription_active, pos_subscription_expires_at, country_code, currency_code')
            .eq('id', businessIds[0])
            .single();

          if (businessError) throw businessError
          if (bizData) {
            const subscriptionExpiresAt = bizData.pos_subscription_expires_at || null;
            const isSubscribed = Boolean(
              bizData.pos_subscription_active &&
              subscriptionExpiresAt &&
              new Date(subscriptionExpiresAt).getTime() > Date.now(),
            );
            const country = bizData.country_code || 'GH';
            const currency = bizData.currency_code || 'GHS';
            
            // Fetch subscription price for the country
            const { data: planData } = await supabase!
              .from('pos_subscription_plans')
              .select('monthly_price, currency_code')
              .eq('country_code', country)
              .single();

            setState(prev => ({ 
              ...prev, 
              isSubscribed, 
              subscriptionChecked: true, 
              businessCountry: country,
              businessCurrency: currency,
              subscriptionPrice: planData ? { price: Number(planData.monthly_price), currency: planData.currency_code } : null,
              subscriptionExpiresAt,
            }));

            if (!isSubscribed) {
              setState(prev => ({ ...prev, isLoading: false }));
              return; // Stop loading products if not subscribed
            }
          }
        } else {
          // Admin or internal use
          setState(prev => ({ ...prev, isSubscribed: true, subscriptionChecked: true }));
        }

        // 2. Fetch products
        const products = await getAllProducts()
        const scopedProducts =
          businessIds && businessIds.length > 0
            ? products.filter(p => businessIds.includes(p.business_id || ''))
            : products
        setState(prev => ({ ...prev, products: scopedProducts, isLoading: false }))
      } catch (err) {
        setState(prev => ({
          ...prev,
          error: 'Failed to initialize POS',
          isLoading: false,
        }))
      }
    }
    initPOS()
  }, [businessIds])

  // A Paystack hosted checkout returns to the app with the pending reference
  // preserved in localStorage. Verify and activate only after Paystack reports a
  // successful transaction; never trust the redirect alone.
  useEffect(() => {
    const pendingPayment = localStorage.getItem('pos_subscription_pending')
    if (!pendingPayment || !businessIds?.[0] || !session?.access_token || state.isSubscribed) return

    let cancelled = false
    const verifyPendingSubscription = async () => {
      try {
        const pending = JSON.parse(pendingPayment) as {
          businessId: string
          reference: string
          amountMinor: number
          currency: string
          timestamp: number
        }

        if (
          pending.businessId !== businessIds[0] ||
          !pending.reference ||
          Date.now() - pending.timestamp > 30 * 60 * 1000
        ) {
          localStorage.removeItem('pos_subscription_pending')
          return
        }

        setState(prev => ({ ...prev, isLoading: true, error: '' }))
        const verification = await verifyPayment(pending.reference)
        const verifiedAmount = Number(verification.data?.amount || 0)
        const verifiedCurrency = String((verification.data as any)?.currency || pending.currency).toUpperCase()
        if (
          !verification.status ||
          verification.data?.status !== 'success' ||
          verification.data?.reference !== pending.reference ||
          verifiedAmount !== pending.amountMinor ||
          verifiedCurrency !== pending.currency
        ) {
          throw new Error('Payment was not successful or did not match the subscription amount.')
        }

        const confirmation = await confirmPOSSubscription(
          {
            business_id: pending.businessId,
            reference: pending.reference,
            expected_amount_minor: pending.amountMinor,
            currency: pending.currency,
          },
          session.access_token,
        )

        if (cancelled) return
        localStorage.removeItem('pos_subscription_pending')
        setState(prev => ({
          ...prev,
          isSubscribed: confirmation.data.pos_subscription_active && new Date(confirmation.data.pos_subscription_expires_at).getTime() > Date.now(),
          subscriptionChecked: true,
          subscriptionExpiresAt: confirmation.data.pos_subscription_expires_at,
          isLoading: false,
          error: '',
        }))
      } catch (error: any) {
        if (cancelled) return
        localStorage.removeItem('pos_subscription_pending')
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message || 'Payment could not be verified. Please try again.',
        }))
      }
    }

    verifyPendingSubscription()
    return () => { cancelled = true }
  }, [businessIds, session?.access_token, state.isSubscribed])

  // Filter products based on search and category
  const filteredProducts = state.products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(state.searchTerm.toLowerCase())
    const matchesCategory = !state.selectedCategory || product.category === state.selectedCategory
    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(state.products.map(p => p.category)))

  // Calculate totals
  const subtotal = state.cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  const deliveryFee = 0 // POS orders don't have delivery fees
  const total = subtotal + deliveryFee

  // Add product to cart
  const addToCart = (product: Product) => {
    setState(prev => {
      const existingItem = prev.cartItems.find(item => item.product.id === product.id)
      if (existingItem) {
        return {
          ...prev,
          cartItems: prev.cartItems.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        }
      }
      return {
        ...prev,
        cartItems: [...prev.cartItems, { product, quantity: 1 }],
      }
    })
  }

  // Update quantity
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId)
      return
    }
    setState(prev => ({
      ...prev,
      cartItems: prev.cartItems.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      ),
    }))
  }

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setState(prev => ({
      ...prev,
      cartItems: prev.cartItems.filter(item => item.product.id !== productId),
    }))
  }

  // Process payment and create order
  const processPayment = async () => {
    if (!state.customerName.trim()) {
      setState(prev => ({ ...prev, error: 'Customer name is required' }))
      return
    }

    if (state.cartItems.length === 0) {
      setState(prev => ({ ...prev, error: 'Cart is empty' }))
      return
    }

    if (state.amountPaid < total) {
      setState(prev => ({ ...prev, error: 'Insufficient payment amount' }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: '' }))

      const orderData = {
        customer_name: state.customerName,
        customer_phone: state.customerPhone,
        customer_email: state.customerEmail,
        delivery_address: 'POS - In Store', // POS orders are in-store
        city: 'POS',
        region: 'POS',
        notes: `Payment Method: ${state.paymentMethod}`,
        items: state.cartItems.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          image_url: item.product.image_url,
          category: item.product.category,
          status: item.product.status,
          selected_size: item.selected_size || null,
        })),
        subtotal,
        delivery_fee: 0,
        total,
        status: 'delivered' as const, // POS orders are completed immediately
        payment_status: 'paid' as const,
        payment_method: state.paymentMethod,
        source: 'POS', // Mark as POS order
        // Sellers' POS orders are tagged with their own store so dashboard
        // data stays scoped to the seller's businesses
        business_id: businessIds && businessIds.length === 1 ? businessIds[0] : undefined,
      }

      const order = await createOrder(orderData as any)

      setState(prev => ({
        ...prev,
        lastOrder: order,
        showReceipt: true,
        cartItems: [],
        customerName: '',
        customerPhone: '',
        customerEmail: '',
        amountPaid: 0,
        isLoading: false,
        error: '',
      }))
    } catch (err: any) {
      console.error('POS Payment Error:', err)
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to process payment',
        isLoading: false,
      }))
    }
  }

  // Print receipt
  const printReceipt = () => {
    if (!state.lastOrder) return
    window.print()
  }

  // Close receipt modal
  const closeReceipt = () => {
    setState(prev => ({
      ...prev,
      showReceipt: false,
      lastOrder: null,
    }))
  }

  const handleSubscribe = async () => {
    const businessId = businessIds?.[0]
    const email = user?.email
    const plan = state.subscriptionPrice

    if (!businessId) {
      setState(prev => ({ ...prev, error: 'No seller business was found for this account.' }))
      return
    }
    if (!email) {
      setState(prev => ({ ...prev, error: 'Please sign in with an email address before subscribing.' }))
      return
    }
    if (!session?.access_token) {
      setState(prev => ({ ...prev, error: 'Your session has expired. Please sign in again before subscribing.' }))
      return
    }
    if (!plan || !plan.currency || !Number.isFinite(plan.price) || plan.price <= 0) {
      setState(prev => ({ ...prev, error: 'A valid POS subscription plan is not configured for this country.' }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: '' }))
      const reference = generatePaymentReference()
      const amountMinor = Math.round(plan.price * 100)
      const currency = plan.currency.toUpperCase()
      const callbackUrl = `${window.location.origin}/dashboard?view=pos`

      const paymentInit = await initializePayment({
        email,
        amount: amountMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          type: 'pos_subscription',
          business_id: businessId,
          country_code: state.businessCountry,
          currency,
          billing_interval: 'monthly',
        },
      }, session.access_token)

      localStorage.setItem('pos_subscription_pending', JSON.stringify({
        businessId,
        reference,
        amountMinor,
        currency,
        timestamp: Date.now(),
      }))

      if (!paymentInit.data?.authorization_url) {
        throw new Error('Paystack did not return a payment link.')
      }

      window.location.assign(paymentInit.data.authorization_url)
    } catch (err: any) {
      localStorage.removeItem('pos_subscription_pending')
      setState(prev => ({
        ...prev,
        error: err.message || 'Unable to start the subscription payment.',
        isLoading: false,
      }))
    }
  }

  if (state.subscriptionChecked && !state.isSubscribed) {
    return (
      <div className="pos-container">
        <div className="pos-subscription-wall">
          <div className="subscription-card">
            <div className="subscription-icon" aria-hidden="true"><CreditCard size={42} strokeWidth={1.8} /></div>
            <h2>Unlock POS System</h2>
            <p>The Reliable POS system allows you to manage in-store sales, issue receipts, and sync inventory automatically.</p>
            {state.error && <div className="pos-error" role="alert">{state.error}</div>}
            {state.subscriptionPrice ? (
              <div className="price-tag">
                <span className="amount">{formatCurrency(state.subscriptionPrice.price, state.subscriptionPrice.currency)}</span>
                <span className="period">/ month</span>
              </div>
            ) : (
              <p>Subscription required to continue.</p>
            )}
            <button className="pos-subscribe-btn" onClick={handleSubscribe} disabled={state.isLoading}>
              {state.isLoading ? 'Processing...' : 'Subscribe Now'}
            </button>
            <p className="subscription-note">Secure monthly billing. Access opens only after Paystack confirms your payment.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pos-container">
      <div className="pos-header no-print">
        <h1>Point of Sale (POS)</h1>
        <p>Manage in-store transactions</p>
      </div>

      <div className="pos-layout">
        {/* Products Section */}
        <div className="pos-products-section">
          <div className="pos-search-bar">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={state.searchTerm}
              onChange={(e) => setState(prev => ({ ...prev, searchTerm: e.target.value }))}
            />
          </div>

          <div className="pos-categories">
            <button
              className={`category-btn ${!state.selectedCategory ? 'active' : ''}`}
              onClick={() => setState(prev => ({ ...prev, selectedCategory: '' }))}
            >
              All
            </button>
            {categories.map(category => (
              <button
                key={category}
                className={`category-btn ${state.selectedCategory === category ? 'active' : ''}`}
                onClick={() => setState(prev => ({ ...prev, selectedCategory: category }))}
              >
                {category}
              </button>
            ))}
          </div>

          {state.isLoading ? (
            <div className="pos-loading">Loading products...</div>
          ) : (
            <div className="pos-products-grid">
              {filteredProducts.map(product => (
                <div key={product.id} className="pos-product-card">
                  <img src={product.image_url} alt={product.name} />
                  <h3>{product.name}</h3>
                  <p className="pos-price">{formatCurrency(product.price, product.currency || state.businessCurrency)}</p>
                  <p className="pos-stock">Stock: {product.stock_quantity}</p>
                  <button
                    className="pos-add-btn"
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity <= 0}
                  >
                    <Plus size={18} /> Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="pos-cart-section">
          <h2>Cart</h2>

          {state.error && <div className="pos-error">{state.error}</div>}

          <div className="pos-customer-info">
            <input
              type="text"
              placeholder="Customer Name *"
              value={state.customerName}
              onChange={(e) => setState(prev => ({ ...prev, customerName: e.target.value }))}
            />
            <input
              type="tel"
              placeholder="Phone (optional)"
              value={state.customerPhone}
              onChange={(e) => setState(prev => ({ ...prev, customerPhone: e.target.value }))}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={state.customerEmail}
              onChange={(e) => setState(prev => ({ ...prev, customerEmail: e.target.value }))}
            />
          </div>

          <div className="pos-cart-items">
            {state.cartItems.length === 0 ? (
              <p className="pos-empty-cart">Cart is empty</p>
            ) : (
              state.cartItems.map(item => (
                <div key={item.product.id} className="pos-cart-item">
                  <div className="pos-item-info">
                    <h4>{item.product.name}</h4>
                    <p>{formatCurrency(item.product.price, item.product.currency || state.businessCurrency)} each</p>
                  </div>
                  <div className="pos-item-controls">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                    />
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="pos-item-total">
                    {formatCurrency(item.product.price * item.quantity, item.product.currency || state.businessCurrency)}
                  </div>
                  <button
                    className="pos-remove-btn"
                    onClick={() => removeFromCart(item.product.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pos-totals">
            <div className="pos-total-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal, state.businessCurrency)}</span>
            </div>
            <div className="pos-total-row">
              <span>Delivery:</span>
              <span>{formatCurrency(deliveryFee)}</span>
            </div>
            <div className="pos-total-row pos-grand-total">
              <span>Total:</span>
              <span>{formatCurrency(total, state.businessCurrency)}</span>
            </div>
          </div>

          <div className="pos-payment-section">
            <label>Payment Method:</label>
            <select
              value={state.paymentMethod}
              onChange={(e) => setState(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="mobile">Mobile Money</option>
            </select>

            <label>Amount Paid:</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={state.amountPaid}
              onChange={(e) => setState(prev => ({ ...prev, amountPaid: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />

            {state.amountPaid > 0 && (
              <div className="pos-change">
                Change: {formatCurrency(Math.max(0, state.amountPaid - total))}
              </div>
            )}
          </div>

          <button
            className="pos-checkout-btn"
            onClick={processPayment}
            disabled={state.cartItems.length === 0 || state.isLoading}
          >
            {state.isLoading ? 'Processing...' : 'Complete Sale & Issue Receipt'}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {state.showReceipt && state.lastOrder && (
        <div className="pos-receipt-modal">
          <div className="pos-receipt-content">
            <button className="pos-close-receipt no-print" onClick={closeReceipt}>
              <X size={24} />
            </button>

            <div className="pos-receipt-print" id="pos-receipt">
              <div className="receipt-header">
                <h2>RELIABLE</h2>
                <p>Premium Marketplace</p>
                <p className="pos-receipt-date">{state.lastOrder.created_at ? new Date(state.lastOrder.created_at).toLocaleString() : new Date().toLocaleString()}</p>
              </div>

              <div className="pos-receipt-customer">
                <p><strong>Customer:</strong> {state.lastOrder.customer_name}</p>
                {state.lastOrder.customer_phone && <p><strong>Phone:</strong> {state.lastOrder.customer_phone}</p>}
                {state.lastOrder.customer_email && <p><strong>Email:</strong> {state.lastOrder.customer_email}</p>}
              </div>

              <table className="pos-receipt-items">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {state.lastOrder.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td>{item.name} {item.selected_size ? `(${item.selected_size})` : ''}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right">{formatCurrency(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pos-receipt-totals">
                <div className="receipt-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(state.lastOrder.subtotal)}</span>
                </div>
                <div className="receipt-row receipt-grand-total">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(state.lastOrder.total)}</span>
                </div>
                <div className="receipt-row">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(state.amountPaid || state.lastOrder.total)}</span>
                </div>
                {(state.amountPaid > state.lastOrder.total) && (
                  <div className="receipt-row">
                    <span>Change:</span>
                    <span>{formatCurrency(state.amountPaid - state.lastOrder.total)}</span>
                  </div>
                )}
              </div>

              <div className="pos-receipt-footer">
                <p>Payment Method: {state.lastOrder.payment_method?.toUpperCase()}</p>
                <p>Thank you for your business!</p>
                <p className="order-id">Order ID: {state.lastOrder.id?.slice(0, 8)}</p>
              </div>
            </div>

            <button className="pos-print-btn no-print" onClick={printReceipt}>
              <Printer size={20} /> Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
