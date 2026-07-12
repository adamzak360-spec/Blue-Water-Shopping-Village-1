/**
 * Email Notifications Service
 * 
 * This service handles triggering email notifications for various events:
 * - Order confirmations
 * - Order status updates
 * - Welcome emails
 * - Admin notifications
 */

import { emailService, EmailPayload } from './emailService'
import {
  getOrderConfirmationTemplate,
  getOrderStatusUpdateTemplate,
  getWelcomeTemplate,
  getAdminNewOrderTemplate,
} from './emailTemplates'
import { Order } from '../types'

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getOrderConfirmationTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Order Confirmation - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@bluewatershopping.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send order confirmation:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Order confirmation sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending order confirmation:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send order status update email to customer
 */
export async function sendOrderStatusUpdateEmail(
  order: Order & { id: string },
  customerEmail: string,
  previousStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getOrderStatusUpdateTemplate(order, previousStatus)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Order Status Update - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@bluewatershopping.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send status update:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Order status update sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending status update:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send welcome email to new customer
 */
export async function sendWelcomeEmail(
  customerName: string,
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getWelcomeTemplate(customerName, customerEmail)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Welcome to Blue Water Shopping Village, ${customerName}!`,
      html,
      text,
      replyTo: 'support@bluewatershopping.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send welcome email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Welcome email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending welcome email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send admin notification for new order
 */
export async function sendAdminNewOrderNotification(
  order: Order & { id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@bluewatershopping.com'

    const { html, text } = getAdminNewOrderTemplate(order)

    const payload: EmailPayload = {
      to: adminEmail,
      subject: `New Order Received - #${order.id.slice(0, 8)} - GH₵${order.total.toFixed(2)}`,
      html,
      text,
      replyTo: order.customer_email,
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send admin notification:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Admin notification sent for order', order.id)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending admin notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send all notifications for a new order
 * - Customer confirmation email
 * - Admin notification
 */
export async function sendNewOrderNotifications(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ customerEmail: boolean; adminEmail: boolean }> {
  const results = {
    customerEmail: false,
    adminEmail: false,
  }

  // Send customer confirmation
  const customerResult = await sendOrderConfirmationEmail(order, customerEmail)
  results.customerEmail = customerResult.success

  // Send admin notification
  const adminResult = await sendAdminNewOrderNotification(order)
  results.adminEmail = adminResult.success

  return results
}

/**
 * Send all notifications for order status change
 * - Customer status update email
 * - Admin notification (optional)
 */
export async function sendOrderStatusChangeNotifications(
  order: Order & { id: string },
  customerEmail: string,
  previousStatus: string,
  notifyAdmin: boolean = false
): Promise<{ customerEmail: boolean; adminEmail: boolean }> {
  const results = {
    customerEmail: false,
    adminEmail: false,
  }

  // Send customer status update
  const customerResult = await sendOrderStatusUpdateEmail(order, customerEmail, previousStatus)
  results.customerEmail = customerResult.success

  // Optionally send admin notification
  if (notifyAdmin) {
    const adminResult = await sendAdminNewOrderNotification(order)
    results.adminEmail = adminResult.success
  }

  return results
}
