import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { useAuth } from './AuthContext'

interface WishlistContextValue {
  productIds: Set<string>
  wishlistCount: number
  isLoading: boolean
  isWishlisted: (productId: string) => boolean
  toggleWishlist: (productId: string) => Promise<{ success: boolean; requiresLogin?: boolean; error?: string }>
  removeFromWishlist: (productId: string) => Promise<{ success: boolean; error?: string }>
  refreshWishlist: () => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [productIds, setProductIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  const refreshWishlist = useCallback(async () => {
    if (!user || !isSupabaseConfigured || !supabase) {
      setProductIds(new Set())
      return
    }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', user.id)

      if (error) throw error
      setProductIds(new Set((data || []).map((item) => item.product_id)))
    } catch (error) {
      console.error('Unable to load wishlist:', error)
      setProductIds(new Set())
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshWishlist()
  }, [refreshWishlist])

  const toggleWishlist = useCallback(async (productId: string) => {
    if (!user) {
      navigate('/login', { state: { from: '/customer/wishlist', message: 'Please sign in to save products to your wishlist.' } })
      return { success: false, requiresLogin: true }
    }
    if (!supabase || !isSupabaseConfigured) return { success: false, error: 'Wishlist is temporarily unavailable.' }

    const currentlySaved = productIds.has(productId)
    setProductIds((current) => {
      const next = new Set(current)
      currentlySaved ? next.delete(productId) : next.add(productId)
      return next
    })

    const result = currentlySaved
      ? await supabase!.from('wishlist_items').delete().eq('user_id', user.id).eq('product_id', productId)
      : await supabase!.from('wishlist_items').insert({ user_id: user.id, product_id: productId })

    if (result.error) {
      setProductIds((current) => {
        const next = new Set(current)
        currentlySaved ? next.add(productId) : next.delete(productId)
        return next
      })
      return { success: false, error: result.error.message }
    }

    return { success: true }
  }, [navigate, productIds, user])

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!user || !supabase || !isSupabaseConfigured) return { success: false, error: 'Please sign in to manage your wishlist.' }

    const previous = new Set(productIds)
    setProductIds((current) => {
      const next = new Set(current)
      next.delete(productId)
      return next
    })

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId)

    if (error) {
      setProductIds(previous)
      return { success: false, error: error.message }
    }

    return { success: true }
  }, [productIds, user])

  const value = useMemo(() => ({
    productIds,
    wishlistCount: productIds.size,
    isLoading,
    isWishlisted: (productId: string) => productIds.has(productId),
    toggleWishlist,
    removeFromWishlist,
    refreshWishlist,
  }), [isLoading, productIds, refreshWishlist, removeFromWishlist, toggleWishlist])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) throw new Error('useWishlist must be used within WishlistProvider')
  return context
}
