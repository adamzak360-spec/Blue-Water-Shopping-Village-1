import React from 'react'
import { useNavigate } from 'react-router-dom'
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

  if (!isCartOpen) return null

  const handleCheckout = () => {
    setIsCartOpen(false)
    navigate('/checkout')
  }

  return (
    <div className="cart-sidebar-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="cart-sidebar" onClick={e => e.stopPropagation()}>
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="close-btn" onClick={() => setIsCartOpen(false)}>&times;</button>
        </div>

        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart-message">
              <p>Your cart is empty</p>
              <button className="continue-btn" onClick={() => setIsCartOpen(false)}>Continue Shopping</button>
            </div>
          ) : (
            cartGroups.map(([storeKey, storeItems], groupIndex) => (
              <div key={storeKey} className="cart-store-group">
                <div className="cart-store-heading">
                  <strong>Store {groupIndex + 1}</strong>
                  <span>{storeKey === 'marketplace' ? 'Reliable Marketplace' : `Store ID: ${storeKey.slice(0, 8)}…`}</span>
                </div>
                {storeItems.map((item, index) => (
              <div key={`${item.id}-${item.selected_size || index}`} className="cart-item">
                <div className="item-image">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
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
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.selected_size)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.selected_size)}>+</button>
                  </div>
                  <p className="line-total">Total: {formatCurrency(item.price * item.quantity, item.currency || 'GHS')}</p>
                </div>
                <button className="remove-item" onClick={() => removeFromCart(item.id, item.selected_size)} title="Remove item">
                  &times;
                </button>
              </div>
                ))}
              </div>
            ))
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
            <div className="subtotal">
              <span>Subtotal</span>
              <span>{formatCurrency(cartSubtotal, cart[0]?.currency || 'GHS')}</span>
            </div>
            <button className="checkout-btn" onClick={handleCheckout}>Proceed to Checkout</button>
            <button className="clear-btn" onClick={clearCart}>Empty Cart</button>
          </div>
        )}
      </div>
    </div>
  )
}
