import './StaticPages.css'

export default function Contact() {
  return (
    <div className="static-page">
      <div className="static-page-container">
        <div className="page-hero">
          <h1>Contact Us</h1>
          <p className="hero-subtitle">We would love to hear from you</p>
        </div>

        <div className="page-content">
          <section className="content-section">
            <h2>Get in Touch</h2>
            <p>
              Have a question about your order, a product inquiry, or general feedback? Our team is here
              to help. Feel free to reach out to us through any of the channels below, and we will
              respond as quickly as possible.
            </p>
          </section>

          <section className="content-section">
            <h2>Contact Information</h2>
            <div className="contact-grid">
              <div className="contact-card">
                <div className="contact-card-icon">&#128222;</div>
                <h4>Phone</h4>
                <p>+233 (0) 30 XXX XXXX</p>
                <p className="contact-note">Available Mon - Sat, 8:00 AM - 8:00 PM</p>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon">&#9993;</div>
                <h4>Email</h4>
                <p>info@bluewatershopping.com</p>
                <p className="contact-note">We respond within 24 hours</p>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon">&#128205;</div>
                <h4>Location</h4>
                <p>Blue Water Shopping Village</p>
                <p className="contact-note">Accra, Greater Accra, Ghana</p>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon">&#128336;</div>
                <h4>Business Hours</h4>
                <p>Mon - Sat: 8:00 AM - 8:00 PM</p>
                <p className="contact-note">Sun: 9:00 AM - 6:00 PM</p>
              </div>
            </div>
          </section>

          <section className="content-section">
            <h2>Send Us a Message</h2>
            <p>
              You can also use our website's contact features to submit inquiries directly.
              Our customer service team reviews all messages and responds within one business day.
            </p>
            <p className="contact-note">
              For urgent matters regarding your order, please call us directly or send us an email
              with your order reference number for faster assistance.
            </p>
          </section>

          <section className="content-section">
            <h2>Follow Us</h2>
            <div className="social-links-row">
              <a href="#" className="social-badge">Facebook</a>
              <a href="#" className="social-badge">Instagram</a>
              <a href="#" className="social-badge">Twitter</a>
              <a href="#" className="social-badge">WhatsApp</a>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
