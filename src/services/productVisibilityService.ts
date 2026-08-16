import { supabase } from '../supabaseClient'
import type { ProductVisibilityEntitlement, ProductVisibilityPlan } from '../types'

export async function getActiveProductVisibilityPlans(): Promise<ProductVisibilityPlan[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('product_visibility_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_minor', { ascending: true })
  if (error) throw new Error(error.message)
  return (data || []) as ProductVisibilityPlan[]
}

export async function getProductVisibilityEntitlements(storeId: string): Promise<ProductVisibilityEntitlement[]> {
  if (!supabase || !storeId) return []
  const { data, error } = await supabase
    .from('product_visibility_entitlements')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data || []) as ProductVisibilityEntitlement[]
}

export async function getAdminVisibilityPlans(): Promise<ProductVisibilityPlan[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('product_visibility_plans')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []) as ProductVisibilityPlan[]
}

export async function createAdminVisibilityPlan(input: {
  code: string
  name: string
  description?: string
  target: ProductVisibilityPlan['target']
  price_minor: number
  duration_days: number
}): Promise<ProductVisibilityPlan> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data, error } = await supabase.from('product_visibility_plans').insert({
    ...input,
    currency: 'GHS',
    is_active: false,
  }).select('*').single()
  if (error) throw new Error(error.message)
  return data as ProductVisibilityPlan
}

export async function updateAdminVisibilityPlan(id: string, patch: Partial<Pick<ProductVisibilityPlan, 'name' | 'description' | 'price_minor' | 'duration_days' | 'is_active'>>): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { error } = await supabase.from('product_visibility_plans').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function revokeProductVisibilityEntitlement(id: string, reason: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('product_visibility_entitlements').update({
    status: 'REVOKED',
    revoked_at: new Date().toISOString(),
    revoked_by: userData.user?.id || null,
    revocation_reason: reason || 'Revoked by administrator',
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('status', 'PAID')
  if (error) throw new Error(error.message)
}
