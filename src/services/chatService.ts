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
  return ((data || []) as ChatMessage[]).reverse()
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

export async function deleteChatMessage(messageId: string) {
  const client = ensureSupabase()
  const { error } = await client
    .from('chat_messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
  if (error) throw error
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
