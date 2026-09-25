import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import './Footer.css'
import { useI18n } from '../i18n'

export default function Footer() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Company Section */}
        <div className="footer-section">
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-text">RELIABLE</span>
            </div>
            <p className="footer-tagline">{t('premiumMarketplace')}</p>
            <p className="footer-description">
              RELIABLE is your trusted online marketplace for premium products.
              We deliver quality, convenience, and exceptional service straight
              to your doorstep. Shop with confidence and enjoy a seamless
              shopping experience.
            </p>
          </div>
        </div>

        {/* {t('quickLinks')} */}
        <div className="footer-section">
          <h4 className="footer-heading">{t('quickLinks')}</h4>
          <ul className="footer-links">
            <li><Link to="/">{t('home')}</Link></li>
            <li><Link to="/products">{t('products')}</Link></li>
            <li><Link to="/articles">{t('articles')}</Link></li>
            <li><Link to="/about">{t('aboutUs')}</Link></li>
            <li><Link to="/contact">{t('contactUs')}</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/delivery">{t('deliveryInformation')}</Link></li>
          </ul>
        </div>

        {/* {t('policies')} */}
        <div className="footer-section">
          <h4 className="footer-heading">{t('policies')}</h4>
          <ul className="footer-links">
            <li><Link to="/privacy-policy">{t('privacyPolicy')}</Link></li>
            <li><Link to="/terms">{t('terms')}</Link></li>
            <li><Link to="/returns">{t('returns')}</Link></li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="footer-section">
          <h4 className="footer-heading">{t('contactUs')}</h4>
          <div className="footer-contact">
            <div className="contact-item">
              <Phone size={18} />
              <a href="tel:+233595609966" style={{ color: 'inherit', textDecoration: 'none' }}>
                +233 59 560 9966
              </a>
            </div>
            <div className="contact-item">
              <Mail size={18} />
              <span>support@reliable.com</span>
            </div>
            <div className="contact-item">
              <MapPin size={18} />
              <span>Malshegu, Tamale, Ghana</span>
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
            &copy; {new Date().getFullYear()} RELIABLE. {t('allRightsReserved')}
          </p>
        </div>
      </div>
    </footer>
  )
}
