import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Company Section */}
        <div className="footer-section">
          <div className="footer-brand">
            <h3 className="footer-logo">Blue Water Shopping Village</h3>
            <p className="footer-tagline">Your Modern Supermarket</p>
            <p className="footer-description">
              Blue Water Shopping Village is Ghana's premier online supermarket,
              offering fresh groceries, quality products, and reliable delivery
              straight to your doorstep. We bring the best shopping experience
              to your home with convenience, affordability, and trust.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">Products</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/delivery">Delivery Information</Link></li>
          </ul>
        </div>

        {/* Policies */}
        <div className="footer-section">
          <h4 className="footer-heading">Policies</h4>
          <ul className="footer-links">
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms &amp; Conditions</Link></li>
            <li><Link to="/returns">Return &amp; Refund Policy</Link></li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="footer-section">
          <h4 className="footer-heading">Contact Us</h4>
          <div className="footer-contact">
            <div className="contact-item">
              <span className="contact-icon">&#128222;</span>
              <span>+233 (0) 30 XXX XXXX</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">&#9993;</span>
              <span>info@bluewatershopping.com</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">&#128205;</span>
              <span>Blue Water Shopping Village,<br />Accra, Greater Accra, Ghana</span>
            </div>
            <div className="contact-item">
              <span className="contact-icon">&#128336;</span>
              <span>Mon - Sat: 8:00 AM - 8:00 PM<br />Sun: 9:00 AM - 6:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media & Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="social-media">
            <a href="#" className="social-link" title="Facebook">&#9679; Facebook</a>
            <a href="#" className="social-link" title="Instagram">&#9679; Instagram</a>
            <a href="#" className="social-link" title="Twitter">&#9679; Twitter</a>
            <a href="#" className="social-link" title="WhatsApp">&#9679; WhatsApp</a>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} Blue Water Shopping Village. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
