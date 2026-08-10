import { useState } from 'react'
import { Check, Copy, Mail, MessageCircle, Share2, Send, X } from 'lucide-react'
import type { Product } from '../types'
import { copyProductShareLink, getSocialShareLinks, shareProduct } from '../utils/productSharing'
import './ProductShare.css'

type ProductShareProps = {
  product: Product
}

export default function ProductShare({ product }: ProductShareProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const links = getSocialShareLinks(product)

  const handleNativeShare = async () => {
    setIsSharing(true)
    try {
      const shared = await shareProduct(product)
      if (!shared) setIsOpen(true)
      else setIsOpen(false)
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') console.error('Product share failed:', error)
    } finally {
      setIsSharing(false)
    }
  }

  const handleCopy = async () => {
    try {
      await copyProductShareLink(product)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch (error) {
      console.error('Could not copy product link:', error)
    }
  }

  return (
    <div className="product-share">
      <button className="share-btn" onClick={() => setIsOpen(value => !value)} aria-expanded={isOpen} aria-haspopup="menu" aria-label="Share this product">
        <Share2 size={20} />
      </button>
      {isOpen && (
        <div className="product-share-menu" role="menu">
          <div className="product-share-heading">
            <div>
              <strong>Share this product</strong>
              <span>Share the image, details, store and product link.</span>
            </div>
            <button className="product-share-close" onClick={() => setIsOpen(false)} aria-label="Close share menu"><X size={18} /></button>
          </div>
          <button className="product-share-native" onClick={() => void handleNativeShare()} disabled={isSharing}>
            <Share2 size={18} /> {isSharing ? 'Preparing share…' : 'Share from your phone'}
          </button>
          <div className="product-share-grid">
            <a className="product-share-option whatsapp" href={links.whatsapp} target="_blank" rel="noreferrer" role="menuitem"><MessageCircle size={19} /> WhatsApp</a>
            <a className="product-share-option facebook" href={links.facebook} target="_blank" rel="noreferrer" role="menuitem"><span className="brand-letter">f</span> Facebook</a>
            <a className="product-share-option telegram" href={links.telegram} target="_blank" rel="noreferrer" role="menuitem"><Send size={19} /> Telegram</a>
            <a className="product-share-option x" href={links.x} target="_blank" rel="noreferrer" role="menuitem"><X size={19} /> X</a>
            <a className="product-share-option email" href={links.email} role="menuitem"><Mail size={19} /> Email</a>
            <button className="product-share-option copy" onClick={() => void handleCopy()} role="menuitem">{copied ? <Check size={19} /> : <Copy size={19} />} {copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
      )}
    </div>
  )
}
