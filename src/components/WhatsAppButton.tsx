import './WhatsAppButton.css'

export default function WhatsAppButton() {
  // Format for WhatsApp URL (international format for Ghana: +233)
  const formattedNumber = '233203355542'
  const message = 'Hello! I would like to inquire about a product.'
  const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodeURIComponent(message)}`

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Chat on WhatsApp"
    >
      <div className="whatsapp-pulse"></div>
      <div className="whatsapp-button-inner">
        <svg viewBox="0 0 32 32" className="whatsapp-icon" fill="currentColor">
          <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.958A15.89 15.89 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.302 22.602c-.39 1.1-1.932 2.014-3.172 2.28-.852.18-1.964.324-5.71-1.226-4.792-1.984-7.876-6.834-8.112-7.15-.228-.316-1.916-2.552-1.916-4.874s1.214-3.446 1.648-3.924c.434-.478.946-.596 1.26-.596.314 0 .628.002.902.016.29.014.68-.11 1.064.814.39.938 1.332 3.252 1.448 3.488.116.236.194.512.04.828-.156.316-.234.512-.47.788-.236.276-.496.616-.71.828-.236.236-.482.492-.208.968.274.478 1.22 2.028 2.62 3.274 1.802 1.604 3.318 2.102 3.788 2.338.47.236.746.196 1.022-.118.276-.314 1.182-1.378 1.496-1.852.314-.474.628-.394 1.06-.236.434.158 2.738 1.292 3.208 1.528.47.236.784.354.9.552.116.198.116 1.14-.274 2.24z"/>
        </svg>
      </div>
    </a>
  )
}
