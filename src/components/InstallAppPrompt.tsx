import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import './InstallAppPrompt.css'

type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'reliable-install-prompt-dismissed'

export default function InstallAppPrompt() {
  const [installEvent, setInstallEvent] = useState<DeferredInstallPrompt | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone || window.localStorage.getItem(DISMISS_KEY) === 'true') return

    const handleInstallAvailable = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as DeferredInstallPrompt)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleInstallAvailable)
    return () => window.removeEventListener('beforeinstallprompt', handleInstallAvailable)
  }, [])

  if (!visible || !installEvent) return null

  const install = async () => {
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    if (choice.outcome === 'accepted') setVisible(false)
    setInstallEvent(null)
  }

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }

  return (
    <aside className="install-app-prompt" aria-label="Install Reliable Premium Marketplace">
      <div className="install-app-icon"><Download size={20} aria-hidden="true" /></div>
      <div className="install-app-copy">
        <strong>Install Reliable</strong>
        <span>Keep the marketplace one tap away.</span>
      </div>
      <button className="install-app-action" onClick={install}>Install</button>
      <button className="install-app-dismiss" onClick={dismiss} aria-label="Dismiss install prompt" title="Dismiss">
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
