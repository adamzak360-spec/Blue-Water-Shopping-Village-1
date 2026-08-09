import './StaticPages.css'

export default function FAQ() {
  return (
    <div className="static-page policy-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Frequently Asked Questions</h1>
          <p className="hero-subtitle">Clear answers about shopping, seller stores, orders, delivery, and support</p>
          <p className="page-date">Last updated: August 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Shopping and Seller Stores</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>What is Reliable?</h4>
                <p>
                  Reliable is a marketplace where customers can browse products and discover public
                  stores operated by independent sellers. Sellers manage their own listings and
                  fulfilment, while Reliable provides the marketplace, account, checkout, support,
                  and store tools.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I find a store?</h4>
                <p>
                  Open Stores from the navigation, then search by store name, category, or location,
                  or select a category. Stores appear after a search or category selection so you can
                  intentionally discover the businesses most relevant to you.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I place an order?</h4>
                <p>
                  Browse products or visit a seller storefront, add products to your cart, review the
                  seller, delivery details, fees, and total, and proceed to checkout. You may check out
                  as a guest or create an account for easier future access.
                </p>
              </div>
              <div className="faq-item">
                <h4>Do I need an account to shop?</h4>
                <p>
                  No. Guest checkout may be available for eligible orders. Creating an account helps
                  you access order history, account tools, and other features that require sign-in.
                </p>
              </div>
              <div className="faq-item">
                <h4>Are product prices and descriptions guaranteed?</h4>
                <p>
                  Sellers provide or manage many product details. Review the listing, seller, price,
                  availability, delivery information, and total before checkout. Reliable may correct
                  or remove inaccurate, prohibited, or unavailable listings.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Delivery</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>How long does delivery take?</h4>
                <p>
                  Within Tamale, delivery is often same-day or next-day when stock, seller processing,
                  address, and rider availability permit. Other locations commonly take 1–3 business
                  days or longer depending on distance and logistics. Timeframes are estimates, not
                  guaranteed deadlines.
                </p>
              </div>
              <div className="faq-item">
                <h4>Where do you deliver?</h4>
                <p>
                  Reliable supports delivery across Ghana where the product, seller, destination, and
                  logistics service permit. Available delivery options and fees are shown at checkout.
                </p>
              </div>
              <div className="faq-item">
                <h4>How much does delivery cost?</h4>
                <p>
                  Fees depend on the destination, seller, product, and logistics requirements. A
                  reference rate of GH₵15.00 may apply within Tamale, but the checkout total is the
                  amount to review before you confirm the order.
                </p>
              </div>
              <div className="faq-item">
                <h4>What if my order is late or cannot be delivered?</h4>
                <p>
                  Contact support promptly with your order number. We will investigate with the seller
                  and delivery provider. Incomplete addresses, unavailable recipients, weather,
                  traffic, stock issues, and logistics conditions may affect delivery.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Orders and Payments</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>When am I charged?</h4>
                <p>
                  Online payment may be charged during checkout after the payment provider verifies the
                  transaction. For cash on delivery, payment is collected when the order is received.
                  A payment attempt does not guarantee acceptance until the order is verified and
                  recorded.
                </p>
              </div>
              <div className="faq-item">
                <h4>What payment methods are available?</h4>
                <p>
                  Depending on the order and location, available options may include online card or
                  mobile-money payments and cash on delivery. The methods shown at checkout control the
                  available options for that order.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I modify or cancel my order?</h4>
                <p>
                  Contact support as soon as possible. We may be able to help before the order is
                  processed or dispatched, but cancellation may not be possible after dispatch.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can one order contain products from different stores?</h4>
                <p>
                  Checkout may require products from different seller stores to be placed in separate
                  orders so that each seller can manage fulfilment and attribution correctly.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Returns and Refunds</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>What is the return policy?</h4>
                <p>
                  Eligible issues generally include damaged, defective, incorrect, materially
                  misdescribed, expired, or spoiled products. Report non-perishable issues within 7
                  days and perishable issues as soon as possible, preferably within 24 hours.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I request a refund?</h4>
                <p>
                  Contact support with your order number and a description of the issue. Photos or
                  other reasonable evidence may be requested. Do not return an item without receiving
                  return instructions.
                </p>
              </div>
              <div className="faq-item">
                <h4>How long do refunds take?</h4>
                <p>
                  Approved refunds are generally initiated within 5–7 business days, but the payment
                  provider, bank, or mobile-money service may take additional time to complete the
                  transfer.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Accounts, Privacy, and Security</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>How is my personal information used?</h4>
                <p>
                  We use information to operate accounts, process orders, coordinate delivery, provide
                  support, secure the marketplace, and meet legal obligations. See the Privacy Policy
                  for details about sharing, retention, and your rights.
                </p>
              </div>
              <div className="faq-item">
                <h4>Is my payment information safe?</h4>
                <p>
                  Online payments may be processed by a third-party payment provider. Reliable uses
                  reasonable safeguards, but no online service can guarantee absolute security. Never
                  share your password, payment PIN, or verification code with another person.
                </p>
              </div>
              <div className="faq-item">
                <h4>I forgot my password. What should I do?</h4>
                <p>
                  Use the available password-reset option on the login page. If you still need help,
                  contact support. Never send your current password to support or another person.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I request access to or deletion of my information?</h4>
                <p>
                  Contact support@reliable.com with enough information for us to verify your account
                  and understand your request. Some records may need to be retained for orders, legal
                  obligations, disputes, security, or financial records.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Seller Questions</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>What are sellers responsible for?</h4>
                <p>
                  Sellers are responsible for accurate business and product information, lawful
                  listings, stock, pricing, customer communication, order preparation, and cooperation
                  with delivery, returns, refunds, and complaints.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can Reliable remove a store or product?</h4>
                <p>
                  Yes. Reliable may restrict or remove stores, listings, or accounts for safety, fraud,
                  legal, quality, operational, or Terms-related reasons. We may also ask a seller to
                  correct information before restoring access.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// Working draft for legal and operational review before reliance or publication.
