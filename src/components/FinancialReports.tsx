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

  if (isLoading) return <div className="loading">Loading reports...</div>
  if (error) return <div className="error-message">{error}</div>

  return (
    <div className="financial-reports">
      <div className="report-tabs">
        <button className={`report-tab ${activeReport === 'revenue' ? 'active' : ''}`} onClick={() => setActiveReport('revenue')}>Revenue Report</button>
        <button className={`report-tab ${activeReport === 'daily' ? 'active' : ''}`} onClick={() => setActiveReport('daily')}>Daily Sales</button>
        <button className={`report-tab ${activeReport === 'weekly' ? 'active' : ''}`} onClick={() => setActiveReport('weekly')}>Weekly Sales</button>
        <button className={`report-tab ${activeReport === 'monthly' ? 'active' : ''}`} onClick={() => setActiveReport('monthly')}>Monthly Sales</button>
        <button className={`report-tab ${activeReport === 'yearly' ? 'active' : ''}`} onClick={() => setActiveReport('yearly')}>Yearly Sales</button>
        <button className={`report-tab ${activeReport === 'category' ? 'active' : ''}`} onClick={() => setActiveReport('category')}>By Category</button>
        <button className={`report-tab ${activeReport === 'best' ? 'active' : ''}`} onClick={() => setActiveReport('best')}>Best Sellers</button>
        <button className={`report-tab ${activeReport === 'least' ? 'active' : ''}`} onClick={() => setActiveReport('least')}>Least Sellers</button>
        <button className={`report-tab ${activeReport === 'customers' ? 'active' : ''}`} onClick={() => setActiveReport('customers')}>Top Customers</button>
      </div>

      <div className="report-content">
        {activeReport === 'revenue' && revenueData && (
          <div className="revenue-report">
            <h3>Revenue Report</h3>
            <div className="report-summary">
              <div className="summary-card">
                <span className="label">Total Revenue</span>
                <span className="value">{formatCurrency(revenueData.totalRevenue)}</span>
              </div>
              <div className="summary-card">
                <span className="label">Total Orders</span>
                <span className="value">{revenueData.totalOrders}</span>
              </div>
              <div className="summary-card">
                <span className="label">Average Order Value</span>
                <span className="value">{formatCurrency(revenueData.averageOrderValue)}</span>
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
