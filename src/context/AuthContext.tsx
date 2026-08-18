import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Session, User } from '@supabase/supabase-js'
import { reportSuccessfulLogin } from '../services/loginSecurityService'

interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: (redirectPath?: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ error: Error | null }>
  changePassword: (newPassword: string) => Promise<{ error: Error | null }>
  resetPasswordEmail: (email: string) => Promise<{ error: Error | null }>
  refreshProfile: () => Promise<void>
  isAdmin: boolean
  role: string | null
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signIn: async () => ({ error: new Error('Supabase not configured') }),
  signInWithGoogle: async () => ({ error: new Error('Supabase not configured') }),
  signUp: async () => ({ error: new Error('Supabase not configured') }),
  signOut: async () => ({ error: new Error('Supabase not configured') }),
  updateUserMetadata: async () => ({ error: new Error('Supabase not configured') }),
  changePassword: async () => ({ error: new Error('Supabase not configured') }),
  resetPasswordEmail: async () => ({ error: new Error('Supabase not configured') }),
  refreshProfile: async () => {},
  isAdmin: false,
  role: null,
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  const fetchProfile = async (u: User | null) => {
    if (!u) {
      setRole(null)
      setIsAdmin(false)
      return
    }

    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('role')
        .eq('id', u.id)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        // Fallback: if the user owns a business, treat them as a seller
        // even when the profiles row is missing or the table does not exist yet.
        try {
          const { data: business } = await supabase!
            .from('businesses')
            .select('id')
            .eq('owner_id', u.id)
            .single()
          if (business) {
            setRole('seller')
            setIsAdmin(false)
          } else {
            setRole('customer')
            setIsAdmin(false)
          }
        } catch {
          setRole('customer')
          setIsAdmin(false)
        }
      } else {
        setRole(data.role)
        setIsAdmin(data.role === 'admin')
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      setRole('customer')
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    let active = true

    const applySession = async (nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)
      const nextUser = nextSession?.user ?? null
      setUser(nextUser)
      await fetchProfile(nextUser)
    }

    const initializeAuth = async () => {
      try {
        // Supabase normally exchanges the OAuth code automatically. Explicitly
        // handle it as well so mobile browsers and installed PWAs do not render
        // Login before the callback session has been established.
        const callbackUrl = new URL(window.location.href)
        const code = callbackUrl.searchParams.get('code')
        if (code) {
          const { error } = await supabase!.auth.exchangeCodeForSession(code)
          if (error) {
            console.error('Google OAuth callback exchange failed:', error)
          } else {
            callbackUrl.searchParams.delete('code')
            callbackUrl.searchParams.delete('state')
            window.history.replaceState({}, document.title, `${callbackUrl.pathname}${callbackUrl.search}${callbackUrl.hash}`)
          }
        }

        const { data: { session }, error: sessionError } = await supabase!.auth.getSession()
        if (sessionError) {
          console.error('Unable to restore authentication session:', sessionError)
        }
        await applySession(session ?? null)
      } catch (error) {
        console.error('Authentication initialization failed:', error)
        await applySession(null)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase!.auth.onAuthStateChange(async (event, nextSession) => {
      await applySession(nextSession)
      if (event === 'SIGNED_IN') {
        void reportSuccessfulLogin(nextSession)
      }
      if (active) setIsLoading(false)
    })

    void initializeAuth()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const refreshProfile = async () => {
    await fetchProfile(user)
  }

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase!.auth.signInWithPassword({
      email,
      password,
    })

    return { error }
  }

  const signInWithGoogle = async (redirectPath = '') => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://www.reliablepremiummarketplace.com').replace(/\/$/, '')
    const safeRedirect = redirectPath.startsWith('/') && !redirectPath.startsWith('//') ? redirectPath : ''
    const callbackUrl = `${publicAppUrl}/login${safeRedirect ? `?redirect=${encodeURIComponent(safeRedirect)}` : ''}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    })
    return { error }
  }

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase!.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    })

    return { error }
  }

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase!.auth.signOut()
    return { error }
  }

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase!.auth.updateUser({
      data: metadata,
    })

    return { error }
  }

  const changePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase!.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }

  const resetPasswordEmail = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    // Always send recovery links to the public application URL. This prevents
    // links generated during local development (localhost:3000) from being
    // emailed to customers and makes the production flow independent of the
    // browser origin that submitted the request.
    const publicAppUrl = (import.meta.env.VITE_PUBLIC_APP_URL || 'https://www.reliablepremiummarketplace.com').replace(/\/$/, '')
    const redirectTo = `${publicAppUrl}/reset-password`

    const { error } = await supabase!.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    return { error }
  }

  return (
    <AuthContext.Provider value={{ 
      session,
      user,
      isLoading,
      signIn,
      signInWithGoogle,
      signUp, 
      signOut, 
      updateUserMetadata, 
      changePassword,
      resetPasswordEmail,
      refreshProfile,
      isAdmin,
      role
    }}>
      {children}
    </AuthContext.Provider>
  )
}
