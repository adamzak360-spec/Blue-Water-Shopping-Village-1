import React from 'react'
import { useNavigate } from 'react-router-dom'
import { PhoneCall, ShoppingCart, ShieldCheck, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatCurrency } from '../utils/currency'
import './CartSidebar.css'

export const CartSidebar: React.FC = () => {
  const { cart, removeFromCart, updateQuantity, cartSubtotal, isCartOpen, setIsCartOpen, clearCart } = useCart()
  const navigate = useNavigate()

  const cartGroups = Array.from(
    cart.reduce((groups, item) => {
      const storeKey = item.business_id || 'marketplace'
      const group = groups.get(storeKey) || []
      group.push(item)
      groups.set(storeKey, group)
      return groups
    }, new Map<string, typeof cart>()).entries()
  )
  const hasMultipleStores = cartGroups.length > 1
  const itemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const currency = cart[0]?.currency || 'GHS'

  if (!isCartOpen) return null

  const handleCheckout = () => {
    setIsCartOpen(false)
    navigate('/checkout')
  }

  return (
    <div className="cart-sidebar-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <div className="cart-brand-lockup">
            <span className="cart-brand-mark"><ShoppingCart size={21} strokeWidth={2.4} /></span>
            <div>
              <p className="cart-eyebrow">Reliable Marketplace</p>
              <h2>Shopping Cart</h2>
            </div>
          </div>
          <button className="close-btn" onClick={() => setIsCartOpen(false)} aria-label="Close cart">&times;</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart-message">
              <span className="empty-cart-icon"><ShoppingCart size={34} /></span>
              <p>Your cart is empty</p>
              <button className="continue-btn" onClick={() => setIsCartOpen(false)}>Continue Shopping</button>
            </div>
          ) : (
            <>
              <div className="cart-summary-label">Cart summary</div>
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <strong>{formatCurrency(cartSubtotal, currency)}</strong>
              </div>
              <div className="cart-support-note">
                <ShieldCheck size={22} aria-hidden="true" />
                <span>Secure shopping with Reliable. Delivery and payment details are confirmed at checkout.</span>
              </div>
              <div className="cart-list-heading">
                <span>Cart ({itemCount})</span>
                <span className="cart-list-heading-accent">{cart.length} {cart.length === 1 ? 'item' : 'items'}</span>
              </div>

              {cartGroups.map(([storeKey, storeItems], groupIndex) => (
                <div key={storeKey} className="cart-store-group">
                  <div className="cart-store-heading">
                    <strong>Store {groupIndex + 1}</strong>
                    <span>{storeKey === 'marketplace' ? 'Reliable Marketplace' : `Store ID: ${storeKey.slice(0, 8)}…`}</span>
                  </div>
                  {storeItems.map((item, index) => (
                    <div key={`${item.id}-${item.selected_size || index}`} className="cart-item">
                      <div className="item-image">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" />
                        ) : (
                          <div className="thumb-placeholder">No image</div>
                        )}
                      </div>
                      <div className="item-details">
                        <h3>{item.name}</h3>
                        {item.selected_size && (
                          <p className="item-variant">Size: <strong>{item.selected_size}</strong></p>
                        )}
                        <p className="item-price">{formatCurrency(item.price, item.currency || 'GHS')}</p>
                        <p className="line-total">Line total: {formatCurrency(item.price * item.quantity, item.currency || 'GHS')}</p>
                        <div className="quantity-controls" aria-label={`Quantity for ${item.name}`}>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.selected_size)} aria-label={`Decrease ${item.name}`}>−</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.selected_size)} aria-label={`Increase ${item.name}`}>+</button>
                        </div>
                      </div>
                      <button className="remove-item" onClick={() => removeFromCart(item.id, item.selected_size)} title="Remove item" aria-label={`Remove ${item.name}`}>
                        <Trash2 size={18} />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            {hasMultipleStores && (
              <div className="cart-store-warning" role="status">
                <strong>Multiple stores selected</strong>
                <span>Checkout is handled one store at a time. Remove items from other stores before paying.</span>
              </div>
            )}
            <div className="subtotal subtotal-footer">
              <span>Subtotal</span>
              <strong>{formatCurrency(cartSubtotal, currency)}</strong>
            </div>
            <div className="cart-actions-row">
              <a className="cart-call-btn" href="tel:+233595609966" aria-label="Call Reliable support" title="Call Reliable support">
                <PhoneCall size={23} strokeWidth={2.2} />
              </a>
              <button className="checkout-btn" onClick={handleCheckout}>Proceed to Checkout ({formatCurrency(cartSubtotal, currency)})</button>
            </div>
            <button className="clear-btn" onClick={clearCart}>Empty Cart</button>
          </div>
        )}
      </div>
    </div>
  )
}
