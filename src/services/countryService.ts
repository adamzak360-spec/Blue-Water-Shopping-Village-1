import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { Country, Currency } from '../types'

export async function getActiveCountries(): Promise<Country[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .neq('status', 'DISABLED')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching countries:', error)
    return []
  }

  return (data as Country[]) || []
}

export async function getActiveCurrencies(): Promise<Currency[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .eq('is_active', true)
    .order('code', { ascending: true })

  if (error) {
    console.error('Error fetching currencies:', error)
    return []
  }

  return (data as Currency[]) || []
}

export async function getCountryByCode(code: string): Promise<Country | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('code', code)
    .single()

  if (error) {
    console.error(`Error fetching country ${code}:`, error)
    return null
  }

  return data as Country
}
