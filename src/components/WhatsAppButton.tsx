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
          <path className="whatsapp-logo-ring" d="M16 3.4a12.6 12.6 0 0 0-10.95 18.9L3.45 28.5l6.35-1.62A12.6 12.6 0 1 0 16 3.4Z" />
          <path className="whatsapp-logo-phone" d="M11.25 10.2c-.45.12-.82.58-.92 1.12-.16.9.18 2.58 1.72 4.5 1.55 1.93 3.1 2.7 4.05 2.9.57.12 1.12-.08 1.4-.5l.55-.8-2.05-1.35-.75.72c-.16.15-.4.18-.62.08-.58-.27-1.42-.84-2.05-1.65-.63-.8-.98-1.75-1.1-2.38-.04-.22.04-.44.2-.58l.78-.7-1.2-2.14-.01.01Z" />
        </svg>
      </div>
    </a>
  )
}
