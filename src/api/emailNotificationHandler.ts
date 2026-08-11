/**
 * Email Notification Handler
 * 
 * This module provides functions to be called from the frontend or backend
 * to trigger email notifications for various events.
 * 
 * In a production environment with a backend server, these would be API endpoints.
 * For now, they are structured to be easily converted to API routes.
 */

import {
  sendWelcomeEmail,
  sendNewOrderNotifications,
  sendOrderStatusChangeNotifications,
  sendAdminNewCustomerNotification,
} from '../services/emailNotifications'
import { Order } from '../types'

/**
 * Handle new order - sends confirmation to customer and notification to admin
 * 
 * Call this immediately after a successful order creation
 */
export async function handleNewOrder(
  order: Order & { id: string },
  customerEmail: string
): Promise<{
  success: boolean
  customerEmailSent: boolean
  adminEmailSent: boolean
  error?: string
}> {
  try {
    const results = await sendNewOrderNotifications(order, customerEmail)

    return {
      success: results.customerEmail || results.adminEmail,
      customerEmailSent: results.customerEmail,
      adminEmailSent: results.adminEmail,
    }
  } catch (error: any) {
    console.error('[EMAIL HANDLER] Error handling new order:', error)
    return {
      success: false,
      customerEmailSent: false,
      adminEmailSent: false,
      error: error.message,
    }
  }
}

/**
 * Handle order status change - sends update to customer
 * 
 * Call this when an admin updates the order status
 */
export async function handleOrderStatusChange(
  order: Order & { id: string },
  customerEmail: string,
  previousStatus: string,
  notifyAdmin: boolean = false
): Promise<{
  success: boolean
  customerEmailSent: boolean
  adminEmailSent: boolean
  error?: string
}> {
  try {
    const results = await sendOrderStatusChangeNotifications(
      order,
      customerEmail,
      previousStatus,
      notifyAdmin
    )

    return {
      success: results.customerEmail || results.adminEmail,
      customerEmailSent: results.customerEmail,
      adminEmailSent: results.adminEmail,
    }
  } catch (error: any) {
    console.error('[EMAIL HANDLER] Error handling status change:', error)
    return {
      success: false,
      customerEmailSent: false,
      adminEmailSent: false,
      error: error.message,
    }
  }
}

/**
 * Handle new customer registration - sends welcome email
 * 
 * Call this after a successful user registration/signup
 */
export async function handleNewCustomerRegistration(
  customerName: string,
  customerEmail: string
): Promise<{
  success: boolean
  customerEmailSent: boolean
  adminEmailSent: boolean
  error?: string
}> {
  try {
    // Send welcome email to customer
    const customerResult = await sendWelcomeEmail(customerName, customerEmail)
    
    // Send admin notification
    const adminResult = await sendAdminNewCustomerNotification(customerName, customerEmail)

    return {
      success: customerResult.success || adminResult.success,
      customerEmailSent: customerResult.success,
      adminEmailSent: adminResult.success,
      error: customerResult.error || adminResult.error,
    }
  } catch (error: any) {
    console.error('[EMAIL HANDLER] Error handling new registration:', error)
    return {
      success: false,
      customerEmailSent: false,
      adminEmailSent: false,
      error: error.message,
    }
  }
}

