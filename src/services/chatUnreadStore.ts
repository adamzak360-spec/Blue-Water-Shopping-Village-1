const STORAGE_PREFIX = 'reliable:product-chat-unread:'

interface ChatUnreadState {
  count: number
  lastSeenAt: string | null
}

const keyFor = (productId: string) => `${STORAGE_PREFIX}${productId}`

const readState = (productId: string): ChatUnreadState => {
  if (typeof window === 'undefined') return { count: 0, lastSeenAt: null }
  try {
    const raw = window.localStorage.getItem(keyFor(productId))
    if (!raw) return { count: 0, lastSeenAt: null }
    const parsed = JSON.parse(raw) as Partial<ChatUnreadState>
    return {
      count: Math.max(0, Number(parsed.count) || 0),
      lastSeenAt: typeof parsed.lastSeenAt === 'string' ? parsed.lastSeenAt : null,
    }
  } catch {
    return { count: 0, lastSeenAt: null }
  }
}

const writeState = (productId: string, state: ChatUnreadState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(keyFor(productId), JSON.stringify(state))
  window.dispatchEvent(new CustomEvent('reliable:chat-unread-changed', { detail: { productId, ...state } }))
}

export const getChatUnreadState = (productId: string) => readState(productId)

export const getChatUnreadSince = (productId: string) => readState(productId).lastSeenAt

export const setChatUnreadCount = (productId: string, count: number, newestMessageAt?: string | null) => {
  const current = readState(productId)
  writeState(productId, {
    count: Math.max(0, Math.floor(count)),
    lastSeenAt: newestMessageAt ?? current.lastSeenAt,
  })
}

export const recordUnreadChatMessage = (productId: string, createdAt: string) => {
  const current = readState(productId)
  if (current.lastSeenAt && new Date(createdAt).getTime() <= new Date(current.lastSeenAt).getTime()) return current
  const next = { count: current.count + 1, lastSeenAt: current.lastSeenAt }
  writeState(productId, next)
  return next
}

export const markProductChatSeen = (productId: string, seenAt = new Date().toISOString()) => {
  writeState(productId, { count: 0, lastSeenAt: seenAt })
}

export const subscribeToChatUnreadChanges = (productId: string, onChange: (state: ChatUnreadState) => void) => {
  if (typeof window === 'undefined') return () => undefined
  const onCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<ChatUnreadState & { productId: string }>).detail
    if (detail?.productId === productId) onChange({ count: detail.count, lastSeenAt: detail.lastSeenAt })
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === keyFor(productId)) onChange(readState(productId))
  }
  window.addEventListener('reliable:chat-unread-changed', onCustomEvent)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener('reliable:chat-unread-changed', onCustomEvent)
    window.removeEventListener('storage', onStorage)
  }
}
