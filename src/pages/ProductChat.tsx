import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Flag, MessageCircle, MoreVertical, Send, ShieldCheck, Smile, Trash2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import { getProductById } from '../services/productService'
import type { Product } from '../types'
import {
  deleteChatMessage,
  getChatParticipantNames,
  getOrCreatePublicProductConversation,
  listConversationMessages,
  listMessageReceipts,
  listMessageReactions,
  markChatMessagesDelivered,
  markChatMessagesRead,
  reportChatMessage,
  sendChatMessage,
  subscribeToConversation,
  subscribeToMessageReceipts,
  subscribeToMessageReactions,
  toggleMessageReaction,
  type ChatMessage,
  type ChatMessageReceipt,
  type ChatReaction,
} from '../services/chatService'
import { markProductChatSeen } from '../services/chatUnreadStore'
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
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [receipts, setReceipts] = useState<ChatMessageReceipt[]>([])
  const [messageStatuses, setMessageStatuses] = useState<Record<string, 'sending' | 'offline' | 'sent' | 'delivered' | 'read'>>({})
  const [reactions, setReactions] = useState<ChatReaction[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [headerCompact, setHeaderCompact] = useState(false)
  const threadRef = useRef<HTMLElement | null>(null)
  const shouldStickToBottomRef = useRef(true)

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
        const loadedMessages = await listConversationMessages(conversation.id)
        setMessages(loadedMessages)
        markProductChatSeen(productId, loadedMessages.length > 0 ? loadedMessages[loadedMessages.length - 1].created_at : new Date().toISOString())
        const messageIds = loadedMessages.map(message => message.id)
        setReceipts(await listMessageReceipts(messageIds))
        setReactions(await listMessageReactions(messageIds))
        setSenderNames(await getChatParticipantNames(loadedMessages.map(message => message.sender_id)))
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
    if (!conversationId || !user || messages.length === 0) return
    const incomingIds = messages.filter(message => message.sender_id !== user.id && !message.deleted_at).map(message => message.id)
    if (incomingIds.length === 0) return
    void markChatMessagesDelivered(conversationId, incomingIds).catch(() => undefined)
    if (shouldStickToBottomRef.current) {
      void markChatMessagesRead(conversationId, incomingIds).catch(() => undefined)
    }
  }, [conversationId, messages, user])

  useEffect(() => {
    if (!conversationId) return
    return subscribeToMessageReceipts(conversationId, incoming => {
      setReceipts(previous => {
        const index = previous.findIndex(item => item.message_id === incoming.message_id && item.user_id === incoming.user_id)
        if (index === -1) return [...previous, incoming]
        const next = [...previous]
        next[index] = { ...next[index], ...incoming }
        return next
      })
    })
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    return subscribeToMessageReactions(conversationId, (incoming, event) => {
      setReactions(previous => event === 'INSERT'
        ? previous.some(item => item.message_id === incoming.message_id && item.user_id === incoming.user_id && item.reaction === incoming.reaction) ? previous : [...previous, incoming]
        : previous.filter(item => !(item.message_id === incoming.message_id && item.user_id === incoming.user_id && item.reaction === incoming.reaction)))
    })
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) return
    return subscribeToConversation(conversationId, incoming => {
      setMessages(previous => {
        if (previous.some(message => message.id === incoming.id)) return previous
        return [...previous, incoming].sort((a, b) => {
          const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          return byTime || a.id.localeCompare(b.id)
        })
      })
      void getChatParticipantNames([incoming.sender_id]).then(names => setSenderNames(previous => ({ ...previous, ...names })))
    })
  }, [conversationId])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread) return
    const onScroll = () => {
      const distanceFromBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight
      shouldStickToBottomRef.current = distanceFromBottom < 96
      setHeaderCompact(thread.scrollTop > 24)
    }
    onScroll()
    thread.addEventListener('scroll', onScroll, { passive: true })
    return () => thread.removeEventListener('scroll', onScroll)
  }, [conversationId])

  useEffect(() => {
    const thread = threadRef.current
    if (!thread || !shouldStickToBottomRef.current) return
    requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight })
  }, [messages.length])

  const participantLabel = useMemo(() => `${sellerName} and the Reliable community`, [sellerName])
  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🎉']

  const getMessageStatus = (message: ChatMessage) => {
    if (message.sender_id !== user?.id) return null
    const localStatus = messageStatuses[message.id]
    if (localStatus === 'sending' || localStatus === 'offline') return localStatus
    const messageReceipts = receipts.filter(receipt => receipt.message_id === message.id && receipt.user_id !== message.sender_id)
    if (messageReceipts.some(receipt => receipt.read_at)) return 'read'
    if (messageReceipts.some(receipt => receipt.delivered_at)) return 'delivered'
    return localStatus || 'sent'
  }

  const insertEmoji = (emoji: string) => {
    setDraft(previous => `${previous}${emoji}`)
    setShowEmojiPicker(false)
  }

  const handleReaction = async (message: ChatMessage, reaction: string) => {
    if (!user) { requireAccount(); return }
    try {
      const added = await toggleMessageReaction(message.id, user.id, reaction)
      setReactions(previous => added
        ? [...previous, { message_id: message.id, user_id: user.id, reaction, created_at: new Date().toISOString() }]
        : previous.filter(item => !(item.message_id === message.id && item.user_id === user.id && item.reaction === reaction)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reaction could not be saved.')
    }
  }

  const requireAccount = () => {
    setError('Sign in or create an account to join this public discussion.')
    navigate(`/login?redirect=${encodeURIComponent(loginTarget)}`)
  }

  const submitMessage = async (body: string, replyToMessageId?: string | null, optimisticId: string = crypto.randomUUID()) => {
    if (!user || !conversationId || !body.trim()) return
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      sender_role: currentRole,
      body: body.trim(),
      reply_to_message_id: replyToMessageId || null,
      shared_message_id: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setMessageStatuses(previous => ({ ...previous, [optimisticId]: 'sending' }))
    setMessages(previous => [...previous, optimisticMessage].sort((a, b) => {
      const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return byTime || a.id.localeCompare(b.id)
    }))
    try {
      const message = await sendChatMessage({
        conversationId,
        senderId: user.id,
        senderRole: currentRole,
        body,
        replyToMessageId,
      })
      setMessages(previous => previous.filter(item => item.id !== optimisticId).concat(message).sort((a, b) => {
        const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        return byTime || a.id.localeCompare(b.id)
      }))
      setMessageStatuses(previous => ({ ...previous, [message.id]: 'sent' }))
      return true
    } catch (err) {
      setMessageStatuses(previous => ({ ...previous, [optimisticId]: 'offline' }))
      setError(err instanceof Error ? err.message : 'Message could not be sent. Tap the warning mark to retry.')
      return false
    }
  }

  const handleSend = async () => {
    if (!user) { requireAccount(); return }
    if (!conversationId || !draft.trim() || sending) return
    setSending(true)
    setError('')
    const body = draft.trim()
    const sent = await submitMessage(body, replyTo?.id)
    if (sent) {
      setDraft('')
      setReplyTo(null)
    }
    setSending(false)
  }

  const retryMessage = async (message: ChatMessage) => {
    setMessages(previous => previous.filter(item => item.id !== message.id))
    setError('')
    setSending(true)
    await submitMessage(message.body, message.reply_to_message_id, message.id)
    setSending(false)
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
      <header className={`chat-header ${headerCompact ? 'is-compact' : ''}`}>
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

      <div className={`chat-safety-note ${headerCompact ? 'is-hidden' : ''}`}><ShieldCheck size={16} /> Public product discussion. Keep payments and private information inside Reliable Premium Marketplace.</div>

      <main ref={threadRef} className="chat-thread" aria-live="polite">
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
          const senderLabel = mine
            ? 'You'
            : message.sender_role === 'seller'
              ? `${senderNames[message.sender_id] || sellerName} · Seller`
              : message.sender_role === 'admin'
                ? `${senderNames[message.sender_id] || 'Reliable Admin'} · Admin`
                : senderNames[message.sender_id] || 'Reliable member'
          const repliedTo = message.reply_to_message_id
            ? messages.find(candidate => candidate.id === message.reply_to_message_id)
            : undefined
          const repliedToLabel = repliedTo
            ? repliedTo.sender_role === 'seller'
              ? `${senderNames[repliedTo.sender_id] || sellerName} · Seller`
              : repliedTo.sender_role === 'admin'
                ? `${senderNames[repliedTo.sender_id] || 'Reliable Admin'} · Admin`
                : senderNames[repliedTo.sender_id] || 'Reliable member'
            : 'Original message'
          return (
            <article key={message.id} className={`chat-message ${mine ? 'mine' : 'theirs'}`}>
              <div className="chat-message-bubble">
                <small>{senderLabel}</small>
                {message.reply_to_message_id && (
                  <div className="chat-quoted-message" title="Original message being replied to">
                    <strong>{repliedToLabel}</strong>
                    <span>{repliedTo?.body || 'Original message'}</span>
                  </div>
                )}
                <p>{message.body}</p>
                {reactions.filter(reaction => reaction.message_id === message.id).length > 0 && (
                  <div className="chat-reaction-list" aria-label="Message reactions">
                    {quickEmojis.map(reaction => {
                      const count = reactions.filter(item => item.message_id === message.id && item.reaction === reaction).length
                      return count > 0 ? <button key={reaction} className="chat-reaction-pill" onClick={() => void handleReaction(message, reaction)}>{reaction} {count}</button> : null
                    })}
                  </div>
                )}
                <button className="chat-message-menu-btn" onClick={() => setMenuMessageId(menuMessageId === message.id ? null : message.id)} aria-label="Message actions"><MoreVertical size={16} /></button>
                {menuMessageId === message.id && (
                  <div className="chat-message-menu">
                    {canDelete && <button onClick={() => void handleDelete(message)}><Trash2 size={14} /> Delete</button>}
                    {!mine && <button onClick={() => void handleReport(message)}><Flag size={14} /> Report</button>}
                    <button onClick={() => { setReplyTo(message); setMenuMessageId(null) }}><MessageCircle size={14} /> Reply</button>
                    <div className="chat-quick-reactions" aria-label="Add reaction">
                      {quickEmojis.map(reaction => <button key={reaction} onClick={() => void handleReaction(message, reaction)} aria-label={`React ${reaction}`}>{reaction}</button>)}
                    </div>
                  </div>
                )}
              </div>
              <div className="chat-message-meta">
                <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time>
                {getMessageStatus(message) && (() => {
                  const status = getMessageStatus(message)
                  return <button className={`chat-message-status is-${status}`} onClick={() => status === 'offline' ? void retryMessage(message) : undefined} aria-label={status === 'offline' ? 'Message not sent. Tap to retry.' : `Message ${status}`}>
                    {status === 'offline' ? '!' : status === 'sending' ? '◌' : status === 'read' ? '✓✓' : status === 'delivered' ? '✓✓' : '✓'}
                  </button>
                })()}
              </div>
            </article>
          )
        })}
      </main>

      <footer className="chat-composer">
        {error && <div className="chat-error">{error}</div>}
        {replyTo && <div className="chat-reply-preview">Replying to: {replyTo.body.slice(0, 90)} <button onClick={() => setReplyTo(null)}>Cancel</button></div>}
        <div className="chat-input-row">
          <button className="chat-emoji-button" onClick={() => setShowEmojiPicker(previous => !previous)} aria-label="Choose emoji"><Smile size={20} /></button>
          <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend() } }} placeholder={user ? 'Join the public discussion' : 'Sign in to join the discussion'} rows={1} maxLength={2000} />
          <button onClick={() => void handleSend()} disabled={!draft.trim() || sending} aria-label="Send message"><Send size={20} /></button>
        </div>
        {showEmojiPicker && <div className="chat-emoji-picker" aria-label="Emoji picker">{quickEmojis.concat(['😊', '😍', '👏', '🔥', '🙏', '💯']).map(emoji => <button key={emoji} onClick={() => insertEmoji(emoji)}>{emoji}</button>)}</div>}
        <p className="chat-compose-help">Everyone can read this product discussion. Sign in to post, reply, report, or delete your own message.</p>
        <Link to={`/product/${productId}`} className="chat-product-link">Back to product</Link>
      </footer>
    </div>
  )
}
