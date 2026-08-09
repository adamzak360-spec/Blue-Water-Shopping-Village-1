import { Link } from 'react-router-dom'
import './About.css'

const customerSteps = [
  { number: '1', title: 'Discover', text: 'Browse products, categories, and registered stores on Reliable.' },
  { number: '2', title: 'Browse', text: 'Visit a seller storefront and explore the products they offer.' },
  { number: '3', title: 'Choose', text: 'Review product details, add what you need to your cart, and choose where to shop.' },
  { number: '4', title: 'Order', text: 'Complete checkout and manage your order through the platform.' },
]

const businessSteps = [
  { number: '1', title: 'Register', text: 'Create a business account on Reliable.' },
  { number: '2', title: 'Create your store', text: 'Set up your public storefront with your business information.' },
  { number: '3', title: 'Add products', text: 'Upload products, images, prices, categories, and stock information.' },
  { number: '4', title: 'Manage orders', text: 'Use your seller dashboard to manage products, inventory, and store orders.' },
]

export default function About() {
  return (
    <div className="about-page static-page">
      <div className="static-page-container">
        <section className="about-hero page-hero">
          <span className="about-eyebrow">RELIABLE MARKETPLACE</span>
          <h1>One platform for shopping and growing online</h1>
          <p className="hero-subtitle">
            Reliable connects customers with products and businesses with the tools to create and manage their own online stores.
          </p>
          <div className="about-hero-actions">
            <Link className="about-primary-action" to="/stores">Discover stores</Link>
            <Link className="about-secondary-action" to="/seller/register">Start selling</Link>
          </div>
        </section>

        <div className="page-content">
          <section className="content-section about-intro">
            <span className="about-section-label">ABOUT RELIABLE</span>
            <h2>Shopping and business, connected</h2>
            <p>
              Reliable is an e-commerce platform with two connected sides. Customers can shop from a shared marketplace and discover independent stores, while businesses can create and manage their own public storefronts on the same platform.
            </p>
            <p>
              This means a visitor can find a product through the main Reliable marketplace, or visit a particular business store directly. Each seller has a dedicated storefront where customers can learn about the business and browse its products.
            </p>
          </section>

          <section className="content-section">
            <span className="about-section-label">WHAT WE DO</span>
            <h2>A marketplace with independent online stores</h2>
            <div className="about-model-grid">
              <article className="about-model-card about-model-marketplace">
                <div className="about-model-icon">M</div>
                <h3>Reliable Marketplace</h3>
                <p>
                  A shared shopping space where customers can browse products, search by need, explore categories, discover registered businesses, and choose what to order.
                </p>
                <Link to="/products">Browse products</Link>
              </article>
              <article className="about-model-card about-model-store">
                <div className="about-model-icon">S</div>
                <h3>Independent Seller Stores</h3>
                <p>
                  Public online stores created and managed by businesses on Reliable. Customers can visit a store directly, view its products, and shop from that seller.
                </p>
                <Link to="/stores">Explore stores</Link>
              </article>
            </div>
          </section>

          <section className="content-section">
            <span className="about-section-label">FOR CUSTOMERS</span>
            <h2>Find products and businesses with confidence</h2>
            <p>
              Reliable gives customers a convenient place to discover products and the businesses behind them. You can start with a product search, browse a category, or explore stores and then continue to a seller's storefront.
            </p>
            <div className="about-highlight">Browse → Discover a store → View products → Order</div>
            <p>
              Whether you are shopping from Tamale, elsewhere in Ghana, or from another supported location, the experience is designed to be simple: find what you need, review the details, add it to your cart, and complete your order through the available checkout process.
            </p>
          </section>

          <section className="content-section">
            <span className="about-section-label">FOR BUSINESSES</span>
            <h2>Build an online presence without starting from scratch</h2>
            <p>
              Businesses do not need to build a complete e-commerce system on their own. Reliable provides the foundation for creating an online store, presenting products, managing inventory, and handling orders from a seller dashboard.
            </p>
            <div className="about-benefits-grid">
              <div><strong>Create your store</strong><span>Present your business through an independent public storefront.</span></div>
              <div><strong>Manage products</strong><span>Add product information, images, prices, categories, and stock.</span></div>
              <div><strong>Manage orders</strong><span>Review and manage customer orders related to your store.</span></div>
              <div><strong>Reach more shoppers</strong><span>Make your store discoverable through both its own link and the Reliable marketplace.</span></div>
            </div>
            <Link className="about-inline-action" to="/seller/register">Register your business</Link>
          </section>

          <section className="content-section">
            <span className="about-section-label">HOW RELIABLE WORKS</span>
            <div className="about-workflow-grid">
              <div>
                <h2>For customers</h2>
                <ol className="about-step-list">
                  {customerSteps.map((step) => (
                    <li key={step.number}>
                      <span className="about-step-number">{step.number}</span>
                      <span><strong>{step.title}</strong>{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <h2>For businesses</h2>
                <ol className="about-step-list">
                  {businessSteps.map((step) => (
                    <li key={step.number}>
                      <span className="about-step-number">{step.number}</span>
                      <span><strong>{step.title}</strong>{step.text}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="content-section about-goal-section">
            <span className="about-section-label">OUR GOAL</span>
            <h2>Make digital commerce more accessible</h2>
            <p>
              Our goal is to make it easier for customers to find trustworthy businesses online and easier for businesses to establish a practical digital presence. Reliable is being built as a connected place where people can shop, businesses can manage their stores, and both sides can take part in online commerce with clarity.
            </p>
            <p>
              We are focused on building useful tools, clear customer experiences, and a marketplace that can grow with the businesses and communities it serves.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
