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
  getOrderApprovedTemplate,
  getPaymentConfirmedTemplate,
  getReadyForPickupTemplate,
  getOutForDeliveryTemplate,
  getDeliveredTemplate,
  getAdminNewCustomerTemplate,
  getAdminOrderCancellationTemplate,
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
      subject: `Welcome to Reliable, ${customerName}!`,
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

import {
  getLowStockAlertTemplate,
  getRestockRequestTemplate,
} from './emailTemplates'

/**
 * Send low stock alert to admin
 */
export async function sendLowStockAlert(products: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@bluewatershopping.com'
    const { html, text } = getLowStockAlertTemplate(products)

    const payload: EmailPayload = {
      to: adminEmail,
      subject: `LOW STOCK ALERT: ${products.length} items need attention`,
      html,
      text,
    }

    return await emailService.sendEmail(payload)
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending low stock alert:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send restock request to supplier
 */
export async function sendRestockRequest(supplier: any, products: any[]): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getRestockRequestTemplate(supplier, products)

    const payload: EmailPayload = {
      to: supplier.email_address,
      subject: `Restock Request from ${import.meta.env.VITE_COMPANY_NAME || 'Reliable'}`,
      html,
      text,
      replyTo: import.meta.env.VITE_ADMIN_EMAIL || 'admin@bluewatershopping.com',
    }

    return await emailService.sendEmail(payload)
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending restock request:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send order approved email to customer
 */
export async function sendOrderApprovedEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getOrderApprovedTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Order Approved - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@reliable.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send order approved email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Order approved email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending order approved email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send payment confirmed email to customer
 */
export async function sendPaymentConfirmedEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getPaymentConfirmedTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Payment Confirmed - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@reliable.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send payment confirmed email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Payment confirmed email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending payment confirmed email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send ready for pickup email to customer
 */
export async function sendReadyForPickupEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getReadyForPickupTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Ready for Pickup - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@reliable.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send ready for pickup email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Ready for pickup email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending ready for pickup email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send out for delivery email to customer
 */
export async function sendOutForDeliveryEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getOutForDeliveryTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Out for Delivery - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@reliable.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send out for delivery email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Out for delivery email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending out for delivery email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send delivered email to customer
 */
export async function sendDeliveredEmail(
  order: Order & { id: string },
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { html, text } = getDeliveredTemplate(order)

    const payload: EmailPayload = {
      to: customerEmail,
      subject: `Order Delivered - Order #${order.id.slice(0, 8)}`,
      html,
      text,
      replyTo: 'support@reliable.com',
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send delivered email:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Delivered email sent to', customerEmail)
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending delivered email:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send admin notification for new customer registration
 */
export async function sendAdminNewCustomerNotification(
  customerName: string,
  customerEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@reliable.com'

    const { html, text } = getAdminNewCustomerTemplate(customerName, customerEmail)

    const payload: EmailPayload = {
      to: adminEmail,
      subject: `New Customer Registration - ${customerName}`,
      html,
      text,
      replyTo: customerEmail,
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send admin new customer notification:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Admin new customer notification sent')
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending admin new customer notification:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Send admin notification for order cancellation
 */
export async function sendAdminOrderCancellationNotification(
  order: Order & { id: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@reliable.com'

    const { html, text } = getAdminOrderCancellationTemplate(order)

    const payload: EmailPayload = {
      to: adminEmail,
      subject: `Order Cancelled - #${order.id.slice(0, 8)} - ${order.customer_name}`,
      html,
      text,
      replyTo: order.customer_email,
    }

    const result = await emailService.sendEmail(payload)

    if (!result.success) {
      console.error('[EMAIL NOTIFICATIONS] Failed to send admin order cancellation notification:', result.error)
      return { success: false, error: result.error }
    }

    console.log('[EMAIL NOTIFICATIONS] Admin order cancellation notification sent')
    return { success: true }
  } catch (error: any) {
    console.error('[EMAIL NOTIFICATIONS] Error sending admin order cancellation notification:', error)
    return { success: false, error: error.message }
  }
}
