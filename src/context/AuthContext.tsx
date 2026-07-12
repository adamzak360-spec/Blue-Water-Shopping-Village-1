import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: User | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string, metadata: Record<string, any>) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ error: Error | null }>
  changePassword: (newPassword: string) => Promise<{ error: Error | null }>
  resetPasswordEmail: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signIn: async () => ({ error: new Error('Supabase not configured') }),
  signUp: async () => ({ error: new Error('Supabase not configured') }),
  signOut: async () => ({ error: new Error('Supabase not configured') }),
  updateUserMetadata: async () => ({ error: new Error('Supabase not configured') }),
  changePassword: async () => ({ error: new Error('Supabase not configured') }),
  resetPasswordEmail: async () => ({ error: new Error('Supabase not configured') }),
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false)
      return
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { error }
  }

  const signUp = async (email: string, password: string, metadata: Record<string, any>) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.signUp({
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

    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.updateUser({
      data: metadata,
    })

    return { error }
  }

  const changePassword = async (newPassword: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }

  const resetPasswordEmail = async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') }
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/customer/settings`,
    })

    return { error }
  }

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      isLoading, 
      signIn, 
      signUp, 
      signOut, 
      updateUserMetadata, 
      changePassword,
      resetPasswordEmail
    }}>
      {children}
    </AuthContext.Provider>
  )
}
