import { Link } from 'react-router-dom'
import './About.css'

const customerSteps = [
  { number: '1', title: 'Discover', text: 'Browse products, categories, and registered stores on Reliable.' },
  { number: '2', title: 'Explore Stores', text: 'Visit a seller storefront and explore the products they offer.' },
  { number: '3', title: 'Choose Products', text: 'Review specifications, sizes, variants, stock, delivery options, and seller information before adding products to your cart.' },
  { number: '4', title: 'Pay &amp; Order', text: 'Complete checkout with secure online payment through Paystack by card, mobile money, or bank transfer. Once payment is verified, the seller is notified and your order is recorded in your account.' },
  { number: '5', title: 'Track &amp; Confirm', text: 'Watch the order progress (Processing, Dispatch, Out for Delivery, Delivered) in your account, chat with the seller if you have questions, and confirm receipt once your order arrives.' },
]

const businessSteps = [
  { number: '1', title: 'Register', text: 'Create a business account on Reliable.' },
  { number: '2', title: 'Create Store', text: 'Set up your public storefront with your business information.' },
  { number: '3', title: 'Add Products', text: 'Upload products, images, prices, categories, specifications, variants, delivery settings, and stock information.' },
  { number: '4', title: 'Manage &amp; Grow', text: 'Use the seller dashboard to manage products, orders, delivery settings, payouts, and promotions. Complete your business verification and payout profile so you can receive settled funds.' },
]

const benefits = [
  {
    title: 'Global Marketplace',
    description: 'Customers can discover products and independent stores across supported countries, currencies, and delivery areas.'
  },
  {
    title: 'Flexible Seller Tools',
    description: 'Sellers can manage products, specifications, sizes, variants, stock, orders, delivery options, and storefront content.'
  },
  {
    title: 'Secure and Clear',
    description: 'Verification, protected checkout, order-stage updates, and clear policy information help both sides trade with confidence.'
  },
  {
    title: 'Built to Grow',
    description: 'Businesses can use their dashboard, subscribed POS tools, notifications, and payout workflow as their operations expand.'
  }
]

