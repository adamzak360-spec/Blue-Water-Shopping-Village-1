import { isSupabaseConfigured, supabase } from '../supabaseClient'

export type DeliveryPricingType = 'flat' | 'per_item'

export interface DeliveryMethod {
  id: string
  business_id?: string | null
  country_code?: string | null
  name: string
  coverage_area: string
  price: number
  currency_code: string
  pricing_type: DeliveryPricingType
  estimated_days?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export type DeliveryMethodInput = Omit<DeliveryMethod, 'id' | 'created_at' | 'updated_at'>

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured')
  }
  return supabase
}

export async function getDeliveryMethodsForBusiness(
  businessId?: string,
  countryCode?: string,
  currencyCode?: string,
): Promise<DeliveryMethod[]> {
  const client = requireSupabase()

  const buildQuery = (scope: 'global' | 'business', filterCurrency = true) => {
    let query = client
      .from('delivery_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    query = scope === 'global'
      ? query.is('business_id', null)
      : query.eq('business_id', businessId as string)

    if (countryCode) query = query.or(`country_code.eq.${countryCode},country_code.is.null`)
    // Seller-configured methods are authoritative for that store. Do not hide them
    // merely because an older cart item has a missing or stale currency value.
    if (currencyCode && filterCurrency) query = query.eq('currency_code', currencyCode)
    return query
  }

  const [businessResult, globalResult] = await Promise.all([
    businessId ? buildQuery('business', false) : Promise.resolve({ data: [], error: null }),
    buildQuery('global', true),
  ])

  if (businessResult.error) throw new Error(businessResult.error.message)
  if (globalResult.error) throw new Error(globalResult.error.message)

  const businessMethods = (businessResult.data || []) as DeliveryMethod[]
  const globalMethods = (globalResult.data || []) as DeliveryMethod[]

  // A seller's configured methods replace the global defaults for that store.
  return businessMethods.length > 0 ? businessMethods : globalMethods
}

export async function getBusinessDeliveryMethods(businessId: string): Promise<DeliveryMethod[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('delivery_methods')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as DeliveryMethod[]
}

export async function getGlobalDeliveryMethods(): Promise<DeliveryMethod[]> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('delivery_methods')
    .select('*')
    .is('business_id', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)
  return (data || []) as DeliveryMethod[]
}

export async function createDeliveryMethod(input: DeliveryMethodInput): Promise<DeliveryMethod> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('delivery_methods')
    .insert({ ...input, price: Number(input.price) })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as DeliveryMethod
}

export async function updateDeliveryMethod(id: string, input: Partial<DeliveryMethodInput>): Promise<DeliveryMethod> {
  const client = requireSupabase()
  const { data, error } = await client
    .from('delivery_methods')
    .update({ ...input, ...(input.price !== undefined ? { price: Number(input.price) } : {}), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as DeliveryMethod
}

export async function deleteDeliveryMethod(id: string): Promise<void> {
  const client = requireSupabase()
  const { error } = await client.from('delivery_methods').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
