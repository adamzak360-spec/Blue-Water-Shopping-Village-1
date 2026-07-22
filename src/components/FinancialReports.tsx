import { useState, useEffect } from 'react'
import {
  getRevenueReport,
  getDailySalesReport,
  getWeeklySalesReport,
  getMonthlySalesReport,
  getYearlySalesReport,
  getSalesByCategory,
  getBestSellingProducts,
  getLeastSellingProducts,
  getTopCustomersBySpending,
  exportSalesReportCSV,
  DailySalesReport,
  CategorySalesReport,
  ProductPerformance,
  CustomerSpending
} from '../services/adminAnalyticsService'
import { formatCurrency } from '../utils/currency'

export default function FinancialReports() {
  const [activeReport, setActiveReport] = useState<'revenue' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'category' | 'best' | 'least' | 'customers'>('revenue')
  const [revenueData, setRevenueData] = useState<any>(null)
  const [dailyData, setDailyData] = useState<DailySalesReport[]>([])
  const [weeklyData, setWeeklyData] = useState<DailySalesReport[]>([])
  const [monthlyData, setMonthlyData] = useState<DailySalesReport[]>([])
  const [yearlyData, setYearlyData] = useState<DailySalesReport[]>([])
  const [categoryData, setCategoryData] = useState<CategorySalesReport[]>([])
  const [bestProducts, setBestProducts] = useState<ProductPerformance[]>([])
  const [leastProducts, setLeastProducts] = useState<ProductPerformance[]>([])
  const [topCustomers, setTopCustomers] = useState<CustomerSpending[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError('')
      try {
        const [revenue, daily, weekly, monthly, yearly, category, best, least, customers] = await Promise.all([
          getRevenueReport(),
          getDailySalesReport(30),
          getWeeklySalesReport(),
          getMonthlySalesReport(),
          getYearlySalesReport(),
          getSalesByCategory(),
          getBestSellingProducts(10),
          getLeastSellingProducts(10),
          getTopCustomersBySpending(10)
        ])
        setRevenueData(revenue)
        setDailyData(daily)
        setWeeklyData(weekly)
        setMonthlyData(monthly)
        setYearlyData(yearly)
        setCategoryData(category)
        setBestProducts(best)
        setLeastProducts(least)
        setTopCustomers(customers)
      } catch (err) {
        setError('Failed to load reports')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleExportSalesReport = async () => {
    try {
      const csv = await exportSalesReportCSV(30)
      downloadCSV(csv, `sales-report-${new Date().toISOString().split('T')[0]}.csv`)
    } catch (err) {
      console.error('Failed to export sales report:', err)
    }
  }

  if (isLoading) return (
    <div className="loading-container">
      <div className="spinner" />
      <p>Loading reports...</p>
    </div>
  )
  if (error) return <div className="error-state">{error}</div>

  return (
    <div className="financial-reports animate-fade-in">
      <div className="report-header">
        <div className="report-nav-wrapper">
          <div className="report-tabs-scroll">
            <button className={`report-tab ${activeReport === 'revenue' ? 'active' : ''}`} onClick={() => setActiveReport('revenue')}>Revenue</button>
            <button className={`report-tab ${activeReport === 'daily' ? 'active' : ''}`} onClick={() => setActiveReport('daily')}>Daily</button>
            <button className={`report-tab ${activeReport === 'weekly' ? 'active' : ''}`} onClick={() => setActiveReport('weekly')}>Weekly</button>
            <button className={`report-tab ${activeReport === 'monthly' ? 'active' : ''}`} onClick={() => setActiveReport('monthly')}>Monthly</button>
            <button className={`report-tab ${activeReport === 'yearly' ? 'active' : ''}`} onClick={() => setActiveReport('yearly')}>Yearly</button>
            <button className={`report-tab ${activeReport === 'category' ? 'active' : ''}`} onClick={() => setActiveReport('category')}>Categories</button>
            <button className={`report-tab ${activeReport === 'best' ? 'active' : ''}`} onClick={() => setActiveReport('best')}>Best Sellers</button>
            <button className={`report-tab ${activeReport === 'least' ? 'active' : ''}`} onClick={() => setActiveReport('least')}>Least Sellers</button>
            <button className={`report-tab ${activeReport === 'customers' ? 'active' : ''}`} onClick={() => setActiveReport('customers')}>Top Customers</button>
          </div>
        </div>
        <button onClick={handleExportSalesReport} className="btn-primary btn-sm btn-export" title="Export sales report as CSV">
          Export CSV
        </button>
      </div>

      <div className="report-content">
        {activeReport === 'revenue' && revenueData && (
          <div className="revenue-report animate-fade-in">
            <div className="section-title-wrapper">
              <h3 className="section-title">Revenue Overview</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-card stat-total">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                  <span className="stat-label">Total Revenue</span>
                  <span className="stat-value">{formatCurrency(revenueData.totalRevenue)}</span>
                </div>
              </div>
              <div className="stat-card stat-active">
                <div className="stat-icon">📦</div>
                <div className="stat-info">
                  <span className="stat-label">Total Orders</span>
                  <span className="stat-value">{revenueData.totalOrders}</span>
                </div>
              </div>
              <div className="stat-card stat-out-of-stock">
                <div className="stat-icon">📈</div>
                <div className="stat-info">
                  <span className="stat-label">Avg Order Value</span>
                  <span className="stat-value">{formatCurrency(revenueData.averageOrderValue)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeReport === 'daily' && (
          <div className="sales-report">
            <h3>Daily Sales Report (Last 30 Days)</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sales</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{formatCurrency(row.sales)}</td>
                    <td>{row.orders}</td>
                    <td>{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'weekly' && (
          <div className="sales-report">
            <h3>Weekly Sales Report</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Week Starting</th>
                  <th>Sales</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{formatCurrency(row.sales)}</td>
                    <td>{row.orders}</td>
                    <td>{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'monthly' && (
          <div className="sales-report">
            <h3>Monthly Sales Report</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sales</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{formatCurrency(row.sales)}</td>
                    <td>{row.orders}</td>
                    <td>{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'yearly' && (
          <div className="sales-report">
            <h3>Yearly Sales Report</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Sales</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.date}</td>
                    <td>{formatCurrency(row.sales)}</td>
                    <td>{row.orders}</td>
                    <td>{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'category' && (
          <div className="sales-report">
            <h3>Sales by Category</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Sales</th>
                  <th>Orders</th>
                  <th>Products Sold</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.category}</td>
                    <td>{formatCurrency(row.totalSales)}</td>
                    <td>{row.totalOrders}</td>
                    <td>{row.totalProductsSold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'best' && (
          <div className="sales-report">
            <h3>Best Selling Products</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Total Sold</th>
                  <th>Total Revenue</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {bestProducts.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.productName}</td>
                    <td>{row.category}</td>
                    <td>{row.totalSold}</td>
                    <td>{formatCurrency(row.totalRevenue)}</td>
                    <td>{formatCurrency(row.averagePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'least' && (
          <div className="sales-report">
            <h3>Least Selling Products</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Total Sold</th>
                  <th>Total Revenue</th>
                  <th>Avg Price</th>
                </tr>
              </thead>
              <tbody>
                {leastProducts.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.productName}</td>
                    <td>{row.category}</td>
                    <td>{row.totalSold}</td>
                    <td>{formatCurrency(row.totalRevenue)}</td>
                    <td>{formatCurrency(row.averagePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === 'customers' && (
          <div className="sales-report">
            <h3>Top Customers by Spending</h3>
            <table className="report-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Total Spent</th>
                  <th>Orders</th>
                  <th>Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.customerName}</td>
                    <td>{row.customerEmail}</td>
                    <td>{formatCurrency(row.totalSpent)}</td>
                    <td>{row.orderCount}</td>
                    <td>{formatCurrency(row.averageOrderValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
