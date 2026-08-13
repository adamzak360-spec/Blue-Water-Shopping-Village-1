import React, { createContext, useContext, useState, useEffect } from 'react'
import { CartItem, Product } from '../types'

interface CartContextType {
  cart: CartItem[]
  addToCart: (product: Product) => void
  removeFromCart: (productId: string, selectedSize?: string) => void
  updateQuantity: (productId: string, quantity: number, selectedSize?: string) => void
  clearCart: () => void
  cartCount: number
  cartSubtotal: number
  isCartOpen: boolean
  setIsCartOpen: (isOpen: boolean) => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('bwsv_cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart from localStorage', e)
      }
    }
  }, [])

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('bwsv_cart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product: Product) => {
    const cartItem = product as CartItem
    setCart(prevCart => {
      const existingItem = prevCart.find(item => 
        item.id === cartItem.id && item.selected_size === cartItem.selected_size
      )
      const requestedQuantity = Math.max(1, Number(cartItem.quantity) || 1)
      const availableStock = Math.max(0, Number(cartItem.stock_quantity) || 0)

      if (existingItem) {
        const nextQuantity = availableStock > 0
          ? Math.min(availableStock, existingItem.quantity + requestedQuantity)
          : existingItem.quantity
        return prevCart.map(item =>
          (item.id === cartItem.id && item.selected_size === cartItem.selected_size)
            ? { ...item, quantity: nextQuantity }
            : item
        )
      }

      if (availableStock <= 0) return prevCart
      return [...prevCart, { ...cartItem, quantity: Math.min(requestedQuantity, availableStock) }]
    })
  }

  const removeFromCart = (productId: string, selectedSize?: string) => {
    setCart(prevCart => prevCart.filter(item => 
      !(item.id === productId && item.selected_size === selectedSize)
    ))
  }

  const updateQuantity = (productId: string, quantity: number, selectedSize?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize)
      return
    }
    setCart(prevCart =>
      prevCart.map(item =>
        (item.id === productId && item.selected_size === selectedSize) 
          ? { ...item, quantity } 
          : item
      )
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0)
  const cartSubtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartCount,
      cartSubtotal,
      isCartOpen,
      setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
