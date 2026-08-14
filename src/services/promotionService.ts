import { supabase } from '../supabaseClient'

interface ActivePromotion {
  product_id: string | null
}

export async function getActivePromotedProductIds(limit = 24): Promise<string[]> {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('get_active_promoted_products', {
    p_limit: limit,
  })

  if (error) {
    console.warn('Active promotions unavailable:', error.message)
    return []
  }

  return ((data || []) as ActivePromotion[])
    .map((promotion) => promotion.product_id)
    .filter((productId): productId is string => Boolean(productId))
}
