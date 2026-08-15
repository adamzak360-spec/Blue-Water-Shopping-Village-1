import type { Session } from '@supabase/supabase-js'

const DEVICE_STORAGE_KEY = 'reliable_trusted_device_id'
const SESSION_REPORT_KEY = 'reliable_login_security_report'

function randomPart(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(DEVICE_STORAGE_KEY)
  if (existing && /^[A-Za-z0-9._:-]{20,160}$/.test(existing)) return existing
  const next = `web-${randomPart()}-${randomPart()}`
  window.localStorage.setItem(DEVICE_STORAGE_KEY, next)
  return next
}

export async function reportSuccessfulLogin(session: Session | null): Promise<void> {
  if (typeof window === 'undefined' || !session?.access_token || !session.user?.id) return
  const deviceId = getDeviceId()
  if (!deviceId) return

  const reportKey = `${session.user.id}:${session.expires_at || 'session'}`
  if (window.sessionStorage.getItem(SESSION_REPORT_KEY) === reportKey) return
  window.sessionStorage.setItem(SESSION_REPORT_KEY, reportKey)

  try {
    await fetch('/api/security-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ device_id: deviceId }),
      keepalive: true,
    })
  } catch (error) {
    // Security alerts must never block a successful sign-in or checkout.
    console.warn('[LoginSecurity] Unable to report sign-in:', error)
  }
}
