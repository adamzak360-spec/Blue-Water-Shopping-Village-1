interface LoadingSpinnerProps {
  message?: string
  size?: 'small' | 'medium' | 'large'
  fullPage?: boolean
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
  fullPage = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: '20px',
    medium: '40px',
    large: '60px',
  }

  const containerStyle = fullPage
    ? {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '50vh',
        gap: '1rem',
        color: '#6b7280',
      }
    : {
        display: 'inline-flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: '0.5rem',
        padding: '1rem',
      }

  return (
    <div style={containerStyle}>
      <div
        className="spinner"
        style={{
          width: sizeClasses[size],
          height: sizeClasses[size],
          borderWidth: size === 'small' ? '2px' : size === 'large' ? '4px' : '3px',
        }}
      />
      <span style={{ fontSize: size === 'small' ? '0.8rem' : '0.9rem' }}>{message}</span>
    </div>
  )
}
