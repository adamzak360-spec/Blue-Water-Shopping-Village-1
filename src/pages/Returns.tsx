import './StaticPages.css'

export default function Returns() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Return &amp; Refund Policy</h1>
          <p className="hero-subtitle">Our commitment to your satisfaction</p>
          <p className="page-date">Last updated: July 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>1. Our Return Policy</h2>
            <p>
              At Blue Water Shopping Village, we want you to be completely satisfied with your
              purchase. If for any reason you are not satisfied, we are here to help. This
              policy outlines the conditions under which you may return products and receive
              a refund or replacement.
            </p>
          </section>

          <section className="content-section">
            <h2>2. Eligible Returns</h2>
            <p>You may return items under the following conditions:</p>
            <ul className="content-list">
              <li>
                <strong>Defective or damaged products:</strong> Items that arrive damaged,
                defective, or not as described on our website.
              </li>
              <li>
                <strong>Incorrect items:</strong> Products that were delivered incorrectly or
                do not match your order.
              </li>
              <li>
                <strong>Expired or spoiled goods:</strong> Perishable items that are past their
                expiry date or are not in a fresh condition upon delivery.
              </li>
            </ul>
          </section>

          <section className="content-section">
            <h2>3. Return Timeframe</h2>
            <p>
              All return requests must be made within 7 days of receiving your order. For
              perishable items, please report any issues within 24 hours of delivery to ensure
              a swift resolution.
            </p>
          </section>

          <section className="content-section">
            <h2>4. How to Request a Return</h2>
            <ol className="steps-list">
              <li>
                <strong>Contact Us:</strong> Reach out to our customer service team via email
                or phone with your order number and a description of the issue.
              </li>
              <li>
                <strong>Provide Evidence:</strong> If possible, include photos or a description
                of the damaged or incorrect item to help us process your request quickly.
              </li>
              <li>
                <strong>Return Authorisation:</strong> Our team will review your request and
                provide instructions for the return process.
              </li>
              <li>
                <strong>Resolution:</strong> Once your return is approved, we will process a
                refund or arrange a replacement as appropriate.
              </li>
            </ol>
          </section>

          <section className="content-section">
            <h2>5. Refunds</h2>
            <p>
              Approved refunds will be processed within 5 to 7 business days. The refund will
              be issued using the same payment method you used for the original purchase, where
              possible. For cash on delivery orders, we will arrange an alternative refund method.
            </p>
            <p>
              Refunds cover the cost of the returned item(s). Delivery fees are not refundable
              unless the return is due to an error on our part.
            </p>
          </section>

          <section className="content-section">
            <h2>6. Replacements</h2>
            <p>
              If you prefer a replacement over a refund, we will dispatch the replacement item
              as soon as possible at no additional cost. The replacement will be delivered within
              the standard delivery timeframe.
            </p>
          </section>

          <section className="content-section">
            <h2>7. Non-Returnable Items</h2>
            <p>
              The following items cannot be returned unless they are defective or were delivered
              incorrectly:
            </p>
            <ul className="content-list">
              <li>Perishable items (fresh produce, dairy, baked goods) after 24 hours of delivery</li>
              <li>Items that have been opened or used, unless defective</li>
              <li>Items returned after the 7-day return window</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>8. Delivery Issues</h2>
            <p>
              If your order was not delivered, was partially delivered, or arrived significantly
              later than expected, please contact our customer service team immediately. We will
              investigate the issue and work with you to find a satisfactory resolution.
            </p>
          </section>

          <section className="content-section">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Return &amp; Refund Policy from time to time. Any changes will
              be posted on this page with an updated date.
            </p>
          </section>

          <section className="content-section">
            <h2>10. Contact Us</h2>
            <p>
              If you have any questions about our Return &amp; Refund Policy, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> info@bluewatershopping.com<br />
              <strong>Phone:</strong> +233 (0) 30 XXX XXXX<br />
              <strong>Hours:</strong> Mon - Sat, 8:00 AM - 8:00 PM
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
