import SupabaseTest from '../components/SupabaseTest'

export default function Home() {
  return (
    <div className="page-container">
      <section className="hero">
        <h2>Welcome to Blue Water Shopping Village</h2>
        <p>Your modern supermarket experience</p>
      </section>
      <section className="content">
        <p>Discover fresh products, great deals, and exceptional service.</p>
      </section>
      <SupabaseTest />
    </div>
  )
}
