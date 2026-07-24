import { useState, useEffect } from 'react'
import { Phone } from 'lucide-react'
import { supabase } from '../supabaseClient'
import './CallToOrderBanner.css'

interface CallToOrderSettings {
  id: string
  phone_number: string
  is_active: boolean
  updated_at: string
}

export default function CallToOrderBanner() {
  const [settings, setSettings] = useState<CallToOrderSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase not configured')
        setSettings({
          id: 'default',
          phone_number: '+233 53 855 7781',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('call_to_order_settings')
        .select('*')
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Table doesn't exist or no data, use default
          setSettings({
            id: 'default',
            phone_number: '+233 53 855 7781',
            is_active: true,
            updated_at: new Date().toISOString()
          })
        } else {
          console.error('Error loading settings:', error)
          setSettings({
            id: 'default',
            phone_number: '+233 53 855 7781',
            is_active: true,
            updated_at: new Date().toISOString()
          })
        }
      } else if (data) {
        setSettings(data)
      }
    } catch (err) {
      console.error('Error:', err)
      setSettings({
        id: 'default',
        phone_number: '+233 53 855 7781',
        is_active: true,
        updated_at: new Date().toISOString()
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !settings || !settings.is_active) {
    return null
  }

  return (
    <section className="call-to-order-banner">
      <div className="banner-content">
        <div className="banner-text">
          <span className="banner-label">Call to Order</span>
          <a href={`tel:${settings.phone_number.replace(/\s+/g, '')}`} className="banner-phone">
            <Phone size={18} />
            {settings.phone_number}
          </a>
        </div>
      </div>
    </section>
  )
}
