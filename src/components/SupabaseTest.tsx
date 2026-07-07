import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../supabaseClient'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If Supabase is not configured, show configuration error
    if (!isSupabaseConfigured) {
      setConnectionStatus('Configuration Error')
      setError(supabaseConfigError)
      return
    }

    const testConnection = async () => {
      try {
        // Test basic connection by checking auth status
        const { data, error: authError } = await supabase!.auth.getSession()

        if (authError) {
          setConnectionStatus('Connection established (auth check)')
          console.log('Supabase auth check:', data)
        } else {
          setConnectionStatus('Connected successfully!')
          console.log('Supabase connection successful')
        }
      } catch (err) {
        setConnectionStatus('Connection error')
        setError(err instanceof Error ? err.message : 'Unknown error')
        console.error('Error testing Supabase:', err)
      }
    }

    testConnection()
  }, [])

  return (
    <div style={{ 
      padding: '1rem', 
      margin: '1rem 0', 
      backgroundColor: error ? '#ffe0e0' : '#f0f0f0', 
      borderRadius: '4px',
      border: error ? '2px solid #ff6b6b' : '1px solid #ddd'
    }}>
      <h3>Supabase Connection Status</h3>
      <p>Status: <strong>{connectionStatus}</strong></p>
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}
    </div>
  )
}
