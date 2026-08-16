import { useMemo, useState } from 'react'
import { BookOpen, Download, ExternalLink, FileText, ImagePlus, Megaphone, Palette, Presentation, ShieldCheck } from 'lucide-react'
import './ReliableOperationsWorkspace.css'

const manualSections = [
  {
    title: '1. Reliable at a glance',
    body: 'Reliable is a premium marketplace that connects customers with independent stores while giving sellers a durable storefront, operational tools, and a trusted route to fulfilment. Customers discover products, compare store context, communicate responsibly, pay securely, and follow orders. Sellers control their catalogue and store operations. Administrators protect the rules, evidence, and customer experience.',
  },
  {
    title: '2. Customer journey',
    body: 'Customers can begin from Home, Products, Stores, or a shared product link. They inspect product details, price, stock, seller context, delivery information, and returns before adding items to cart. After checkout, order status and delivery coordination remain visible. Product chat supports questions and group conversation, with sent, delivered, read, offline, and unread indicators.',
  },
  {
    title: '3. Seller operations',
    body: 'Sellers create a business profile, maintain their store identity, list products, manage prices and stock, fulfil orders, communicate with customers, and maintain payout details. A seller store remains the durable home for products. Public Home and Products exposure is governed separately by the administrator through free catalog mode or verified visibility entitlements.',
  },
  {
    title: '4. Store and catalogue governance',
    body: 'Every active product belongs to a seller store. In paid-publication mode, products are store-only by default and become visible on Home or Products only after an idempotent, server-verified visibility entitlement. In Free Public Catalog Mode, the administrator can make all active products publicly discoverable without requiring seller payment. Explicit product search can discover active products across stores.',
  },
  {
    title: '5. Payments, settlement, and payouts',
    body: 'Customer payment, Paystack settlement, seller wallet accumulation, and payout authorization are separate operations. A dashboard revenue figure is not automatically an available transfer balance. The payout worker verifies amount, currency, recipient, fees, settlement state, wallet threshold, and idempotency before any transfer. Below-threshold earnings remain queued or accumulate in the seller wallet; no payout is initiated without the required conditions.',
  },
  {
    title: '6. Chat and communication',
    body: 'Product chat uses a chronological WhatsApp-style experience. Messages can show sent, delivered, and read receipts. Offline states provide retry feedback. Product buttons can display unseen-message counts, and entering the chat clears the relevant unread count. Customers, visitors, and sellers should use chat for product questions and delivery coordination, not for sharing payment secrets or sensitive credentials.',
  },
  {
    title: '7. Security and administration',
    body: 'The administrator reviews sellers, stores, products, orders, visibility packages, payouts, reports, support issues, and security events. New-device sign-in alerts make unusual access visible. Financial operations are server-authorized and idempotent. Secret keys, service-role credentials, passwords, and private customer information must never be placed in manuals, slides, screenshots, or public links.',
  },
  {
    title: '8. Daily operating checklist',
    body: 'Review new sellers and store information; inspect product quality and stock; check order exceptions and delivery communication; review queued payouts and wallet thresholds; confirm visibility packages and free catalog mode; monitor chat and security alerts; export reports when needed; record material changes in the admin operating log.',
  },
]

const slides = [
  { title: 'Reliable Premium Marketplace', summary: 'Company mission, platform promise, and operating model.', visual: '/campaign-assets/free-grocery-shopping.jpg' },
  { title: 'From discovery to delivery', summary: 'The customer path from public catalogue to fulfilment.', visual: '/campaign-assets/reliable-live-products-page.webp' },
  { title: 'Seller tools that support real operations', summary: 'Storefront, catalogue, orders, chat, delivery, and payouts.', visual: '/campaign-assets/free-african-market.jpg' },
  { title: 'Visibility is controlled and reversible', summary: 'Store-only defaults, packages, and free catalog mode.', visual: '/campaign-assets/reliable-products-collage.jpg' },
  { title: 'Trust is built into payments and payouts', summary: 'Settlement discipline, wallet accumulation, and idempotent transfers.', visual: '/campaign-assets/free-business-conference.jpg' },
  { title: 'Familiar communication, accountable security', summary: 'Chat receipts, unread awareness, offline retry, and sign-in protection.', visual: '/campaign-assets/free-grocery-shopping.jpg' },
  { title: 'Administration is the control centre', summary: 'Governance across stores, catalogue, finance, security, and knowledge.', visual: '/campaign-assets/free-exhibition-floor.jpg' },
  { title: 'Reliable: discover with confidence', summary: 'Closing promise for meetings and conferences.', visual: '/campaign-assets/free-african-market.jpg' },
]

