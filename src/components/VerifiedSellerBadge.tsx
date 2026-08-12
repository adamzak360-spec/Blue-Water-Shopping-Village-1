import { CheckCircle } from 'lucide-react'

type VerifiedSellerBadgeProps = {
  status?: string | null
  compact?: boolean
}

export default function VerifiedSellerBadge({ status, compact = false }: VerifiedSellerBadgeProps) {
  if (status !== 'approved') return null

  return (
    <span
      title="Reliable has reviewed and approved this seller"
      aria-label="Verified Seller: reviewed and approved by Reliable"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '4px' : '6px',
        padding: compact ? '4px 8px' : '6px 10px',
        borderRadius: '999px',
        background: '#ecfdf5',
        color: '#047857',
        border: '1px solid #a7f3d0',
        fontSize: compact ? '0.72rem' : '0.8rem',
        fontWeight: 800,
        letterSpacing: '0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <CheckCircle size={compact ? 14 : 16} aria-hidden="true" />
      VERIFIED SELLER
    </span>
  )
}
