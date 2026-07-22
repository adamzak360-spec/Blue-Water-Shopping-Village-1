import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Link } from 'react-router-dom'
import './TermsPopup.css'

export default function TermsPopup() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already acknowledged the terms
    const hasAcknowledgedTerms = localStorage.getItem('termsAcknowledged')
    
    if (!hasAcknowledgedTerms) {
      // Show popup after a short delay to avoid jarring appearance
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('termsAcknowledged', 'true')
    setIsVisible(false)
  }

  const handleClose = () => {
    // Still acknowledge even if they close the popup
    localStorage.setItem('termsAcknowledged', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="terms-popup-overlay">
      <div className="terms-popup-container">
        <button className="terms-popup-close" onClick={handleClose} aria-label="Close">
          <X size={24} />
        </button>

        <div className="terms-popup-content">
          <h2>Welcome to Reliable!</h2>
          
          <p className="terms-popup-intro">
            Before placing an order, please take a moment to read our policies to ensure you have the best shopping experience with us.
          </p>

          <div className="terms-popup-policies">
            <div className="policy-item">
              <span className="policy-icon">📋</span>
              <Link to="/terms">Terms & Conditions</Link>
            </div>
            <div className="policy-item">
              <span className="policy-icon">🔒</span>
              <Link to="/privacy-policy">Privacy Policy</Link>
            </div>
            <div className="policy-item">
              <span className="policy-icon">🚚</span>
              <Link to="/delivery">Delivery Policy</Link>
            </div>
            <div className="policy-item">
              <span className="policy-icon">↩️</span>
              <Link to="/returns">Return & Refund Policy</Link>
            </div>
          </div>

          <p className="terms-popup-agreement">
            By placing an order, you agree to these policies and our terms of service.
          </p>

          <div className="terms-popup-actions">
            <Link to="/terms" className="terms-popup-btn read-btn">
              Read Policies
            </Link>
            <button className="terms-popup-btn acknowledge-btn" onClick={handleAcknowledge}>
              I Understand
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