const campaignAssets = [
  { title: 'Grocery discovery', description: 'Natural retail photography for customer journeys and marketplace storytelling.', src: '/campaign-assets/free-grocery-shopping.jpg', kind: 'Free stock photograph' },
  { title: 'African market context', description: 'Authentic market photography for seller, store, and community storytelling.', src: '/campaign-assets/free-african-market.jpg', kind: 'Free stock photograph' },
  { title: 'Live Products page', description: 'Authentic screenshot of the public Reliable product-discovery interface.', src: '/campaign-assets/reliable-live-products-page.webp', kind: 'Authentic platform screenshot' },
  { title: 'Business conference', description: 'Real audience photography for meeting decks, presentations, and partner sessions.', src: '/campaign-assets/free-business-conference.jpg', kind: 'Free stock photograph' },
  { title: 'Pull-up banner', description: 'Tall event banner for reception areas, booths, and speaking engagements.', src: '/campaign-assets/reliable-pullup-banner.jpg', kind: 'Event display asset' },
  { title: 'Exhibition floor', description: 'Real event photography for exhibition and conference visual context.', src: '/campaign-assets/free-exhibition-floor.jpg', kind: 'Free stock photograph' },
]

const logoToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result || ''))
  reader.onerror = reject
  reader.readAsDataURL(file)
})

