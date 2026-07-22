import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Company Section */}
        <div className="footer-section">
          <div className="footer-brand">
            <h3 className="footer-logo">RELIABLE</h3>
            <p className="footer-tagline">Premium Marketplace</p>
            <p className="footer-description">
              RELIABLE is your trusted online marketplace for premium products.
              We deliver quality, convenience, and exceptional service straight
              to your doorstep. Shop with confidence and enjoy a seamless
              shopping experience.
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
              <Phone size={18} />
              <span>+233 (0) 30 XXX XXXX</span>
            </div>
            <div className="contact-item">
              <Mail size={18} />
              <span>support@reliable.com</span>
            </div>
            <div className="contact-item">
              <MapPin size={18} />
              <span>Accra, Greater Accra, Ghana</span>
            </div>
            <div className="contact-item">
              <Clock size={18} />
              <span>Mon - Sat: 8:00 AM - 8:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media & Bottom Bar */}
      <div className="footer-bottom">
        <div className="footer-bottom-content">
          <div className="social-media">
            <a href="#" className="social-link" title="Facebook">Facebook</a>
            <a href="#" className="social-link" title="Instagram">Instagram</a>
            <a href="#" className="social-link" title="Twitter">Twitter</a>
            <a href="#" className="social-link" title="WhatsApp">WhatsApp</a>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} RELIABLE. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
