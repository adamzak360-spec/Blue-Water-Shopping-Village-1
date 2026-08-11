import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ClipboardList,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import './TermsPopup.css'

export default function TermsPopup() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const hasAcknowledgedTerms = localStorage.getItem('termsAcknowledged')

    if (!hasAcknowledgedTerms) {
      const timer = window.setTimeout(() => {
        setIsVisible(true)
      }, 1000)

      return () => window.clearTimeout(timer)
    }
  }, [])

  const handleAcknowledge = () => {
    localStorage.setItem('termsAcknowledged', 'true')
    setIsVisible(false)
  }

  const handleClose = () => {
    localStorage.setItem('termsAcknowledged', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="terms-popup-overlay">
      <div
        className="terms-popup-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-popup-title"
        aria-describedby="terms-popup-description"
      >
        <div className="terms-popup-accent" aria-hidden="true" />

        <button className="terms-popup-close" onClick={handleClose} aria-label="Close welcome message">
          <X size={22} strokeWidth={2.2} />
        </button>

        <div className="terms-popup-content">
          <div className="terms-popup-header">
            <div className="terms-popup-badge" aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>SHOP WITH CONFIDENCE</span>
            </div>
            <h2 id="terms-popup-title">Welcome to Reliable!</h2>
            <p className="terms-popup-intro" id="terms-popup-description">
              Before placing an order, take a moment to review our policies so your shopping experience is clear, safe, and stress-free.
            </p>
          </div>

          <div className="terms-popup-policies" aria-label="Reliable policies">
            <Link to="/terms" className="policy-item">
              <span className="policy-icon" aria-hidden="true">
                <ClipboardList size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">Terms &amp; Conditions</span>
                <span className="policy-description">The agreement for using Reliable</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/privacy-policy" className="policy-item">
              <span className="policy-icon" aria-hidden="true">
                <LockKeyhole size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">Privacy Policy</span>
                <span className="policy-description">How we protect your information</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/delivery" className="policy-item">
              <span className="policy-icon" aria-hidden="true">
                <Truck size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">Delivery Policy</span>
                <span className="policy-description">What to expect from dispatch to arrival</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/returns" className="policy-item">
              <span className="policy-icon" aria-hidden="true">
                <RotateCcw size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">Return &amp; Refund Policy</span>
                <span className="policy-description">Your options if something is not right</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          <div className="terms-popup-note">
            <ShieldCheck size={17} strokeWidth={2.2} aria-hidden="true" />
            <p>By placing an order, you agree to these policies and our terms of service.</p>
          </div>

          <div className="terms-popup-actions">
            <Link to="/terms" className="terms-popup-btn read-btn">
              Read Policies
              <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <button className="terms-popup-btn acknowledge-btn" onClick={handleAcknowledge}>
              I Understand
              <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
