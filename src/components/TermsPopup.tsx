import { useI18n } from '../i18n'
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
  const { t } = useI18n()
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

        <button className="terms-popup-close" onClick={handleClose} aria-label={t('closeWelcome')}>
          <X size={22} strokeWidth={2.2} />
        </button>

        <div className="terms-popup-content">
          <div className="terms-popup-header">
            <div className="terms-popup-badge" aria-hidden="true">
              <ShieldCheck size={18} strokeWidth={2.2} />
              <span>{t('premiumMarketplace')}</span>
            </div>
            <h2 id="terms-popup-title">{t('welcomeToReliable')}</h2>
            <p className="terms-popup-intro" id="terms-popup-description">
              {t('policyIntro')}
            </p>
          </div>

          <div className="terms-popup-policies" aria-label={t('policies')}>
            <Link to="/terms" className="policy-item" onClick={handleClose}>
              <span className="policy-icon" aria-hidden="true">
                <ClipboardList size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">{t('terms')}</span>
                <span className="policy-description">{t('termsAgreement')}</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/privacy-policy" className="policy-item" onClick={handleClose}>
              <span className="policy-icon" aria-hidden="true">
                <LockKeyhole size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">{t('privacyPolicy')}</span>
                <span className="policy-description">{t('privacyDescription')}</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/delivery" className="policy-item" onClick={handleClose}>
              <span className="policy-icon" aria-hidden="true">
                <Truck size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">{t('deliveryInformation')}</span>
                <span className="policy-description">{t('deliveryDescription')}</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>

            <Link to="/returns" className="policy-item" onClick={handleClose}>
              <span className="policy-icon" aria-hidden="true">
                <RotateCcw size={25} strokeWidth={2.1} />
              </span>
              <span className="policy-copy">
                <span className="policy-title">{t('returns')}</span>
                <span className="policy-description">{t('returnsDescription')}</span>
              </span>
              <ArrowRight className="policy-arrow" size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </div>

          <div className="terms-popup-note">
            <ShieldCheck size={17} strokeWidth={2.2} aria-hidden="true" />
            <p>{t('policyAgreement')}</p>
          </div>

          <div className="terms-popup-actions">
            <Link to="/terms" className="terms-popup-btn read-btn" onClick={handleClose}>
              {t('readPolicies')}
              <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <button className="terms-popup-btn acknowledge-btn" onClick={handleAcknowledge}>
              {t('iUnderstand')}
              <ShieldCheck size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
