import './StaticPages.css'

export default function Delivery() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Delivery Information</h1>
          <p className="hero-subtitle">Everything you need to know about our delivery services</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Delivery Areas</h2>
            <p>
              Reliable currently delivers to all areas within Tamale and surrounding communities. 
              This includes but is not limited to Tamale Central, Nyohini, Lamashegu, Vittin, 
              Kumbungu, Savelugu, and other areas within the Northern Region.
            </p>
            <p>
              We are actively working on expanding our delivery network to cover additional
              cities and regions across Ghana. Check back for updates on new delivery zones.
            </p>
          </section>

          <section className="content-section">
            <h2>Delivery Times</h2>
            <div className="info-grid">
              <div className="info-card">
                <h4>Standard Delivery</h4>
                <p>Same day or next day delivery</p>
                <p className="info-note">Available for all areas within Tamale</p>
              </div>
              <div className="info-card">
                <h4>Processing Time</h4>
                <p>Orders are processed within 2 hours</p>
                <p className="info-note">Orders placed before 4:00 PM are processed the same day</p>
              </div>
              <div className="info-card">
                <h4>Delivery Window</h4>
                <p>8:00 AM - 8:00 PM</p>
                <p className="info-note">Monday through Saturday</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Delivery Fees</h2>
            <p>
              Our delivery fees are designed to be fair and transparent. The standard delivery
              fee is GH₵5.00 for orders within Tamale. Delivery fees are
              calculated based on your location and displayed clearly at checkout before you
              confirm your order.
            </p>
            <div className="info-card" style={{ maxWidth: '600px' }}>
              <h4>Standard Delivery Fee</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>GH₵5.00</p>
              <p className="info-note">Within Tamale. Fees may vary for areas outside the standard zone.</p>
            </div>
          </section>

          <section className="content-section">
            <h2>How Delivery Works</h2>
            <ol className="steps-list">
              <li>
                <strong>Place Your Order</strong> — Browse our catalogue, add items to your cart,
                and complete the checkout process.
              </li>
              <li>
                <strong>Order Processing</strong> — Our team picks and packs your items with care,
                ensuring freshness and quality.
              </li>
              <li>
                <strong>Dispatch</strong> — Your order is dispatched and assigned to a delivery
                rider in your area.
              </li>
              <li>
                <strong>Delivery</strong> — Your order arrives at your specified address.
                You will receive notification updates throughout the process.
              </li>
            </ol>
          </section>

          <section className="content-section">
            <h2>Important Notes</h2>
            <ul className="notes-list">
              <li>
                Ensure that the delivery address and phone number provided are accurate to avoid
                delays or failed delivery attempts.
              </li>
              <li>
                If you are not available at the delivery address, the rider will attempt to contact
                you. Unclaimed orders may be returned to our facility.
              </li>
              <li>
                For perishable items, we take extra care with packaging and handling to ensure
                products arrive in optimal condition.
              </li>
              <li>
                Delivery times may be affected by weather conditions, traffic, or high order volume
                during peak periods.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
