import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import './AdminNewsUpdates.css'

type Subscriber = {
  id: string
  email: string
  created_at: string
}

type NewsUpdate = {
  id: string
  title: string
  message: string
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
  updated_at: string
}

type NewsForm = {
  title: string
  message: string
  is_active: boolean
  starts_at: string
  ends_at: string
}

const emptyForm: NewsForm = {
  title: '',
  message: '',
  is_active: true,
  starts_at: '',
  ends_at: '',
}

const toInputDate = (value: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 16)
}

export default function AdminNewsUpdates() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [updates, setUpdates] = useState<NewsUpdate[]>([])
  const [form, setForm] = useState<NewsForm>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    const [{ data: subscriberData, error: subscriberError }, { data: updateData, error: updateError }] = await Promise.all([
      supabase.from('newsletter_subscriptions').select('id, email, created_at').order('created_at', { ascending: false }),
      supabase.from('news_updates').select('id, title, message, is_active, starts_at, ends_at, created_at, updated_at').order('created_at', { ascending: false }),
    ])
    if (subscriberError || updateError) {
      setError((subscriberError || updateError)?.message || 'Unable to load newsletter controls.')
    } else {
      setSubscribers((subscriberData || []) as Subscriber[])
      setUpdates((updateData || []) as NewsUpdate[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const saveUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!supabase) return
    if (!form.title.trim() || !form.message.trim()) {
      setError('A news title and message are required.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    }
    const result = editingId
      ? await supabase.from('news_updates').update(payload).eq('id', editingId)
      : await supabase.from('news_updates').insert(payload)
    if (result.error) {
      setError(result.error.message)
    } else {
      setNotice(editingId ? 'News update saved.' : 'News update published.')
      resetForm()
      await load()
    }
    setSaving(false)
  }

  const editUpdate = (update: NewsUpdate) => {
    setEditingId(update.id)
    setForm({
      title: update.title,
      message: update.message,
      is_active: update.is_active,
      starts_at: toInputDate(update.starts_at),
      ends_at: toInputDate(update.ends_at),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteUpdate = async (id: string) => {
    if (!supabase || !window.confirm('Delete this news update?')) return
    const { error: deleteError } = await supabase.from('news_updates').delete().eq('id', id)
    if (deleteError) setError(deleteError.message)
    else {
      setNotice('News update deleted.')
      await load()
    }
  }

  const removeSubscriber = async (subscriber: Subscriber) => {
    if (!supabase || !window.confirm(`Remove ${subscriber.email} from the newsletter list?`)) return
    const { error: deleteError } = await supabase.from('newsletter_subscriptions').delete().eq('id', subscriber.id)
    if (deleteError) setError(deleteError.message)
    else {
      setNotice('Subscriber removed.')
      await load()
    }
  }

  const downloadSubscribers = () => {
    const csv = ['Email,Subscribed At', ...subscribers.map((subscriber) => `${JSON.stringify(subscriber.email)},${JSON.stringify(subscriber.created_at)}`)].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'reliable-newsletter-subscribers.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-news-updates animate-fade-in">
      <div className="section-title-wrapper">
        <h2 className="section-title">News Updates & Newsletter</h2>
        <p>Publish customer-facing news, control what appears on the homepage, and manage newsletter subscribers.</p>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      {notice && <div className="form-success" role="status">{notice}</div>}
      <div className="news-admin-grid">
        <section className="news-admin-card">
          <h3>{editingId ? 'Edit News Update' : 'Create News Update'}</h3>
          <form className="admin-form" onSubmit={saveUpdate}>
            <div className="form-group">
              <label htmlFor="news-title">Headline</label>
              <input id="news-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. New delivery options now available" />
            </div>
            <div className="form-group">
              <label htmlFor="news-message">Message</label>
              <textarea id="news-message" rows={5} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Write the update customers should see..." />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="news-starts">Starts</label>
                <input id="news-starts" type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="news-ends">Ends (optional)</label>
                <input id="news-ends" type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} />
              </div>
            </div>
            <label className="news-checkbox"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Show this update to customers</label>
            <div className="form-actions">
              {editingId && <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>}
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save Changes' : 'Publish Update'}</button>
            </div>
          </form>
        </section>
        <section className="news-admin-card">
          <div className="news-card-heading"><div><h3>Newsletter Subscribers</h3><p>{subscribers.length} subscriber{subscribers.length === 1 ? '' : 's'}</p></div><button className="btn-secondary" type="button" onClick={downloadSubscribers} disabled={subscribers.length === 0}>Export CSV</button></div>
          {loading ? <p>Loading subscribers...</p> : subscribers.length === 0 ? <p className="news-empty">No subscribers yet.</p> : <div className="subscriber-list">{subscribers.map((subscriber) => <div className="subscriber-row" key={subscriber.id}><div><strong>{subscriber.email}</strong><small>{new Date(subscriber.created_at).toLocaleString()}</small></div><button type="button" className="btn-delete" onClick={() => removeSubscriber(subscriber)}>Remove</button></div>)}</div>}
        </section>
      </div>
      <section className="news-admin-card news-list-card">
        <div className="news-card-heading"><div><h3>Published & Scheduled Updates</h3><p>Only active updates within their schedule are visible on the public homepage.</p></div></div>
        {loading ? <p>Loading updates...</p> : updates.length === 0 ? <p className="news-empty">No news updates created yet.</p> : <div className="news-update-list">{updates.map((update) => <article className="news-update-row" key={update.id}><div><div className="news-update-title"><strong>{update.title}</strong><span className={update.is_active ? 'news-status active' : 'news-status'}>{update.is_active ? 'Active' : 'Hidden'}</span></div><p>{update.message}</p><small>{new Date(update.starts_at).toLocaleString()} {update.ends_at ? `– ${new Date(update.ends_at).toLocaleString()}` : '– No end date'}</small></div><div className="news-row-actions"><button type="button" className="btn-edit" onClick={() => editUpdate(update)}>Edit</button><button type="button" className="btn-delete" onClick={() => deleteUpdate(update.id)}>Delete</button></div></article>)}</div>}
      </section>
    </div>
  )
}
