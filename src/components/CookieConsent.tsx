import { useEffect, useState } from 'react'
import { Check, Cookie, Settings2, X } from 'lucide-react'
import './CookieConsent.css'

const CONSENT_STORAGE_KEY = 'reliable-cookie-consent'
type ConsentChoice = { necessary: true; analytics: boolean; timestamp: string }

function readConsent(): ConsentChoice | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as Partial<ConsentChoice>
    if (parsed.necessary !== true || typeof parsed.analytics !== 'boolean') return null
    return { necessary: true, analytics: parsed.analytics, timestamp: String(parsed.timestamp || '') }
  } catch {
    return null
  }
}

export default function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null)
  const [showPreferences, setShowPreferences] = useState(false)
  const [analytics, setAnalytics] = useState(false)

  useEffect(() => {
    const saved = readConsent()
    setChoice(saved)
    setAnalytics(saved?.analytics ?? false)
  }, [])

  const saveChoice = (allowAnalytics: boolean) => {
    const next: ConsentChoice = { necessary: true, analytics: allowAnalytics, timestamp: new Date().toISOString() }
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next))
    setChoice(next)
    setShowPreferences(false)
    window.dispatchEvent(new CustomEvent('reliable-cookie-consent-updated', { detail: next }))
  }

  if (choice && !showPreferences) return null

  return (
    <>
      <section className="cookie-consent" role="dialog" aria-modal="false" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-description">
        <div className="cookie-consent-copy">
          <div className="cookie-consent-icon" aria-hidden="true"><Cookie size={22} strokeWidth={2.1} /></div>
          <div>
            <h2 id="cookie-consent-title">Your privacy matters</h2>
            <p id="cookie-consent-description">
              We use essential cookies to keep Reliable secure and working smoothly. With your permission, we also use optional cookies to improve your experience and understand site usage.
            </p>
            <a href="/privacy-policy" className="cookie-consent-link">Read our Privacy Policy</a>
          </div>
        </div>
        <div className="cookie-consent-actions">
          <button type="button" className="cookie-btn cookie-btn-secondary" onClick={() => saveChoice(false)}>Reject non-essential</button>
          <button type="button" className="cookie-btn cookie-btn-outline" onClick={() => { setAnalytics(true); setShowPreferences(true) }}><Settings2 size={16} aria-hidden="true" /> Customize</button>
          <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => saveChoice(true)}>Accept all</button>
        </div>
        {showPreferences && (
          <div className="cookie-preferences" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title">
            <div className="cookie-preferences-header">
              <div><span className="cookie-preferences-eyebrow">Cookie preferences</span><h3 id="cookie-preferences-title">Choose what you allow</h3></div>
              <button type="button" className="cookie-close" aria-label="Close cookie preferences" onClick={() => setShowPreferences(false)}><X size={19} /></button>
            </div>
            <p className="cookie-preferences-intro">You can change these choices at any time from the cookie settings on this device.</p>
            <div className="cookie-option">
              <div><strong>Strictly necessary</strong><span>Required for security, sign-in, shopping cart, and basic site functions.</span></div>
              <span className="cookie-always"><Check size={15} /> Always on</span>
            </div>
            <label className="cookie-option cookie-option-toggle">
              <div><strong>Analytics and improvements</strong><span>Helps us understand how visitors use Reliable so we can improve the experience.</span></div>
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              <span className="cookie-switch" aria-hidden="true" />
            </label>
            <div className="cookie-preferences-footer">
              <button type="button" className="cookie-btn cookie-btn-secondary" onClick={() => saveChoice(false)}>Reject non-essential</button>
              <button type="button" className="cookie-btn cookie-btn-primary" onClick={() => saveChoice(analytics)}>Save preferences</button>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
