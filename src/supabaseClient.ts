import { createClient } from '@supabase/supabase-js'

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const configuredSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

// Vercel values can contain an accidental trailing newline when pasted from a
// dashboard or .env file. Trim both public values before creating the client so
// authentication requests always target the exact Supabase project endpoint.
export const supabaseUrl = configuredSupabaseUrl || 'https://iwouhwizzwwykchgflyk.supabase.co'
export const supabaseAnonKey = configuredSupabaseAnonKey

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
        // Google OAuth returns an authorization code. PKCE makes the browser
        // store a verifier before leaving the site and lets AuthContext safely
        // exchange that code for the new user's session on return.
        flowType: 'pkce',
        // Let Supabase perform the single PKCE callback exchange and persist the
        // resulting session before React route guards render.
        detectSessionInUrl: true,
      },
    })
  : null
