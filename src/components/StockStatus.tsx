import './StockStatus.css'

interface StockStatusProps {
  stock: number
  lowStockThreshold?: number
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
}

/**
 * StockStatus Component
 * Displays product stock status with visual indicators
 * - Green: In stock (above threshold)
 * - Yellow: Low stock (at or below threshold)
 * - Red: Out of stock
 */
export default function StockStatus({
  stock,
  lowStockThreshold = 5,
  showLabel = true,
  size = 'medium'
}: StockStatusProps) {
  const isOutOfStock = stock === 0
  const isLowStock = stock > 0 && stock <= lowStockThreshold

  const getStatusClass = () => {
    if (isOutOfStock) return 'stock-status out-of-stock'
    if (isLowStock) return 'stock-status low-stock'
    return 'stock-status in-stock'
  }

  const getStatusText = () => {
    if (isOutOfStock) return 'Out of Stock'
    if (isLowStock) return `Low Stock (${stock})`
    return `${stock} in stock`
  }

  const getStatusIcon = () => {
    if (isOutOfStock) return '✕'
    if (isLowStock) return '⚠'
    return '✓'
  }

  return (
    <div className={`${getStatusClass()} size-${size}`}>
      <span className="stock-icon">{getStatusIcon()}</span>
      {showLabel && <span className="stock-label">{getStatusText()}</span>}
    </div>
  )
}
