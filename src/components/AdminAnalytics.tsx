import { useState, useEffect } from 'react'
import { getSalesAnalytics, SalesStats } from '../services/adminAnalyticsService'
import { formatCurrency } from '../utils/currency'

export default function AdminAnalytics() {
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getSalesAnalytics()
        setStats(data)
      } catch (err) {
        setError('Failed to load analytics data')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  if (isLoading) return <div className="loading">Loading analytics...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!stats) return null

  return (
    <div className="analytics-container">
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-label">Today's Sales</div>
          <div className="stat-value">{formatCurrency(stats.todaySales)}</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-label">Yesterday's Sales</div>
          <div className="stat-value">{formatCurrency(stats.yesterdaySales)}</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-label">This Week</div>
          <div className="stat-value">{formatCurrency(stats.thisWeekSales)}</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{formatCurrency(stats.thisMonthSales)}</div>
        </div>
        <div className="stat-card revenue">
          <div className="stat-label">This Year</div>
          <div className="stat-value">{formatCurrency(stats.thisYearSales)}</div>
        </div>
        <div className="stat-card total">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(stats.totalRevenue)}</div>
        </div>
        <div className="stat-card orders">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{stats.totalOrders}</div>
        </div>
        <div className="stat-card value">
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-value">{formatCurrency(stats.averageOrderValue)}</div>
        </div>
        <div className="stat-card products">
          <div className="stat-label">Products Sold</div>
          <div className="stat-value">{stats.totalProductsSold}</div>
        </div>
      </div>
    </div>
  )
}
