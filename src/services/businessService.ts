import { supabase, isSupabaseConfigured } from '../supabaseClient'

import { VerificationStatus } from '../types'

export interface Business {
  id: string
  name: string
  slug: string
  owner_id?: string
  logo_url?: string | null
  banner_url?: string | null
  description?: string
  contact_email?: string
  contact_phone?: string
  business_name?: string | null
  phone?: string | null
  location?: string | null
  category?: string | null
  country_code?: string | null
  currency_code?: string | null
  verification_status?: VerificationStatus
  registration_number?: string
  tax_id?: string
  registration_document_url?: string
  proof_of_address_url?: string
  rejection_reason?: string
  verified_at?: string
  verified_by?: string
  facebook_url?: string | null
  tiktok_url?: string | null
  instagram_url?: string | null
  x_url?: string | null
  whatsapp_url?: string | null
  youtube_url?: string | null
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

export async function reviewBusinessVerification(
  businessId: string,
  status: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'suspended',
  reason?: string,
) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase.rpc('admin_review_business_verification', {
    p_business_id: businessId,
    p_new_status: status,
    p_reason: reason || null,
  })

  if (error) throw error
  return data
}

export async function submitBusinessVerification(
  businessId: string,
  data: {
    registration_number?: string
    tax_id?: string
    registration_document_url: string
    proof_of_address_url?: string
  }
): Promise<Business> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: updated, error } = await supabase
    .from('businesses')
    .update({
      ...data,
      verification_status: 'pending',
      updated_at: new Date().toISOString()
    })
    .eq('id', businessId)
    .select()
    .single()

  if (error) throw error
  return updated as Business
}

export async function uploadBusinessAsset(file: File, businessId: string, type: 'logo' | 'banner'): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}/${businessId}/${type}-${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from('business-assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) throw error

  const { data: urlData } = supabase.storage
    .from('business-assets')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function deleteBusinessAsset(assetUrl: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const marker = '/storage/v1/object/public/business-assets/'
  const markerIndex = assetUrl.indexOf(marker)
  if (markerIndex === -1) {
    throw new Error('This asset cannot be removed because its storage path is invalid.')
  }

  const storagePath = decodeURIComponent(assetUrl.slice(markerIndex + marker.length))
  const { error } = await supabase.storage
    .from('business-assets')
    .remove([storagePath])

  if (error) throw error
}

export async function updateBusinessProfile(
  businessId: string,
  updates: Partial<Omit<Business, 'id' | 'created_at' | 'updated_at'>>
): Promise<Business> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('businesses')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', businessId)
    .select()
    .single()

  if (error) throw error
  return data as Business
}
