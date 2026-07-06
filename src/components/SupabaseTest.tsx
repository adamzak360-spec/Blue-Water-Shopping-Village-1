import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function SupabaseTest() {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test basic connection by checking auth status
        const { data, error: authError } = await supabase.auth.getSession()

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
    <div style={{ padding: '1rem', margin: '1rem 0', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
      <h3>Supabase Connection Status</h3>
      <p>Status: <strong>{connectionStatus}</strong></p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  )
}
