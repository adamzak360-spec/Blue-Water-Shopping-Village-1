import { useEffect, useState } from 'react'
import { getPublicAds, recordAdClick, recordAdImpression, type AdPlacement, type Advertisement } from '../services/adService'
import './AdSlot.css'

interface AdSlotProps {
  placement: AdPlacement
  className?: string
}

export default function AdSlot({ placement, className = '' }: AdSlotProps) {
  const [ads, setAds] = useState<Advertisement[]>([])

  useEffect(() => {
    let cancelled = false
    void getPublicAds(placement, 2).then((result) => {
      if (!cancelled) setAds(result)
    })
    return () => { cancelled = true }
  }, [placement])

  useEffect(() => {
    ads.forEach((ad) => { void recordAdImpression(ad.id) })
  }, [ads])

  if (ads.length === 0) return null

  return (
    <aside className={`reliable-ad-slot ${className}`} aria-label="Advertisement">
      {ads.map((ad) => (
        <a
          className="reliable-ad-card"
          href={ad.destination_url}
          key={ad.id}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={() => { void recordAdClick(ad.id) }}
        >
          {ad.image_url && <img src={ad.image_url} alt="" loading="lazy" />}
          <div className="reliable-ad-copy">
            <span className="reliable-ad-label">Advertisement</span>
            <strong>{ad.headline}</strong>
            {ad.description && <span>{ad.description}</span>}
          </div>
        </a>
      ))}
    </aside>
  )
}
