import './StaticPages.css'

export default function FAQ() {
  return (
    <div className="static-page policy-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Frequently Asked Questions</h1>
          <p className="hero-subtitle">Answers about shopping and support</p>
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
                  seller, delivery details, fees, and total, then register or sign in to a customer
                  account to complete checkout. Your account is required to place the order, track
                  its delivery progress, and confirm receipt once your order arrives.
                </p>
              </div>
              <div className="faq-item">
                <h4>Do I need an account to order?</h4>
                <p>
                  Yes, for placing orders. You can browse all stores, products, and prices freely
                  without an account, but to complete checkout you must register a free customer
                  account (or sign in to an existing one). Your customer account is how you track
                  your order's progress, communicate with the seller, and confirm delivery — and it
                  is also what unlocks the payout to the seller once your order is confirmed.
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
                  All orders on Reliable are paid online at checkout through Paystack (card, mobile
                  money, or bank transfer), and the payment is verified before the order is recorded.
                  A payment attempt does not guarantee acceptance until the order is verified and
                  recorded.
                </p>
              </div>
              <div className="faq-item">
                <h4>What payment methods are available?</h4>
                <p>
                  All payments are collected online at checkout through Paystack, and the available
                  options for your order include <strong>card, mobile money, and bank transfer</strong>
                  depending on your order and location. The methods shown at checkout control the
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
              <div className="faq-item">
                <h4>What happens after I pay? How is my order processed?</h4>
                <p>
                  Once your online payment is verified by Paystack, the order is created and the
                  seller is immediately notified in their
                  seller dashboard. The seller then prepares the products, the order moves from
                  Processing to dispatch, and you can follow each stage — Processing, Out for
                  Delivery / Ready for Pickup, Delivered — in your account, with updates in the
                  notification bell and by email where enabled. When the order arrives, you are
                  asked to inspect it and confirm receipt in your account, which completes the
                  order and releases the funds to the seller.
                </p>
              </div>
              <div className="faq-item">
                <h4>Which payment methods, countries, and currencies are supported?</h4>
                <p>
                  Online checkout is powered by Paystack, supporting secure <strong>card, mobile
                  money, and bank transfer</strong> payments. Paystack's
                  payment processing currently covers <strong>Ghana (GHS), Nigeria (NGN), Kenya
                  (KES), South Africa (ZAR), the United States, the United Arab Emirates, and
                  Côte d'Ivoire</strong>, with USD and GBP card payments where enabled. Reliable itself is open to sellers across all West African countries
                  where registered sellers have live stores, expanding to more countries as we
                  grow. The currency for each store is shown on its storefront and at checkout.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I chat with a seller before or after ordering?</h4>
                <p>
                  Yes. Reliable includes a built-in chat feature that lets you message a seller
                  directly from a product page or your account to ask about products, sizing,
                  stock, or your order. Keep conversations about orders inside Reliable so that
                  everything stays documented and protected by our marketplace safeguards.
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
              <div className="faq-item">
                <h4>What can a seller do in their dashboard?</h4>
                <p>
                  A seller dashboard lets a seller manage their storefront and products (names,
                  images, descriptions, specifications, sizes, variants, stock, and prices), review
                  and update order stages, configure delivery methods, areas, and fees, run
                  promotions, manage payout settings, track notifications, and (with an active POS
                  subscription) use in-person point-of-sale tools. Orders appear in the seller
                  dashboard only when a customer purchases from that seller’s store.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I complete seller verification and set up my payout information?</h4>
                <p>
                  After registering your store, go to your seller dashboard and complete two things:
                  your <strong>payout profile</strong> (account name, bank account or mobile-money
                  network and number, and where required SWIFT/IBAN details) and your
                  <strong> business verification</strong> (business registration number, tax ID/TIN,
                  and supporting documents such as a registration certificate and proof of address).
                  Verified sellers in Ghana with a GHS store can qualify for automated Paystack
                  payouts once approved, and verification can unlock higher payout limits and a
                  visible verified-store badge that builds customer trust.
                </p>
              </div>
              <div className="faq-item">
                <h4>How does a seller get paid?</h4>
                <p>
                  After an order is delivered and the customer confirms receipt, the order settles
                  through the marketplace settlement process. The marketplace commission is
                  accounted for, and the remaining amount is paid out to the seller through their
                  payout profile. Verified Ghana (GHS) sellers may receive automated Paystack
                  payouts; sellers in other supported countries are currently settled manually
                  until an approved automated route is available.
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
