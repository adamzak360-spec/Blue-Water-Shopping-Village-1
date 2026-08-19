import { useEffect, useState } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { supabaseUrl, supabaseAnonKey } from '../supabaseClient'

const DISMISSED_KEY = 'auth-outage-notice-dismissed-v1'
const RECOVERED_KEY = 'auth-outage-recovered-flag'

/**
 * Small floating notice shown while Supabase auth is in a platform-wide outage.
 * - Click the banner body or the X to dismiss; dismissal is remembered per browser.
 * - Probes the Supabase auth endpoint in the background; hides itself automatically
 *   once auth recovers (and remembers that recovery so it never reappears).
 */
export default function AuthOutageNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if the user already dismissed it this outage, or if we've
    // previously detected recovery on this browser.
    if (localStorage.getItem(DISMISSED_KEY) || localStorage.getItem(RECOVERED_KEY)) return

    let cancelled = false
    let probeTimer: ReturnType<typeof setInterval> | null = null

    const probeAuth = async (): Promise<boolean> => {
      try {
        // A real login attempt would lock accounts on failure; instead we hit
        // the health surface with an anonymous POST that Supabase must answer.
        const res = await fetch(`${supabaseUrl}/auth/v1/otp`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'probe@example.com', data: {} }),
          signal: AbortSignal.timeout(8000),
        })
        // 503 / gateway errors = still down. 400/401 etc. mean the gateway
        // answered (auth service reachable) => outage over.
        return res.status !== 503 && res.status !== 502
      } catch {
        return false
      }
    }

    ;(async () => {
      const up = await probeAuth()
      if (cancelled) return
      if (up) {
        localStorage.setItem(RECOVERED_KEY, '1')
        return
      }
      setVisible(true)
      // Re-probe every 3 minutes while visible.
      probeTimer = setInterval(async () => {
        if (await probeAuth()) {
          localStorage.setItem(RECOVERED_KEY, '1')
          setVisible(false)
          if (probeTimer) clearInterval(probeTimer)
        }
      }, 180_000)
    })()

    return () => {
      cancelled = true
      if (probeTimer) clearInterval(probeTimer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(5, 20, 35, 0.35)',
        animation: 'authNoticeFadeIn 0.45s ease-out',
      }}
      onClick={dismiss}
    />
    <button
      type="button"
      onClick={dismiss}
      title="Tap to dismiss"
      aria-label="Dismiss maintenance notice"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        maxWidth: 'min(92vw, 460px)',
        width: 'max-content',
        background: 'linear-gradient(135deg, #0f2b46 0%, #123a5f 100%)',
        color: '#eaf2fb',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 14,
        boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
        padding: '14px 38px 14px 16px',
        fontSize: 13.5,
        lineHeight: 1.45,
        fontFamily: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        animation: 'authNoticeIn 0.45s ease-out',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 9,
          right: 10,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 999,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={14} />
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#ffd98a' }} />
        <span>
          <strong>Sign-in is temporarily unavailable.</strong> Browsing, products and orders by
          phone/WhatsApp are all open — just create or log in to your account a little later. We're
          sorry for the inconvenience!
        </span>
      </div>
    </button>
    </>
    <style>{`
      @keyframes authNoticeIn {
        from { opacity: 0; transform: translate(-50%, -46%); }
        to { opacity: 1; transform: translate(-50%, -50%); }
      }
      @keyframes authNoticeFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `}</style>
  )
}
