import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Export a flag to indicate if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Export error message if not configured
export const supabaseConfigError = !supabaseUrl
  ? 'Missing VITE_SUPABASE_URL environment variable'
  : !supabaseAnonKey
  ? 'Missing VITE_SUPABASE_ANON_KEY environment variable'
  : null

// Create client with proper options for session persistence
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
