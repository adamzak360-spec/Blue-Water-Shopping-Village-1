import './StaticPages.css'

export default function Delivery() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Delivery Information</h1>
          <p className="hero-subtitle">Where we deliver, how timing works, and what to expect after checkout</p>
          <p className="page-date">Last updated: August 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Delivery Areas</h2>
            <p>
              Reliable supports delivery across Ghana, subject to the product, seller, destination,
              courier availability, and the delivery options shown at checkout. Our primary operations
              are based in Tamale, Northern Region. We also work with logistics partners where
              available for other locations.
            </p>
            <p>
              Coverage, delivery times, and fees may differ between seller stores and products.
              Always review the delivery information shown for your order before confirming checkout.
            </p>
          </section>

          <section className="content-section">
            <h2>Delivery Times</h2>
            <div className="info-grid">
              <div className="info-card">
                <h4>Tamale</h4>
                <p>Often same-day or next-day delivery</p>
                <p className="info-note">Subject to seller processing, stock, address, and rider availability.</p>
              </div>
              <div className="info-card">
                <h4>Other locations</h4>
                <p>Usually 1–3 business days or longer</p>
                <p className="info-note">Timing varies by distance, route, seller, courier, and logistics conditions.</p>
              </div>
              <div className="info-card">
                <h4>Delivery window</h4>
                <p>Generally 8:00 AM–8:00 PM</p>
                <p className="info-note">Monday through Saturday, unless a different arrangement is confirmed.</p>
              </div>
            </div>
            <p>
              Delivery timeframes are estimates rather than guaranteed deadlines. Weather, traffic,
              holidays, high demand, stock issues, seller processing, courier capacity, security
              conditions, and inaccurate delivery details may affect timing.
            </p>
          </section>

          <section className="content-section">
            <h2>Delivery Fees</h2>
            <p>
              Delivery fees are calculated from the destination, order, seller, product, and logistics
              requirements. The applicable fee should be displayed at checkout before you confirm the
              order. The standard reference fee within Tamale is GH₵15.00 where the checkout page
              presents that rate; other locations or orders may have different fees.
            </p>
            <div className="info-card" style={{ maxWidth: '600px' }}>
              <h4>Reference Tamale fee</h4>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>GH₵15.00</p>
              <p className="info-note">The checkout total is the controlling amount for the order before confirmation.</p>
            </div>
          </section>

          <section className="content-section">
            <h2>How Delivery Works</h2>
            <ol className="steps-list">
              <li>
                <strong>Place your order</strong> — Review the seller, products, address, delivery
                option, fees, and total before confirming checkout.
              </li>
              <li>
                <strong>Seller processing</strong> — The relevant seller prepares the products and
                confirms availability for fulfilment.
              </li>
              <li>
                <strong>Dispatch</strong> — Reliable or a logistics partner coordinates dispatch and
                delivery where the available service permits.
              </li>
              <li>
                <strong>Delivery</strong> — The order is delivered to the address provided. Keep your
                phone available in case the seller or delivery team needs directions or confirmation.
              </li>
            </ol>
          </section>

          <section className="content-section">
            <h2>Your Responsibilities</h2>
            <ul className="notes-list">
              <li>Provide a complete address, accurate phone number, and useful delivery directions.</li>
              <li>Be available to receive the order or arrange a safe authorised recipient.</li>
              <li>Check the package and products promptly and report a problem under the Return &amp; Refund Policy.</li>
              <li>Do not provide false delivery details or use an address where receipt is not authorised.</li>
              <li>Respond to reasonable contact from the seller, courier, or Reliable support team.</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>Failed or Delayed Delivery</h2>
            <p>
              If a delivery fails because an address is incomplete, access is unavailable, the phone
              cannot be reached, or the order is not accepted, additional attempts, a revised fee,
              return-to-seller handling, or cancellation may apply. Contact us promptly if an order is
              late, missing, partially delivered, or marked delivered incorrectly so we can investigate
              with the seller and delivery provider.
            </p>
          </section>

          <section className="content-section">
            <h2>Contact Us</h2>
            <p>
              For delivery questions or an order that has not arrived, contact:
            </p>
            <p>
              <strong>Email:</strong> support@reliable.com<br />
              <strong>Phone:</strong> +233 53 855 7781<br />
              <strong>Hours:</strong> Monday–Saturday, 8:00 AM–8:00 PM
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

// Working draft for legal and operational review before reliance or publication.
// Confirm actual delivery coverage, partner commitments, fees, and service-level promises before final use.
