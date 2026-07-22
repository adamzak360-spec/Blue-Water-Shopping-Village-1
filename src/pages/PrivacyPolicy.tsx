import './StaticPages.css'

export default function PrivacyPolicy() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Privacy Policy</h1>
          <p className="hero-subtitle">How we collect, use, and protect your personal information</p>
          <p className="page-date">Last updated: July 2026</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>1. Introduction</h2>
            <p>
              Reliable ("we", "us", or "our") is committed to protecting your
              personal information. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you visit our website or use our services.
              Please read this policy carefully.
            </p>
            <p>
              By using our website, you consent to the data practices described in this policy.
              If you do not agree with the terms of this policy, please do not use our website
              or services.
            </p>
          </section>

          <section className="content-section">
            <h2>2. Information We Collect</h2>
            <h4>Personal Information</h4>
            <p>
              When you create an account or place an order, we may collect the following information:
            </p>
            <ul className="content-list">
              <li>Your full name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Delivery address, city, and region</li>
              <li>Account credentials (email and password)</li>
            </ul>
            <h4>Order Information</h4>
            <p>
              When you place an order, we collect details about your purchase including the items
              ordered, quantities, prices, delivery preferences, and any additional notes you provide.
            </p>
            <h4>Automatically Collected Information</h4>
            <p>
              We may automatically collect certain information when you visit our website, including
              your IP address, browser type, operating system, access times, and the pages you view.
            </p>
          </section>

          <section className="content-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul className="content-list">
              <li>To process and fulfil your orders</li>
              <li>To communicate with you about your orders and account</li>
              <li>To provide customer support and respond to inquiries</li>
              <li>To improve our website, products, and services</li>
              <li>To send order status updates and delivery notifications</li>
              <li>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>4. Information Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal information to third parties. We may
              share your information with:
            </p>
            <ul className="content-list">
              <li><strong>Delivery personnel:</strong> To facilitate the delivery of your orders to your address.</li>
              <li><strong>Service providers:</strong> Third-party services that help us operate our website, such as hosting and email services.</li>
              <li><strong>Legal requirements:</strong> When required by law or to protect our rights and safety.</li>
            </ul>
          </section>

          <section className="content-section">
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your
              personal information against unauthorised access, alteration, disclosure, or
              destruction. However, no method of transmission over the internet is 100% secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="content-section">
            <h2>6. Your Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information.
              You may also request that we stop using your information for certain purposes.
              To exercise these rights, please contact us at support@reliable.com.
            </p>
          </section>

          <section className="content-section">
            <h2>7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any changes will be posted
              on this page with an updated date. We encourage you to review this policy
              periodically.
            </p>
          </section>

          <section className="content-section">
            <h2>8. Contact Us</h2>
            <p>
              If you have any questions or concerns about this Privacy Policy or our data
              practices, please contact us at:
            </p>
            <p>
              <strong>Email:</strong> support@reliable.com<br />
              <strong>Phone:</strong> +233 53 855 7781<br />
              <strong>Address:</strong> Reliable, Accra, Greater Accra, Ghana
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
