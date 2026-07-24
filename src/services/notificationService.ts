import { supabase } from '../supabaseClient'
import { Notification } from '../types'

export const getNotifications = async (userId: string): Promise<Notification[]> => {
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data as Notification[]
}

export const markAsRead = async (notificationId: string): Promise<void> => {
  if (!supabase) return
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
  }
}

export const markAllAsRead = async (userId: string): Promise<void> => {
  if (!supabase) return
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all notifications as read:', error)
  }
}

export const createNotification = async (notification: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Promise<void> => {
  if (!supabase) return
  
  const { error } = await supabase
    .from('notifications')
    .insert([notification])

  if (error) {
    console.error('Error creating notification:', error)
  }
}

export const subscribeToNotifications = (userId: string, callback: (notification: Notification) => void) => {
  if (!supabase) return null
  
  return supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new as Notification)
      }
    )
    .subscribe()
}
