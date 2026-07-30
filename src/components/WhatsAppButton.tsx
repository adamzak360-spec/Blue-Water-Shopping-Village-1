import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const whatsappNumber = '0203355542'
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
      <span className="whatsapp-pulse"></span>
      <MessageCircle size={28} className="whatsapp-icon" />
    </a>
  )
}
