import { AtSign, Camera, CirclePlay, ExternalLink, MessageCircle, Music2, UsersRound } from 'lucide-react'
import './BusinessSocialLinks.css'

export interface BusinessSocialLinksData {
  facebook_url?: string | null
  tiktok_url?: string | null
  instagram_url?: string | null
  x_url?: string | null
  whatsapp_url?: string | null
  youtube_url?: string | null
}

type SocialKey = keyof BusinessSocialLinksData

interface SocialDefinition {
  key: SocialKey
  label: string
  shortLabel: string
  icon: React.ReactNode
  tone: string
}

const SOCIALS: SocialDefinition[] = [
  { key: 'facebook_url', label: 'Facebook', shortLabel: 'f', icon: <UsersRound size={18} />, tone: 'facebook' },
  { key: 'tiktok_url', label: 'TikTok', shortLabel: '♪', icon: <Music2 size={18} />, tone: 'tiktok' },
  { key: 'instagram_url', label: 'Instagram', shortLabel: '◎', icon: <Camera size={20} />, tone: 'instagram' },
  { key: 'x_url', label: 'X', shortLabel: 'X', icon: <AtSign size={18} />, tone: 'x' },
  { key: 'whatsapp_url', label: 'WhatsApp', shortLabel: '◔', icon: <MessageCircle size={18} />, tone: 'whatsapp' },
  { key: 'youtube_url', label: 'YouTube', shortLabel: '▶', icon: <CirclePlay size={20} />, tone: 'youtube' },
]

export function normalizeSocialUrl(value: string | null | undefined): string {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^(wa\.me|www\.|[\w-]+\.)/i.test(trimmed)) return `https://${trimmed}`
  return ''
}

interface BusinessSocialLinksProps extends BusinessSocialLinksData {
  compact?: boolean
  title?: string
  subtitle?: string
}

export default function BusinessSocialLinks({ compact = false, title = 'Connect with this store', subtitle = 'Follow the store for new products, updates, and offers.', ...links }: BusinessSocialLinksProps) {
  const available = SOCIALS.filter((social) => normalizeSocialUrl(links[social.key]))
  if (available.length === 0) return null

  return (
    <section className={`business-social-links ${compact ? 'business-social-links--compact' : ''}`} aria-label="Seller social media links">
      {!compact && (
        <div className="business-social-links__heading">
          <span className="business-social-links__eyebrow">Stay connected</span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      )}
      <div className="business-social-links__grid">
        {available.map((social) => (
          <a
            key={social.key}
            className={`business-social-link business-social-link--${social.tone}`}
            href={normalizeSocialUrl(links[social.key])}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit this store on ${social.label}`}
          >
            <span className="business-social-link__icon" aria-hidden="true">{social.icon}</span>
            <span className="business-social-link__copy">
              <strong>{social.label}</strong>
              {!compact && <small>Visit profile</small>}
            </span>
            <ExternalLink size={15} className="business-social-link__external" aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  )
}

export function getSocialDefinitions() {
  return SOCIALS
}
