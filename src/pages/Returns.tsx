import './StaticPages.css'

export default function Returns() {
  return (
    <div className="static-page policy-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Return &amp; Refund Policy</h1>
          <p className="hero-subtitle">How returns and refunds work</p>
          <p className="page-date">Last updated: August 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>1. Purpose and Scope</h2>
            <p>
              This policy explains how Reliable handles returns, replacements, refunds, payment
              reversals, and delivery complaints for products purchased through the Reliable marketplace
              or an independent seller store. The relevant seller may be responsible for the product and
              fulfilment, while Reliable coordinates the platform support process with payment and
              delivery partners. Nothing in this policy limits a right that cannot lawfully be excluded.
            </p>
          </section>

          <section className="content-section">
            <h2>2. Eligible Reasons for a Return</h2>
            <p>You may contact us about a return or resolution where an item is:</p>
            <ul className="content-list">
              <li>Damaged on arrival or materially defective.</li>
              <li>Incorrect or materially different from the product ordered.</li>
              <li>Materially not as described in the listing.</li>
              <li>Expired, spoiled, unsafe, or unsuitable on delivery where the product is perishable.</li>
            </ul>
            <p>
              We may request information from you and the seller, review the listing and order,
              inspect evidence, and determine the appropriate resolution based on the product,
              circumstances, and applicable law.
            </p>
          </section>

          <section className="content-section">
            <h2>3. Time Limits</h2>
            <p>
              Report non-perishable product issues within 7 days after delivery. Report damaged,
              spoiled, expired, or otherwise unsafe perishable products as soon as possible and,
              where practicable, within 24 hours of delivery. Late reports may be harder to verify and
              may not qualify unless applicable law requires otherwise.
            </p>
            <p>
              The date of delivery or the date an order is marked delivered may be used to calculate
              the applicable reporting period. Contact support promptly even if you are unsure whether
              the issue qualifies.
            </p>
          </section>

          <section className="content-section">
            <h2>4. How to Request a Return or Resolution</h2>
            <ol className="steps-list">
              <li>
                <strong>Contact support:</strong> Provide your order number, seller/store, contact
                details, and a clear description of the issue.
              </li>
              <li>
                <strong>Provide evidence:</strong> Where possible, send photographs, video, packaging
                details, delivery information, or other reasonable evidence. Do not discard an item
                until we advise you, unless it is unsafe or perishable.
              </li>
              <li>
                <strong>Await instructions:</strong> Do not send an item back without return
                instructions or authorisation. The return address and responsible party may differ by
                seller and product.
              </li>
              <li>
                <strong>Resolution:</strong> After review, we may approve a refund, replacement,
                repair, partial remedy, delivery correction, or another appropriate resolution.
              </li>
            </ol>
          </section>

          <section className="content-section">
            <h2>5. Refunds</h2>
            <p>
              Approved refunds are generally initiated within 5 to 7 business days after approval,
              subject to payment-provider processing times, bank or mobile-money procedures, and any
              required return or inspection. Refunds are normally sent to the original payment method
              where practical and lawful.
            </p>
            <p>
              For cash-on-delivery orders, we will contact you to agree on a reasonable refund method
              and may require verification of the recipient. A refund may cover the affected product
              and applicable delivery charges where the issue was caused by Reliable, the seller, or
              delivery handling. Original delivery fees may not be refundable for a change of mind or
              an issue not caused by us or the seller.
            </p>
            <p>
              Where an order or payment provider clearly discloses a non-refundable payment, delivery,
              or refund-processing charge, that amount may be withheld from the amount returned where
              applicable law permits. The seller-side marketplace commission is normally retained or
              accounted for within the seller settlement process and is not an automatic additional
              charge to the customer. The approved refund amount and any applicable deduction will be
              communicated as part of the resolution.
            </p>
          </section>

          <section className="content-section">
            <h2>6. Replacements and Exchanges</h2>
            <p>
              Where a replacement is available and approved, the seller or Reliable may dispatch an
              equivalent or corrected product. If the product is unavailable, we may offer a refund or
              another resolution. Replacement delivery timing depends on stock, seller processing,
              location, and logistics availability.
            </p>
          </section>

          <section className="content-section">
            <h2>7. Items That May Not Qualify</h2>
            <p>
              Unless defective, unsafe, incorrect, or otherwise protected by applicable law, a return
              may not be approved for:
            </p>
            <ul className="content-list">
              <li>Perishable products reported after the stated reporting period.</li>
              <li>Products that have been used, altered, damaged, washed, installed, or opened in a way that caused the issue.</li>
              <li>Personalised, made-to-order, hygiene-sensitive, or sealed products where return is restricted for safety or legal reasons.</li>
              <li>Products returned without authorisation or outside the applicable reporting period.</li>
              <li>Change-of-mind returns where the listing or applicable law does not provide for them.</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>8. Cancellation and Delivery Problems</h2>
            <p>
              Contact support as soon as possible if you need to change or cancel an order. We may be
              able to help before dispatch, but cancellation may not be possible after processing or
              dispatch. An order that was not delivered, was partially delivered, or arrived with a
              serious delivery issue should be reported promptly so we can investigate with the seller
              and delivery provider. If an order is marked delivered but you did not receive it, do not
              confirm receipt; report it promptly so the order review and seller settlement can be handled
              appropriately.
            </p>
          </section>

          <section className="content-section">
            <h2>9. Fraud and Abuse</h2>
            <p>
              We may refuse a request, pause a refund or seller payout, request further evidence, or
              restrict an account where there is reasonable evidence of misuse, repeated false claims,
              payment abuse, tampering, or fraud. This does not prevent a legitimate customer from
              reporting a genuine issue or exercising a right protected by law.
            </p>
          </section>

          <section className="content-section">
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this policy to reflect changes to the marketplace, seller operations,
              payment methods, delivery arrangements, or applicable requirements. The current version
              and “Last updated” date will be posted on this page. The policy applicable to an order
              will be interpreted consistently with the Terms and any mandatory legal rights.
            </p>
          </section>

          <section className="content-section">
            <h2>11. Contact Us</h2>
            <p>
              To request a return, report a delivery issue, or ask about a refund, contact:
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

// Working draft for legal review before reliance or publication.
// Confirm product-specific rules and the final return/refund authority with a qualified lawyer.
