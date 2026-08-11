import { supabase, isSupabaseConfigured } from '../supabaseClient'

export interface Business {
  id: string
  name: string
  slug: string
  owner_id?: string
  logo_url?: string
  banner_url?: string
  description?: string
  contact_email?: string
  contact_phone?: string
  business_name?: string | null
  phone?: string | null
  location?: string | null
  category?: string | null
  country_code?: string | null
  currency_code?: string | null
  created_at: string
  updated_at: string
}

export async function getAllBusinesses(): Promise<Business[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching all businesses:', error)
    throw new Error(error.message)
  }

  return (data as Business[]) || []
}

export async function deleteBusiness(businessId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', businessId)

  if (error) {
    console.error('Error deleting business:', error)
    throw new Error(error.message)
  }
}

export async function getAllBusinessesByOwner(userId: string): Promise<Business[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching businesses for owner:', error)
    return []
  }

  return (data as Business[]) || []
}

export async function getBusinessByOwner(userId: string): Promise<Business | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  // Use a limited query instead of .single() so the call succeeds even
  // when a user owns multiple businesses (the original `.single()` threw
  // "JSON object requested, multiple (or no) rows returned" and broke
  // the dashboard data load for multi-store owners).
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0] as Business
}

export async function getPublicBusinesses(searchTerm = '', category = ''): Promise<Business[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  let query = supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query
  if (error) {
    console.error('Error fetching public businesses:', error)
    return []
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  return ((data as Business[]) || []).filter((business) => {
    if (!normalizedSearch) return true
    return [business.name, business.business_name, business.description, business.category, business.location]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch))
  })
}

export async function createBusinessForUser(
  userId: string,
  businessData: {
    name: string
    slug: string
    description?: string
    contact_email?: string
    contact_phone?: string
    business_name?: string
    phone?: string
    location?: string
    category?: string
    country_code?: string
    currency_code?: string
  }
): Promise<{ business: Business | null; error: Error | null }> {
  if (!isSupabaseConfigured || !supabase) {
    return { business: null, error: new Error('Supabase not configured') }
  }

  const { data, error } = await supabase
    .from('businesses')
    .insert([
      {
        owner_id: userId,
        name: businessData.name,
        slug: businessData.slug,
        description: businessData.description,
        contact_email: businessData.contact_email,
        contact_phone: businessData.contact_phone,
        business_name: businessData.business_name,
        phone: businessData.phone,
        location: businessData.location,
        category: businessData.category,
        country_code: businessData.country_code,
        currency_code: businessData.currency_code,
      },
    ])
    .select()
    .single()

  if (error) {
    return { business: null, error: new Error(error.message) }
  }

  return { business: data as Business, error: null }
}
