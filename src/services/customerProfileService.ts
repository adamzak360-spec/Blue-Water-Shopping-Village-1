import { supabase } from '../supabaseClient'
import { CustomerProfile } from '../types'

const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return supabase
}

export const getCustomerProfile = async (userId: string): Promise<CustomerProfile | null> => {
  const { data, error } = await getSupabase()
    .from('customer_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 means no rows found, which is acceptable
    console.error('Error fetching customer profile:', error)
    throw error
  }

  return data as CustomerProfile | null
}

export const createOrUpdateCustomerProfile = async (
  userId: string,
  profileData: Omit<CustomerProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<CustomerProfile> => {
  // First check if profile exists
  const existingProfile = await getCustomerProfile(userId)

  if (existingProfile) {
    // Update existing profile
    const { data, error } = await getSupabase()
      .from('customer_profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating customer profile:', error)
      throw error
    }

    return data as CustomerProfile
  } else {
    // Create new profile
    const { data, error } = await getSupabase()
      .from('customer_profiles')
      .insert([{ id: userId, ...profileData }])
      .select()
      .single()

    if (error) {
      console.error('Error creating customer profile:', error)
      throw error
    }

    return data as CustomerProfile
  }
}

export const updateCustomerProfile = async (
  userId: string,
  profileData: Partial<Omit<CustomerProfile, 'id' | 'created_at' | 'updated_at'>>
): Promise<CustomerProfile> => {
  const { data, error } = await getSupabase()
    .from('customer_profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating customer profile:', error)
    throw error
  }

  return data as CustomerProfile
}
