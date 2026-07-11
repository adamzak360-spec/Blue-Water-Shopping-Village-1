import './StaticPages.css'

export default function FAQ() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Frequently Asked Questions</h1>
          <p className="hero-subtitle">Find answers to common questions about our services</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Shopping &amp; Products</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>How do I place an order?</h4>
                <p>
                  Browse our product catalogue, add items to your cart, and proceed to checkout.
                  You can check out as a guest or create an account for faster future orders.
                </p>
              </div>
              <div className="faq-item">
                <h4>Do I need to create an account to shop?</h4>
                <p>
                  No. You can shop and check out as a guest without creating an account.
                  However, creating an account allows you to track your orders and enjoy
                  a faster checkout experience in the future.
                </p>
              </div>
              <div className="faq-item">
                <h4>How can I find specific products?</h4>
                <p>
                  Use the search bar on the Products page to find items by name or description.
                  You can also filter products by category to browse specific sections.
                </p>
              </div>
              <div className="faq-item">
                <h4>Are the prices on the website final?</h4>
                <p>
                  Yes, the prices displayed on our website are the final prices you will pay.
                  There are no hidden charges. Delivery fees are added at checkout and clearly
                  displayed before you confirm your order.
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
                  Standard delivery takes 1 to 3 business days within the Greater Accra region.
                  Delivery times may vary depending on your location and the availability of items.
                </p>
              </div>
              <div className="faq-item">
                <h4>What areas do you deliver to?</h4>
                <p>
                  We currently deliver to all areas within the Greater Accra region.
                  We are working on expanding our delivery coverage to other regions in Ghana.
                </p>
              </div>
              <div className="faq-item">
                <h4>How much does delivery cost?</h4>
                <p>
                  Delivery fees are calculated based on your location and are displayed at checkout
                  before you confirm your order. The standard delivery fee is GH₵5.00 within Accra.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I track my order?</h4>
                <p>
                  Yes. Registered users can track their orders through their account dashboard.
                  Guest customers will receive email updates about their order status.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Orders &amp; Payments</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>When am I charged for my order?</h4>
                <p>
                  Payment is collected at the time of checkout. For online payments, you will be
                  charged immediately. For cash on delivery, payment is collected upon receipt of
                  your order.
                </p>
              </div>
              <div className="faq-item">
                <h4>Can I modify or cancel my order?</h4>
                <p>
                  You can contact our customer service team to modify or cancel an order before it
                  has been dispatched. Once an order is on its way, we may not be able to cancel it.
                </p>
              </div>
              <div className="faq-item">
                <h4>What payment methods do you accept?</h4>
                <p>
                  We accept cash on delivery, mobile money (MoMo), and online card payments.
                  More payment options are being added regularly.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Returns &amp; Refunds</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>What is your return policy?</h4>
                <p>
                  We accept returns of defective or damaged items within 7 days of delivery.
                  Please visit our Return &amp; Refund Policy page for full details.
                </p>
              </div>
              <div className="faq-item">
                <h4>How do I request a refund?</h4>
                <p>
                  Contact our customer service team with your order number and a description of
                  the issue. We will process your refund request within 5 to 7 business days.
                </p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Account &amp; Security</h2>
            <div className="faq-list">
              <div className="faq-item">
                <h4>Is my personal information safe?</h4>
                <p>
                  Yes. We take your privacy seriously. Your personal and payment information is
                  protected using industry-standard security measures. Please review our Privacy
                  Policy for more details.
                </p>
              </div>
              <div className="faq-item">
                <h4>I forgot my password. What should I do?</h4>
                <p>
                  Please contact our customer service team and we will assist you with resetting
                  your account password.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
