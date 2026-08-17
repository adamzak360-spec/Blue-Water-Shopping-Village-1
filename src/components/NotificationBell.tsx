import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Monitor, Volume2, VolumeX } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  subscribeToNotifications
} from '../services/notificationService'
import { Notification } from '../types'
import { useNavigate } from 'react-router-dom'
import './NotificationBell.css'

const SOUND_PREFERENCE_KEY = 'reliable-order-sound-alerts'
const DESKTOP_PREFERENCE_KEY = 'reliable-desktop-order-alerts'

const isOrderAlertNotification = (notification: Notification) =>
  notification.type === 'order_update'

const playOrderAlertSound = () => {
  if (typeof window === 'undefined') return
  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return
    const context = new AudioContextCtor()
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, now)
    oscillator.frequency.setValueAtTime(1175, now + 0.12)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.34)
    oscillator.addEventListener('ended', () => void context.close())
  } catch (error) {
    console.warn('Order alert sound could not play:', error)
  }
}

const showDesktopOrderAlert = (notification: Notification) => {
  if (typeof window === 'undefined' || !('Notification' in window) || window.Notification.permission !== 'granted') return
  const isStaffDashboard = window.location.pathname.startsWith('/admin')
  const target = notification.order_id
    ? (isStaffDashboard ? `/admin?order=${notification.order_id}` : `/customer/orders/${notification.order_id}`)
    : (isStaffDashboard ? '/admin' : '/customer/orders')
  const alert = new window.Notification(notification.title, {
    body: notification.message,
    icon: '/android-chrome-192x192.png',
    tag: `reliable-order-${notification.order_id || notification.id}`,
    data: { url: target },
  })
  alert.onclick = () => {
    window.focus()
    window.location.assign(target)
    alert.close()
  }
}

export default function NotificationBell() {

  const { user, role, isAdmin } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState(() => localStorage.getItem(SOUND_PREFERENCE_KEY) === 'true')
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(() => localStorage.getItem(DESKTOP_PREFERENCE_KEY) === 'true')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    const loadNotifications = async () => {
      try {
        const data = await getNotifications(user.id)
        setNotifications(data)
        setUnreadCount(data.filter(n => !n.is_read).length)
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }

    loadNotifications()

    const subscription = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)
      if (isOrderAlertNotification(newNotification)) {
        if (soundAlertsEnabled) playOrderAlertSound()
        if (desktopAlertsEnabled) showDesktopOrderAlert(newNotification)
      }
    })

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [user, soundAlertsEnabled, desktopAlertsEnabled])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return
    await markAllAsRead(user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const toggleSoundAlerts = () => {
    const next = !soundAlertsEnabled
    setSoundAlertsEnabled(next)
    localStorage.setItem(SOUND_PREFERENCE_KEY, String(next))
    if (next) playOrderAlertSound()
  }

  const toggleDesktopAlerts = async () => {
    if (!('Notification' in window)) return
    if (window.Notification.permission !== 'granted') {
      const permission = await window.Notification.requestPermission()
      const enabled = permission === 'granted'
      setDesktopAlertsEnabled(enabled)
      localStorage.setItem(DESKTOP_PREFERENCE_KEY, String(enabled))
      if (enabled) showDesktopOrderAlert({ id: 'permission-test', user_id: user?.id || '', title: 'Desktop alerts enabled', message: 'Reliable will alert you when a new order arrives.', type: 'order_update', is_read: false, created_at: new Date().toISOString() })
      return
    }
    const next = !desktopAlertsEnabled
    setDesktopAlertsEnabled(next)
    localStorage.setItem(DESKTOP_PREFERENCE_KEY, String(next))
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }
    
    if (notification.product_id) {
      navigate(`/chat/product/${notification.product_id}`)
      setIsOpen(false)
      return
    }
    if (notification.order_id) {
      const target = isAdmin
        ? `/admin?order=${notification.order_id}`
        : role === 'seller'
          ? `/dashboard?order=${notification.order_id}`
          : `/customer/orders/${notification.order_id}`
      navigate(target)
      setIsOpen(false)
    }
  }

  if (!user) return null

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button 
        className="nav-icon-link notification-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-preferences" aria-label="Alert preferences">
              <button type="button" className={`notification-preference-btn ${soundAlertsEnabled ? 'active' : ''}`} onClick={toggleSoundAlerts} title={soundAlertsEnabled ? 'Turn off order sounds' : 'Turn on order sounds'}>
                {soundAlertsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                <span>Sound</span>
              </button>
              <button type="button" className={`notification-preference-btn ${desktopAlertsEnabled ? 'active' : ''}`} onClick={toggleDesktopAlerts} title="Enable desktop order alerts">
                <Monitor size={15} />
                <span>Desktop</span>
              </button>
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="mark-all-btn">
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <p className="notification-time">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <button 
                      className="mark-read-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleMarkAsRead(notification.id)
                      }}
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
