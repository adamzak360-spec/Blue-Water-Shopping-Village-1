import './StaticPages.css'

export default function Delivery() {
  return (
    <div className="static-page policy-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Delivery Information</h1>
          <p className="hero-subtitle">What to expect from delivery</p>
          <p className="page-date">Last updated: August 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Delivery Areas</h2>
            <p>
              Reliable supports delivery in Ghana and other supported markets, subject to the product,
              seller, destination, courier availability, and the delivery options shown at checkout. Our
              primary operations are based in Tamale, Northern Region, and sellers or logistics partners
              may serve other local or international locations where configured and available.
            </p>
            <p>
              Sellers and administrators may define delivery methods, service areas, pickup options,
              estimated timeframes, and fees for the locations they serve. Coverage, delivery times, and
              fees may differ between seller stores and products. Always review the delivery information
              shown for your order before confirming checkout.
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
                <h4>International orders</h4>
                <p>Based on destination and available carrier</p>
                <p className="info-note">Customs, border processes, carrier capacity, and local delivery conditions may affect timing.</p>
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
              Delivery fees are configured from the destination, delivery area, selected method, order,
              seller, product, currency, and logistics requirements. The applicable fee should be displayed
              at checkout before you confirm the order. A seller or administrator may set a custom fee,
              free-delivery threshold, pickup charge, or location-specific rate. The standard reference
              fee within Tamale is GH₵15.00 only where the checkout page presents that rate; other
              locations, currencies, methods, or orders may have different fees.
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
                <strong>Dispatch</strong> — The seller, Reliable, or a logistics partner prepares and
                coordinates dispatch through the selected method where the available service permits.
              </li>
              <li>
                <strong>Progress updates</strong> — Your account may show stages such as Processing,
                Ready for Pickup, Out for Delivery, and Delivered. Status changes may also appear in the
                notification bell and be sent by email.
              </li>
              <li>
                <strong>Delivery and confirmation</strong> — The order is delivered or made available
                for pickup according to the selected method. Keep your phone available, inspect the
                order promptly, and confirm receipt in your account when requested.
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
              <li>For international orders, follow any applicable customs, import, identification, or local carrier requirements.</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>Failed or Delayed Delivery</h2>
            <p>
              If a delivery fails because an address is incomplete, access is unavailable, the phone
              cannot be reached, customs or carrier requirements are incomplete, or the order is not
              accepted, additional attempts, a revised fee, return-to-seller handling, or cancellation
              may apply. Contact us promptly if an order is late, missing, partially delivered, or marked
              delivered incorrectly so we can investigate with the seller and delivery provider. A
              delivery dispute may affect the timing of customer confirmation and seller settlement while
              it is reviewed.
            </p>
          </section>

          <section className="content-section">
            <h2>Contact Us</h2>
            <p>
              For delivery questions or an order that has not arrived, contact:
            </p>
            <p>
              <strong>Email:</strong> support@reliable.com<br />
              <strong>Phone:</strong> +233 59 560 9966<br />
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
