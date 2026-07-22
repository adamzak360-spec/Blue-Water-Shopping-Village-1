import './StaticPages.css'

export default function About() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>About Reliable</h1>
          <p className="hero-subtitle">Bringing Ghana's finest groceries to your doorstep</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Our Story</h2>
            <p>
              Reliable was founded with a simple mission: to make quality groceries
              accessible to every household in Ghana. What started as a small neighbourhood shop has grown
              into a modern, full-service online supermarket that serves customers across the Greater Accra
              region and beyond.
            </p>
            <p>
              Our name reflects our commitment to clarity and transparency in everything we do. From the
              freshness of our products to the honesty of our pricing, we believe our customers deserve
              the best experience possible when they shop with us.
            </p>
          </section>

          <section className="content-section">
            <h2>Our Mission</h2>
            <p>
              To provide Ghanaians with convenient, affordable access to fresh, high-quality groceries
              and household essentials, delivered with care and reliability.
            </p>
          </section>

          <section className="content-section">
            <h2>Our Vision</h2>
            <p>
              To become Ghana's most trusted online supermarket, setting the standard for quality,
              convenience, and customer satisfaction in the country's rapidly growing e-commerce landscape.
            </p>
          </section>

          <section className="content-section">
            <h2>What We Offer</h2>
            <div className="values-grid">
              <div className="value-card">
                <div className="value-icon">&#127793;</div>
                <h4>Fresh Products</h4>
                <p>We source fresh produce daily from trusted local and international suppliers to ensure you receive the highest quality products.</p>
              </div>
              <div className="value-card">
                <div className="value-icon">&#128666;</div>
                <h4>Fast Delivery</h4>
                <p>Our dedicated delivery team ensures your orders arrive promptly and in perfect condition, right to your doorstep.</p>
              </div>
              <div className="value-card">
                <div className="value-icon">&#128176;</div>
                <h4>Fair Pricing</h4>
                <p>We offer competitive prices without compromising on quality, making everyday essentials affordable for every family.</p>
              </div>
              <div className="value-card">
                <div className="value-icon">&#128170;</div>
                <h4>Reliable Service</h4>
                <p>Our customer support team is always available to assist you with orders, inquiries, and any concerns you may have.</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Our Commitment</h2>
            <p>
              At Reliable, we are committed to supporting the local economy by partnering
              with Ghanaian farmers and producers wherever possible. We believe in giving back to the community
              that has supported our growth, and we continuously strive to improve our services to meet the
              evolving needs of our customers.
            </p>
            <p>
              Whether you are a busy professional, a family shopping for the week, or someone who simply
              appreciates the convenience of online grocery shopping, Reliable is here
              to serve you.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
