import { ArrowRight, CheckCircle2, Code2, Globe2, Hospital, Mail, MessageCircle, Phone, School, ShoppingCart, Smartphone, Wrench } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import { applySoftwareServicesSeo } from '../utils/seo'
import './SoftwareServices.css'

const services = [
  { icon: Smartphone, title: 'Mobile applications', detail: 'Android and iOS apps designed around how your customers work.' },
  { icon: ShoppingCart, title: 'SaaS and marketplaces', detail: 'Multi-vendor platforms, online stores, and subscription software.' },
  { icon: School, title: 'School management', detail: 'Practical systems for schools, staff, students, and parents.' },
  { icon: Hospital, title: 'Hospital and clinic systems', detail: 'Management software that keeps teams and patient workflows organized.' },
  { icon: ShoppingCart, title: 'Point-of-sale systems', detail: 'Retail sales, checkout, receipts, and store operations.' },
  { icon: Code2, title: 'Inventory systems', detail: 'Stock visibility and business operations in one dependable workspace.' },
  { icon: Globe2, title: 'CRM, HR and payroll', detail: 'Manage customers, teams, records, and everyday business processes.' },
  { icon: Globe2, title: 'Websites and e-commerce', detail: 'Online business solutions that look professional and work reliably.' },
  { icon: Wrench, title: 'Custom business software', detail: 'Software shaped around your workflow instead of forcing your workflow to change.' },
  { icon: Wrench, title: 'Automation and support', detail: 'Integrations, upgrades, maintenance, and ongoing technical support.' },
]

export default function SoftwareServices() {
  useEffect(() => {
    applySoftwareServicesSeo()
  }, [])

  return (
    <main className="software-services-page">
      <section className="software-services-hero" aria-labelledby="software-services-title">
        <div className="software-services-hero-copy">
          <span className="software-services-eyebrow">A Reliable Premium Marketplace service</span>
          <h1 id="software-services-title">RPM Software Services</h1>
          <p className="software-services-lede">Software that works for your business.</p>
          <p>Reliable Premium Marketplace also builds practical software for businesses, schools, retailers, healthcare teams, and growing organizations.</p>
          <div className="software-services-actions">
            <a className="software-primary-cta" href="tel:+233595609966"><Phone size={18} /> Call +233 59 560 9966</a>
            <a className="software-secondary-cta" href="https://wa.me/233595609966?text=Hello%20RPM%20Software%20Services%2C%20I%20would%20like%20to%20discuss%20a%20software%20solution." target="_blank" rel="noreferrer"><MessageCircle size={18} /> Message on WhatsApp</a>
            <a className="software-download-cta" href="/software-services-flyer-hd.png" download="RPM-Software-Services-HD.png"><ArrowRight size={18} /> Download HD flyer for WhatsApp</a>
          </div>
        </div>
        <div className="software-services-poster-wrap">
          <img src="/software-services-flyer-hd.png" alt="RPM Software Services: software platforms, mobile applications, marketplaces, POS, inventory, websites, and business software" loading="eager" />
        </div>
      </section>

      <section className="software-services-intro" aria-labelledby="software-build-title">
        <div>
          <span className="software-services-kicker">What we build</span>
          <h2 id="software-build-title">Software for your business</h2>
        </div>
        <p>From a focused mobile app to a complete business platform, RPM Software Services helps turn a business idea or operational challenge into useful, maintainable software.</p>
      </section>

      <section className="software-services-grid" aria-label="RPM Software Services capabilities">
        {services.map(({ icon: Icon, title, detail }, index) => (
          <article className="software-service-card" key={title}>
            <span className="software-service-number">{String(index + 1).padStart(2, '0')}</span>
            <div className="software-service-icon"><Icon size={23} aria-hidden="true" /></div>
            <div><h3>{title}</h3><p>{detail}</p></div>
          </article>
        ))}
      </section>

      <section className="software-services-process" aria-labelledby="software-process-title">
        <div>
          <span className="software-services-kicker">From idea to working software</span>
          <h2 id="software-process-title">Tell us what your business needs.</h2>
          <p>We will help you understand the right solution, define the workflow, and build software that fits the way your team works.</p>
        </div>
        <ul>
          <li><CheckCircle2 size={19} /> Understand your goals and workflow</li>
          <li><CheckCircle2 size={19} /> Plan a clear, practical solution</li>
          <li><CheckCircle2 size={19} /> Build, improve, and support your software</li>
        </ul>
      </section>

      <section className="software-services-contact" aria-labelledby="software-contact-title">
        <div><span className="software-services-kicker">Need a software solution?</span><h2 id="software-contact-title">Let’s build something useful for your business.</h2><p>Based in Tamale, Ghana and available to discuss software platforms, mobile apps, marketplaces, websites, POS, inventory, and custom systems.</p></div>
        <div className="software-services-contact-actions"><a href="tel:+233595609966"><Phone size={18} /> +233 59 560 9966</a><a href="mailto:support@reliable.com"><Mail size={18} /> support@reliable.com</a><Link to="/contact"><ArrowRight size={18} /> Contact Reliable</Link></div>
      </section>
    </main>
  )
}
