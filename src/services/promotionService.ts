import { supabase } from '../supabaseClient'

interface ActivePromotion {
  id: string
  product_id: string | null
}

export interface ActivePromotedProduct {
  promotionId: string
  productId: string
}

export async function getActivePromotedProducts(limit = 24): Promise<ActivePromotedProduct[]> {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('get_active_promoted_products', {
    p_limit: limit,
  })

  if (error) {
    console.warn('Active promotions unavailable:', error.message)
    return []
  }

  return ((data || []) as ActivePromotion[])
    .filter((promotion): promotion is ActivePromotion & { product_id: string } => Boolean(promotion.id && promotion.product_id))
    .map((promotion) => ({ promotionId: promotion.id, productId: promotion.product_id }))
}

export async function recordPromotionImpression(promotionId: string): Promise<void> {
  if (!supabase || !promotionId) return
  const { error } = await supabase.rpc('record_promotion_impression', { p_promotion_id: promotionId })
  if (error) console.warn('Promotion impression unavailable:', error.message)
}

export async function recordPromotionClick(promotionId: string): Promise<void> {
  if (!supabase || !promotionId) return
  const { error } = await supabase.rpc('record_promotion_click', { p_promotion_id: promotionId })
  if (error) console.warn('Promotion click unavailable:', error.message)
}
