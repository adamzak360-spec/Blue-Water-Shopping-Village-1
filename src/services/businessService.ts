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
  created_at: string
  updated_at: string
}

export async function getBusinessByOwner(userId: string): Promise<Business | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .single()

  if (error) {
    return null
  }

  return data as Business
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
      },
    ])
    .select()
    .single()

  if (error) {
    return { business: null, error: new Error(error.message) }
  }

  return { business: data as Business, error: null }
}