export default function ReliableOperationsWorkspace() {
  const [activeSection, setActiveSection] = useState('manual')
  const [logoUrl, setLogoUrl] = useState('/logo-transparent.png')
  const [logoShape, setLogoShape] = useState<'wide' | 'tall' | 'square'>('wide')
  const [selectedSlide, setSelectedSlide] = useState(0)

  const exportHtml = useMemo(() => {
    const logo = logoUrl || '/logo-transparent.png'
    const assetBase = typeof window !== 'undefined' ? window.location.origin : ''
    const sections = slides.map((slide, index) => `<section class="slide"><img class="slide-visual" src="${assetBase}${slide.visual}" alt=""><div class="slide-overlay"></div><img class="logo logo-${logoShape}" src="${logo}" alt="Reliable logo"><div class="eyebrow">RELIABLE PREMIUM MARKETPLACE · ${String(index + 1).padStart(2, '0')}</div><h1>${slide.title}</h1><p>${slide.summary}</p><div class="rule"></div><small>Company and platform operations</small></section>`).join('')
    return `<!doctype html><html><head><meta charset="utf-8"><title>Reliable Premium Marketplace Presentation</title><style>*{box-sizing:border-box}body{margin:0;background:#dfe8f0;font-family:Arial,Helvetica,sans-serif;color:#0f2f57}.slide{width:1280px;height:720px;margin:24px auto;padding:70px 84px;background:#f8fafc;position:relative;overflow:hidden;page-break-after:always}.slide:nth-child(odd){background:#0f2f57;color:#fff}.slide-visual{position:absolute;right:0;top:0;width:42%;height:100%;object-fit:cover;opacity:.22}.slide-overlay{position:absolute;inset:0;background:linear-gradient(90deg,#f8fafc 0%,rgba(248,250,252,.96) 48%,rgba(248,250,252,.16) 100%)}.slide:nth-child(odd) .slide-overlay{background:linear-gradient(90deg,#0f2f57 0%,rgba(15,47,87,.96) 48%,rgba(15,47,87,.18) 100%)}.logo{position:absolute;z-index:2;right:84px;top:64px;width:105px;height:55px;object-fit:contain;background:#fff;border-radius:10px;padding:6px}.eyebrow{font-size:14px;letter-spacing:3px;color:#0f8f8a;font-weight:800;margin-top:70px}.slide:nth-child(odd) .eyebrow{color:#67e8e0}.slide h1{font-size:58px;line-height:1.04;max-width:820px;margin:55px 0 24px;letter-spacing:-1.8px}.slide p{font-size:25px;line-height:1.45;max-width:670px;color:#475569}.slide:nth-child(odd) p{color:#d6e3f0}.rule{position:absolute;left:84px;right:84px;bottom:78px;border-top:1px dotted #94a3b8}.slide:nth-child(odd) .rule{border-color:rgba(255,255,255,.55)}small{position:absolute;bottom:45px;left:84px;font-size:15px;color:#64748b}.slide:nth-child(odd) small{color:#bfd2e4}@media print{body{background:#fff}.slide{margin:0}}</style></head><body>${sections}</body></html>`
  }, [logoUrl, logoShape])

  const handleLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await logoToDataUrl(file)
    const probe = new Image()
    probe.onload = () => {
      const ratio = probe.naturalWidth / Math.max(probe.naturalHeight, 1)
      setLogoShape(ratio >= 1.65 ? 'wide' : ratio <= 0.72 ? 'tall' : 'square')
    }
    probe.src = dataUrl
    setLogoUrl(dataUrl)
  }

  const downloadPresentation = () => {
    const blob = new Blob([exportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'reliable-premium-marketplace-presentation.html'
    link.click()
    URL.revokeObjectURL(url)
  }

  const printPresentation = () => {
    const win = window.open('', '_blank', 'noopener,noreferrer')
    if (!win) return
    win.document.write(exportHtml)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 350)
  }

  return (
    <section className="reliable-operations-workspace">
      <header className="operations-header">
        <div>
          <div className="operations-kicker">ADMINISTRATOR KNOWLEDGE CENTRE</div>
          <h1>System Operations Manual & Presentations</h1>
          <p>Explain Reliable clearly to customers, sellers, administrators, conference audiences, and operating partners.</p>
        </div>
        <div className={`operations-brand logo-frame ${logoShape}`}><img src={logoUrl} alt="Reliable logo preview" /><span>Brand-ready workspace</span></div>
      </header>

      <div className="operations-tabs" role="tablist" aria-label="Operations workspace sections">
        <button className={activeSection === 'manual' ? 'active' : ''} onClick={() => setActiveSection('manual')}><BookOpen size={17} /> Operations manual</button>
        <button className={activeSection === 'slides' ? 'active' : ''} onClick={() => setActiveSection('slides')}><Presentation size={17} /> Presentation deck</button>
        <button className={activeSection === 'branding' ? 'active' : ''} onClick={() => setActiveSection('branding')}><ImagePlus size={17} /> Logo and export</button><button className={activeSection === 'campaign' ? 'active' : ''} onClick={() => setActiveSection('campaign')}><Palette size={17} /> Campaign visuals</button>
      </div>

      {activeSection === 'manual' && <div className="manual-grid"><article className="manual-intro"><ShieldCheck size={24} /><h2>One operating language for the whole marketplace</h2><p>This manual is the safe, meeting-ready explanation of how Reliable works. It describes responsibilities and controls without exposing credentials or private records.</p><div className="manual-meta"><span><strong>Audience</strong> Customers · sellers · admins · partners</span><span><strong>Scope</strong> Company, platform, trust, money, and operations</span></div></article><div className="manual-sections">{manualSections.map(section => <article className="manual-section" key={section.title}><h3>{section.title}</h3><p>{section.body}</p></article>)}</div><div className="manual-actions"><a href="/docs/reliable-system-operations-manual.html" download><FileText size={17} /> Download readable manual</a><a className="manual-source-link" href="/docs/reliable-system-operations-manual.md" download>Download Markdown source</a></div></div>}

      {activeSection === 'slides' && <div className="slides-workspace"><div className="slide-list">{slides.map((slide, index) => <button className={selectedSlide === index ? 'selected' : ''} key={slide.title} onClick={() => setSelectedSlide(index)}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{slide.title}</strong><small>{slide.summary}</small></div></button>)}</div><div className={`slide-preview ${selectedSlide % 2 ? 'navy' : ''} logo-frame ${logoShape}`}><img className="preview-visual" src={slides[selectedSlide].visual} alt="" /><div className="preview-overlay" /><img className="preview-logo" src={logoUrl} alt="Reliable logo" /><div className="preview-eyebrow">RELIABLE PREMIUM MARKETPLACE · {String(selectedSlide + 1).padStart(2, '0')}</div><h2>{slides[selectedSlide].title}</h2><p>{slides[selectedSlide].summary}</p><div className="preview-rule" /><span className="preview-footer">Company and platform operations</span></div></div>}

      {activeSection === 'branding' && <div className="branding-panel"><div className="branding-copy"><ImagePlus size={28} /><h2>Upload once. Brand every slide.</h2><p>Choose a transparent PNG or high-resolution JPG. The logo is placed automatically in the reserved top-right area of every exported slide.</p><label className="upload-logo"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} /> Choose logo</label><div className="export-actions"><button onClick={downloadPresentation}><Download size={17} /> Download presentation HTML</button><button onClick={printPresentation}><ExternalLink size={17} /> Print / save as PDF</button></div></div><div className={`branding-preview logo-frame ${logoShape}`}><span>Logo preview</span><img src={logoUrl} alt="Uploaded Reliable logo" /><small>Detected shape: {logoShape}</small></div></div>}

      {activeSection === 'campaign' && <div className="campaign-workspace"><div className="campaign-intro"><Megaphone size={27} /><div><h2>Campaign visual kit</h2><p>Use these coordinated visuals for hero sections, conference presentations, flyers, pull-up banners, exhibition walls, and seller or customer storytelling. The authentic platform screenshot is clearly labelled; realistic free-image photographs are used for atmosphere and brand communication.</p></div></div><div className="campaign-grid">{campaignAssets.map(asset => <article className="campaign-asset" key={asset.src}><img src={asset.src} alt={asset.title} loading="lazy" /><div className="campaign-asset-copy"><span>{asset.kind}</span><h3>{asset.title}</h3><p>{asset.description}</p><a href={asset.src} download>Download asset</a></div></article>)}</div></div>}
    </section>
  )
}

export const reliableOperationsSlideSource = '/presentations/reliable-operations/'
