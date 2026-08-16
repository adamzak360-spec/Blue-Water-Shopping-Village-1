import { supabase } from '../supabaseClient'

export type ChatRole = 'customer' | 'seller' | 'admin'

export interface ChatConversation {
  id: string
  product_id: string
  business_id: string
  seller_id: string
  customer_id: string
  created_at: string
  updated_at: string
  last_message_at: string | null
}

export interface ChatReaction {
  message_id: string
  user_id: string
  reaction: string
  created_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_role: ChatRole
  body: string
  reply_to_message_id: string | null
  shared_message_id: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessageReceipt {
  message_id: string
  user_id: string
  delivered_at: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

const ensureSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

export async function getOrCreatePublicProductConversation(productId: string, businessId: string) {
  const client = ensureSupabase()
  const { data, error } = await client.rpc('get_or_create_public_product_conversation', {
    p_product_id: productId,
    p_business_id: businessId,
  })
  if (error) throw error
  return data as ChatConversation
}

export async function getChatParticipantNames(userIds: string[]) {
  const client = ensureSupabase()
  const ids = [...new Set(userIds.filter(Boolean))]
  if (ids.length === 0) return {} as Record<string, string>
  const { data, error } = await client.rpc('get_chat_sender_names', { p_user_ids: ids })
  if (error) throw error
  const rows = (data || []) as Array<{ user_id: string; display_name: string | null }>
  return Object.fromEntries(rows.map(profile => [profile.user_id, profile.display_name || 'Reliable member'])) as Record<string, string>
}

export async function listConversationMessages(conversationId: string, limit = 50, before?: string) {
  const client = ensureSupabase()
  let query = client
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) query = query.lt('created_at', before)
  const { data, error } = await query
  if (error) throw error
  return ((data || []) as ChatMessage[]).reverse().sort((a, b) => {
    const byTime = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return byTime || a.id.localeCompare(b.id)
  })
}

export async function sendChatMessage(input: {
  conversationId: string
  senderId: string
  senderRole: ChatRole
  body: string
  replyToMessageId?: string | null
  sharedMessageId?: string | null
}) {
  const client = ensureSupabase()
  const body = input.body.trim()
  if (!body) throw new Error('Message cannot be empty.')
  const { data, error } = await client.rpc('send_product_chat_message', {
    p_conversation_id: input.conversationId,
    p_body: body,
    p_reply_to_message_id: input.replyToMessageId || null,
    p_shared_message_id: input.sharedMessageId || null,
  })
  if (error) throw new Error(error.message || 'Message could not be sent.')
  return data as ChatMessage
}

export async function listMessageReceipts(messageIds: string[]) {
  const client = ensureSupabase()
  const ids = [...new Set(messageIds.filter(Boolean))]
  if (ids.length === 0) return [] as ChatMessageReceipt[]
  const { data, error } = await client
    .from('chat_message_receipts')
    .select('message_id, user_id, delivered_at, read_at, created_at, updated_at')
    .in('message_id', ids)
  if (error) throw error
  return (data || []) as ChatMessageReceipt[]
}

export async function markChatMessagesDelivered(conversationId: string, messageIds?: string[]) {
  const client = ensureSupabase()
  const { error } = await client.rpc('mark_chat_messages_delivered', {
    p_conversation_id: conversationId,
    p_message_ids: messageIds?.length ? messageIds : null,
  })
  if (error) throw error
}

export async function markChatMessagesRead(conversationId: string, messageIds?: string[]) {
  const client = ensureSupabase()
  const { error } = await client.rpc('mark_chat_messages_read', {
    p_conversation_id: conversationId,
    p_message_ids: messageIds?.length ? messageIds : null,
  })
  if (error) throw error
}

export async function listMessageReactions(messageIds: string[]) {
  const client = ensureSupabase()
  const ids = [...new Set(messageIds.filter(Boolean))]
  if (ids.length === 0) return [] as ChatReaction[]
  const { data, error } = await client
    .from('chat_message_reactions')
    .select('message_id, user_id, reaction, created_at')
    .in('message_id', ids)
  if (error) throw error
  return (data || []) as ChatReaction[]
}

export async function toggleMessageReaction(messageId: string, userId: string, reaction: string) {
  const client = ensureSupabase()
  const { data: existing, error: lookupError } = await client
    .from('chat_message_reactions')
    .select('message_id')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .eq('reaction', reaction)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing) {
    const { error } = await client.from('chat_message_reactions').delete()
      .eq('message_id', messageId).eq('user_id', userId).eq('reaction', reaction)
    if (error) throw error
    return false
  }
  const { error } = await client.from('chat_message_reactions').insert({ message_id: messageId, user_id: userId, reaction })
  if (error) throw error
  return true
}

export async function deleteChatMessage(messageId: string) {
  const client = ensureSupabase()
  const { error } = await client.rpc('delete_product_chat_message', { p_message_id: messageId })
  if (error) throw new Error(error.message || 'Message could not be deleted.')
}

export async function reportChatMessage(messageId: string, reporterId: string, reason: string, details?: string) {
  const client = ensureSupabase()
  const { error } = await client.from('chat_message_reports').insert({
    message_id: messageId,
    reporter_id: reporterId,
    reason,
    details: details?.trim() || null,
  })
  if (error) throw error
}

export function subscribeToMessageReactions(conversationId: string, onReaction: (reaction: ChatReaction, event: 'INSERT' | 'DELETE') => void) {
  const client = ensureSupabase()
  const channel = client
    .channel(`product-chat-reactions-${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_message_reactions',
    }, payload => onReaction(payload.new as ChatReaction, payload.eventType as 'INSERT' | 'DELETE'))
    .subscribe()
  return () => { void client.removeChannel(channel) }
}

export function subscribeToMessageReceipts(conversationId: string, onReceipt: (receipt: ChatMessageReceipt) => void) {
  const client = ensureSupabase()
  const channel = client
    .channel(`product-chat-receipts-${conversationId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'chat_message_receipts',
    }, payload => onReceipt(payload.new as ChatMessageReceipt))
    .subscribe()
  return () => { void client.removeChannel(channel) }
}

export function subscribeToConversation(conversationId: string, onMessage: (message: ChatMessage) => void) {
  const client = ensureSupabase()
  const channel = client
    .channel(`product-chat-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, payload => onMessage(payload.new as ChatMessage))
    .subscribe()
  return () => { void client.removeChannel(channel) }
}
