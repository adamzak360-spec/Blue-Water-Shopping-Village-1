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
        <svg viewBox="0 0 32 32" className="whatsapp-icon" aria-hidden="true">
          <path className="whatsapp-logo-ring" d="M16 3.25a12.75 12.75 0 0 0-11.1 19.04L3.3 28.7l6.58-1.68A12.75 12.75 0 1 0 16 3.25Z" />
          <path className="whatsapp-logo-phone" d="M11.05 9.45c.32-.55.67-.58 1.08-.58h.72c.23 0 .55.08.72.58l.98 2.63c.15.42.08.67-.16.98l-.78 1.02c-.2.25-.16.48-.03.7.5.88 1.18 1.66 1.92 2.3.82.71 1.73 1.28 2.76 1.64.3.1.53.08.73-.17l1.05-1.29c.22-.28.46-.3.82-.14l2.48 1.17c.36.17.58.25.66.43.08.19.08 1.06-.29 1.78-.37.72-1.46 1.37-2.02 1.45-.52.08-1.18.12-1.9-.11-.44-.14-1.01-.33-1.74-.65-3.06-1.32-5.07-4.42-5.23-4.63-.15-.21-1.24-1.65-1.24-3.15 0-1.5.78-2.24 1.05-2.54Z" />
        </svg>
      </div>
    </a>
  )
}
