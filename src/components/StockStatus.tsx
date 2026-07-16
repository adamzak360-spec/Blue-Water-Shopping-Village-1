import './StockStatus.css'

interface StockStatusProps {
  stock: number
  lowStockThreshold?: number
  showLabel?: boolean
  size?: 'small' | 'medium' | 'large'
}

/**
 * StockStatus Component
 * Updated to match approved compact design:
 * - Rounded pill shape
 * - Green background
 * - Green text
 * - No icon
 */
export default function StockStatus({
  stock,
  lowStockThreshold = 5,
  showLabel = true,
  size = 'small'
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
    return `${stock} in stock`
  }

  return (
    <div className={`${getStatusClass()} size-${size}`}>
      {showLabel && <span className="stock-label">{getStatusText()}</span>}
    </div>
  )
}
