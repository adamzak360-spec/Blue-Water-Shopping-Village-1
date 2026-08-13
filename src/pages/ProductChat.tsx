import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Flag, MessageCircle, MoreVertical, Send, ShieldCheck, Trash2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { getProductById } from '../services/productService'
import type { Product } from '../types'
import {
  deleteChatMessage,
  getOrCreatePublicProductConversation,
  listConversationMessages,
  reportChatMessage,
  sendChatMessage,
  subscribeToConversation,
  type ChatMessage,
} from '../services/chatService'
import './ProductChat.css'

export default function ProductChat() {
  const { productId } = useParams<{ productId: string }>()
  const [searchParams] = useSearchParams()
  const businessId = searchParams.get('business') || ''
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [sellerName, setSellerName] = useState('Seller')
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const currentRole = role === 'seller' ? 'seller' : 'customer'
  const loginTarget = `/chat/product/${productId}?business=${encodeURIComponent(businessId)}`

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!productId || !businessId) {
        setError('This public product discussion link is incomplete.')
        setLoading(false)
        return
      }
      try {
        const productData = await getProductById(productId)
        if (!productData) throw new Error('Product not found.')
        if (!active) return
        setProduct(productData)

        if (supabase) {
          const { data } = await supabase.from('businesses').select('name').eq('id', businessId).maybeSingle()
          if (active && data?.name) setSellerName(data.name)
        }

        const conversation = await getOrCreatePublicProductConversation(productId, businessId)
        if (!active) return
        setConversationId(conversation.id)
        setMessages(await listConversationMessages(conversation.id))
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load this product discussion.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [businessId, productId])

  useEffect(() => {
    if (!conversationId) return
    return subscribeToConversation(conversationId, incoming => {
      setMessages(previous => previous.some(message => message.id === incoming.id) ? previous : [...previous, incoming])
    })
  }, [conversationId])

  const participantLabel = useMemo(() => `${sellerName} and the Reliable community`, [sellerName])

  const requireAccount = () => {
    setError('Sign in or create an account to join this public discussion.')
    navigate(`/login?redirect=${encodeURIComponent(loginTarget)}`)
  }

  const handleSend = async () => {
    if (!user) { requireAccount(); return }
    if (!conversationId || !draft.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const message = await sendChatMessage({
        conversationId,
        senderId: user.id,
        senderRole: currentRole,
        body: draft,
        replyToMessageId: replyTo?.id,
      })
      setMessages(previous => previous.some(item => item.id === message.id) ? previous : [...previous, message])
      setDraft('')
      setReplyTo(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async (message: ChatMessage) => {
    if (!user) { requireAccount(); return }
    if (message.sender_id !== user.id && role !== 'seller' && role !== 'admin') return
    try {
      await deleteChatMessage(message.id)
      setMessages(previous => previous.filter(item => item.id !== message.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message could not be deleted.')
    }
    setMenuMessageId(null)
  }

  const handleReport = async (message: ChatMessage) => {
    if (!user) { requireAccount(); return }
    const reason = window.prompt('Why are you reporting this message?', 'Inappropriate or unsafe content')
    if (!reason) return
    try {
      await reportChatMessage(message.id, user.id, reason)
      window.alert('Thanks. The message has been reported for review.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Report could not be submitted.')
    }
    setMenuMessageId(null)
  }

  if (loading) return <div className="chat-page-state">Loading public product discussion…</div>
  if (error && !conversationId) return <div className="chat-page-state error">{error}</div>

  return (
    <div className="product-chat-page">
      <header className="chat-header">
        <button className="chat-back-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={20} /></button>
        <div className="chat-product-summary">
          {product?.image_url && <img src={product.image_url} alt="" />}
          <div>
            <strong>{product?.name || 'Product discussion'}</strong>
            <span>{participantLabel}</span>
          </div>
        </div>
        <Users size={21} aria-label="Public discussion" />
      </header>

      <div className="chat-safety-note"><ShieldCheck size={16} /> Public product discussion. Keep payments and private information inside Reliable Premium Marketplace.</div>

      <main className="chat-thread" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <MessageCircle size={42} />
            <h2>Start the public conversation</h2>
            <p>Ask a question, share an experience, or help another customer understand this product. Everyone viewing this product can see the discussion.</p>
          </div>
        )}
        {messages.map(message => {
          const mine = message.sender_id === user?.id
          const canDelete = mine || role === 'seller' || role === 'admin'
          return (
            <article key={message.id} className={`chat-message ${mine ? 'mine' : 'theirs'}`}>
              <div className="chat-message-bubble">
                <small>{message.sender_role === 'seller' ? `${sellerName} · Seller` : message.sender_role === 'admin' ? 'Reliable Admin' : 'Customer'}</small>
                {message.reply_to_message_id && <small>Replying to an earlier message</small>}
                <p>{message.body}</p>
                <time>{new Date(message.created_at).toLocaleString()}</time>
                <button className="chat-message-menu-btn" onClick={() => setMenuMessageId(menuMessageId === message.id ? null : message.id)} aria-label="Message actions"><MoreVertical size={16} /></button>
                {menuMessageId === message.id && (
                  <div className="chat-message-menu">
                    {canDelete && <button onClick={() => void handleDelete(message)}><Trash2 size={14} /> Delete</button>}
                    {!mine && <button onClick={() => void handleReport(message)}><Flag size={14} /> Report</button>}
                    <button onClick={() => { setReplyTo(message); setMenuMessageId(null) }}><MessageCircle size={14} /> Reply</button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </main>

      <footer className="chat-composer">
        {error && <div className="chat-error">{error}</div>}
        {replyTo && <div className="chat-reply-preview">Replying to: {replyTo.body.slice(0, 90)} <button onClick={() => setReplyTo(null)}>Cancel</button></div>}
        <div className="chat-input-row">
          <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend() } }} placeholder={user ? 'Join the public discussion' : 'Sign in to join the discussion'} rows={1} maxLength={2000} />
          <button onClick={() => void handleSend()} disabled={!draft.trim() || sending} aria-label="Send message"><Send size={20} /></button>
        </div>
        <p className="chat-compose-help">Everyone can read this product discussion. Sign in to post, reply, report, or delete your own message.</p>
        <Link to={`/product/${productId}`} className="chat-product-link">Back to product</Link>
      </footer>
    </div>
  )
}
