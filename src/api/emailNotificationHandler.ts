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
  error?: string
}> {
  try {
    const result = await sendWelcomeEmail(customerName, customerEmail)

    return {
      success: result.success,
      error: result.error,
    }
  } catch (error: any) {
    console.error('[EMAIL HANDLER] Error handling new registration:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Test email sending capability
 * 
 * Use this to verify that email configuration is working
 */
export async function testEmailSending(testEmail: string): Promise<{
  success: boolean
  message: string
  error?: string
}> {
  try {
    const emailProvider = (typeof process !== 'undefined' && process.env?.EMAIL_PROVIDER) || 'console'
    const { html, text } = {
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Test Email</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #1e3a8a; color: white; padding: 20px; border-radius: 5px; }
              .content { padding: 20px; background-color: #f5f5f5; margin-top: 20px; border-radius: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Test Email</h1>
              </div>
              <div class="content">
                <p>This is a test email from Blue Water Shopping Village.</p>
                <p>If you received this email, your email configuration is working correctly!</p>
                <p><strong>Email Provider:</strong> ${emailProvider}</p>
                <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `
Test Email

This is a test email from Blue Water Shopping Village.
If you received this email, your email configuration is working correctly!

Email Provider: ${emailProvider}
Timestamp: ${new Date().toISOString()}
      `,
    }

    // Import emailService dynamically to avoid circular imports
    const { emailService } = await import('../services/emailService')

    const result = await emailService.sendEmail({
      to: testEmail,
      subject: 'Test Email - Blue Water Shopping Village',
      html,
      text,
    })

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to send test email',
        error: result.error,
      }
    }

    return {
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
    }
  } catch (error: any) {
    console.error('[EMAIL HANDLER] Error sending test email:', error)
    return {
      success: false,
      message: 'Error sending test email',
      error: error.message,
    }
  }
}