export default function About() {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="about-hero-content">
          <h1>About Reliable</h1>
          <p className="hero-subtitle">
            Reliable is a global multi-vendor marketplace connecting customers with independent businesses and giving sellers practical tools to build, operate, and grow their digital stores.
          </p>
          <div className="hero-cta">
            <Link to="/stores" className="about-cta-primary">Browse Stores</Link>
            <Link to="/seller/register" className="about-cta-secondary">Start Selling</Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="about-container">
        
        {/* What is Reliable */}
        <section className="about-section">
          <div className="section-header">
            <h2>What is Reliable?</h2>
            <p>A marketplace with two connected sides</p>
          </div>
          <div className="model-cards">
            <article className="model-card">
              <div className="card-icon">M</div>
              <h3>Reliable Marketplace</h3>
              <p>
                A shared shopping space where customers can browse products, compare categories and stores, review product specifications and variants, select available delivery options, and place orders through supported payment methods.
              </p>
              <Link to="/products" className="card-link">Browse Products →</Link>
            </article>
            <article className="model-card">
              <div className="card-icon">S</div>
              <h3>Independent Seller Stores</h3>
              <p>
                Public online stores created and managed by businesses on Reliable. Sellers can publish product details, custom specifications, prices, stock, delivery options, and store information for customers to review.
              </p>
              <Link to="/stores" className="card-link">Explore Stores →</Link>
            </article>
          </div>
        </section>

        {/* For Customers */}
        <section className="about-section">
          <div className="section-header">
            <h2>For Customers</h2>
            <p>Find products and businesses with confidence</p>
          </div>
          <div className="section-content">
            <p>
              Reliable gives customers a convenient place to discover products and the businesses behind them. You can search the marketplace, browse categories, explore stores, compare product details and available variants, then continue through checkout with the payment and delivery choices available for your location.
            </p>
            <div className="flow-diagram">
              <span className="flow-step">Browse</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">Discover Stores</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">View Products</span>
              <span className="flow-arrow">→</span>
              <span className="flow-step">Order</span>
            </div>
            <p>
              Whether you are shopping from Tamale, elsewhere in Ghana, or from another supported location, the experience is designed to be clear: find what you need, review the seller and product details, choose the available delivery method, pay in a supported currency, and follow the order through your customer account. Order-stage updates are available through the account notification bell and email when enabled for the order.
            </p>
          </div>
        </section>

        {/* For Businesses */}
        <section className="about-section">
          <div className="section-header">
            <h2>For Businesses</h2>
            <p>Build an online presence without starting from scratch</p>
          </div>
          <div className="section-content">
            <p>
              Businesses do not need to build a complete e-commerce system on their own. Reliable provides the foundation for creating an online store, presenting products with flexible specifications and variants, managing inventory, handling orders, configuring delivery methods, and serving customers through a seller dashboard.
            </p>
            <div className="benefits-grid">
              <div className="benefit-item">
                <h4>Create Your Store</h4>
                <p>Present your business through an independent public storefront.</p>
              </div>
              <div className="benefit-item">
                <h4>Manage Products</h4>
                <p>Add product information, images, categories, prices, specifications, sizes, variants, and stock.</p>
              </div>
              <div className="benefit-item">
                <h4>Manage Orders</h4>
                <p>Review processing stages, delivery progress, customer confirmations, notifications, and payout status.</p>
              </div>
              <div className="benefit-item">
                <h4>Reach More Shoppers</h4>
                <p>Make your store discoverable through the marketplace, its own storefront link, and supported global channels.</p>
              </div>
            </div>
            <Link to="/seller/register" className="section-cta">Register Your Business</Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="about-section">
          <div className="section-header">
            <h2>How Reliable Works</h2>
            <p>Simple steps for customers and businesses</p>
          </div>
          <div className="workflow-grid">
            <div className="workflow-column">
              <h3>For Customers</h3>
              <ol className="step-list">
                {customerSteps.map((step) => (
                  <li key={step.number}>
                    <span className="step-number">{step.number}</span>
                    <div className="step-content">
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <div className="workflow-column">
              <h3>For Businesses</h3>
              <ol className="step-list">
                {businessSteps.map((step) => (
                  <li key={step.number}>
                    <span className="step-number">{step.number}</span>
                    <div className="step-content">
                      <strong>{step.title}</strong>
                      <p>{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Why Reliable */}
        <section className="about-section">
          <div className="section-header">
            <h2>Why Reliable?</h2>
            <p>Practical infrastructure for local and international commerce</p>
          </div>
          <div className="benefits-showcase">
            {benefits.map((benefit, index) => (
              <div key={index} className="benefit-card">
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Our Goal */}
        <section className="about-section about-goal">
          <div className="section-header">
            <h2>Our Goal</h2>
            <p>Make digital commerce more accessible</p>
          </div>
          <div className="section-content">
            <p>
              Our goal is to make it easier for customers to find trustworthy businesses online and easier for businesses to establish a practical digital presence. Reliable brings marketplace discovery, independent stores, flexible seller tools, supported international payments, delivery choices, and customer order visibility into one connected experience. In-app chat lets customers talk directly with sellers about products and orders, verified stores carry a visible Verified badge, and every order is traceable from payment to delivery confirmation in your account.
            </p>
            <p>
              We are focused on building useful tools, clear customer experiences, and dependable processes—from product discovery and checkout to delivery confirmation, notifications, and seller settlement—that can grow with the businesses and communities we serve.
            </p>
          </div>
        </section>

        {/* Payments & Countries */}
        <section className="about-section">
          <div className="section-header">
            <h2>Payments, Supported Countries &amp; Currencies</h2>
            <p>Secure online checkout powered by Paystack</p>
          </div>
          <div className="section-content">
            <p>
              Online payments on Reliable are processed securely through Paystack, a trusted
              pan-African payment provider. When you check out, you can pay by <strong>card,
              mobile money, or bank transfer</strong> in the currency shown for your order.
            </p>
            <p>
              Reliable is expanding across West Africa. Today we serve all West African countries
              where registered sellers have live stores, and we are adding more countries and
              stores as sellers join each new market. For payments specifically, our payment
              partner Paystack currently operates in <strong>Ghana, Nigeria, Kenya, South
              Africa, the United States, the United Arab Emirates, and Côte d'Ivoire</strong>,
              so online checkout by card, mobile money, or bank transfer is fully supported
              in those markets, with the options shown at checkout applying to your order.
            </p>
            <div className="info-grid">
              <div className="info-card">
                <h4>Supported countries</h4>
                <p><strong>All West African countries where registered sellers have live stores</strong></p>
                <p className="info-note">Our primary operations are based in Tamale, Ghana, and we are expanding store by store across West Africa as sellers register in each market. Other regions will follow as we grow.</p>
              </div>
              <div className="info-card">
                <h4>Supported currencies</h4>
                <p><strong>GHS, NGN, KES, ZAR (plus USD and GBP card payments)</strong></p>
                <p className="info-note">Paystack's payment processing currently covers GHS (Ghana), NGN (Nigeria), KES (Kenya), and ZAR (South Africa), with USD and GBP card payments; each store's currency is shown on its storefront and at checkout.</p>
              </div>
            </div>
            <p>
              For sellers, funds from completed orders are settled through the payout workflow.
              Verified sellers registered in Ghana with a GHS (cedi) store can qualify for
              automated Paystack payouts once their payout profile and business verification are
              approved. Sellers in other supported countries are currently settled manually until
              an approved payout route is available for their location.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="about-final-cta">
          <h2>Ready to Get Started?</h2>
          <p>Join customers and businesses building their next stage of commerce with Reliable</p>
          <div className="final-cta-buttons">
            <Link to="/products" className="btn-shop">Shop Now</Link>
            <Link to="/stores" className="btn-browse">Browse Stores</Link>
            <Link to="/seller/register" className="btn-sell">Start Selling</Link>
          </div>
        </section>

      </div>
    </div>
  )
}
