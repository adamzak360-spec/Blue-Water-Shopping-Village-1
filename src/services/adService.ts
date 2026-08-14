import { supabase } from '../supabaseClient'

export type AdPlacement =
  | 'HOME_TOP'
  | 'HOME_MIDDLE'
  | 'HOME_BOTTOM'
  | 'PRODUCT_LIST_TOP'
  | 'PRODUCT_LIST_MIDDLE'
  | 'PRODUCT_DETAILS'
  | 'STORE_PAGE'
  | 'CATEGORY_PAGE'
  | 'SEARCH_RESULTS'
  | 'SIDEBAR_DESKTOP'
  | 'MOBILE_BANNER'

export type AdStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'EXPIRED' | 'REJECTED' | 'ARCHIVED'

export interface Advertisement {
  id: string
  advertiser_id: string
  campaign_name: string
  ad_type: string
  placement: AdPlacement
  status: AdStatus
  priority: number
  headline: string
  description: string | null
  image_url: string | null
  destination_url: string
  product_id: string | null
  store_id: string | null
  starts_at: string
  ends_at: string
  budget_minor: number
  revenue_minor: number
  impressions_count: number
  clicks_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export async function getPublicAds(placement: AdPlacement, limit = 3): Promise<Advertisement[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('get_active_reliable_ads', { p_placement: placement, p_limit: limit })
  if (error) {
    console.warn('Reliable Ads unavailable:', error.message)
    return []
  }
  return (data || []) as Advertisement[]
}

const sessionKey = () => {
  if (typeof window === 'undefined') return null
  const key = 'reliable_ad_session'
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const next = crypto.randomUUID()
  window.sessionStorage.setItem(key, next)
  return next
}

export async function recordAdImpression(advertisementId: string): Promise<void> {
  if (!supabase || !advertisementId) return
  const { error } = await supabase.rpc('record_ad_impression', { p_advertisement_id: advertisementId, p_session_key: sessionKey() })
  if (error) console.warn('Ad impression unavailable:', error.message)
}

export async function recordAdClick(advertisementId: string): Promise<void> {
  if (!supabase || !advertisementId) return
  const { error } = await supabase.rpc('record_ad_click', { p_advertisement_id: advertisementId, p_session_key: sessionKey() })
  if (error) console.warn('Ad click unavailable:', error.message)
}
