/**
 * Email Service
 * 
 * This service handles all email notifications for the Reliable.
 * It's designed to work with transactional email providers like Resend, SendGrid, or AWS SES.
 * 
 * To enable email sending, set the following environment variables:
 * - EMAIL_PROVIDER: 'resend' | 'sendgrid' | 'ses' (default: 'console')
 * - EMAIL_API_KEY: Your provider's API key
 * - ADMIN_EMAIL: Admin email address for notifications
 * - FROM_EMAIL: Sender email address (e.g., noreply@bluewatershopping.com)
 */

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

class EmailService {
  private provider: string
  private apiKey: string | null
  private fromEmail: string
  private adminEmail: string

  constructor() {
    // In Vite, use import.meta.env with VITE_ prefix for client-side access
    this.provider = import.meta.env.VITE_EMAIL_PROVIDER || 'console'
    this.apiKey = import.meta.env.VITE_EMAIL_API_KEY || null
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@bluewatershopping.com'
    this.adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@bluewatershopping.com'
  }

  /**
   * Send email using configured provider
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Log email in development/console mode
      if (this.provider === 'console') {
        console.log('[EMAIL SERVICE] Email would be sent:')
        console.log(`To: ${payload.to}`)
        console.log(`Subject: ${payload.subject}`)
        console.log(`From: ${this.fromEmail}`)
        console.log('---')
        console.log(payload.html)
        console.log('---')
        return { success: true, messageId: `console-${Date.now()}` }
      }

      // Resend provider
      if (this.provider === 'resend' && this.apiKey) {
        return await this.sendViaResend(payload)
      }

      // SendGrid provider
      if (this.provider === 'sendgrid' && this.apiKey) {
        return await this.sendViaSendGrid(payload)
      }

      // AWS SES provider
      if (this.provider === 'ses' && this.apiKey) {
        return await this.sendViaSES(payload)
      }

      // No provider configured
      console.warn('[EMAIL SERVICE] No email provider configured. Email not sent.')
      return { success: false, error: 'No email provider configured' }
    } catch (error: any) {
      console.error('[EMAIL SERVICE] Error sending email:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send via Resend (https://resend.com)
   */
  private async sendViaResend(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          reply_to: payload.replyTo || this.fromEmail,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Resend API error: ${error.message}`)
      }

      const data = await response.json()
      return { success: true, messageId: data.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send via SendGrid (https://sendgrid.com)
   */
  private async sendViaSendGrid(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: payload.to }],
              subject: payload.subject,
            },
          ],
          from: { email: this.fromEmail },
          content: [
            {
              type: 'text/html',
              value: payload.html,
            },
          ],
          reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`SendGrid API error: ${error}`)
      }

      // SendGrid returns 202 Accepted
      const messageId = response.headers.get('X-Message-ID') || `sendgrid-${Date.now()}`
      return { success: true, messageId }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Send via AWS SES (https://aws.amazon.com/ses)
   */
  private async sendViaSES(_payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // This would require AWS SDK installation
      // For now, return a placeholder
      console.warn('[EMAIL SERVICE] AWS SES not yet implemented. Please install @aws-sdk/client-ses')
      return { success: false, error: 'AWS SES not yet implemented' }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get admin email address
   */
  getAdminEmail(): string {
    return this.adminEmail
  }

  /**
   * Get from email address
   */
  getFromEmail(): string {
    return this.fromEmail
  }
}

export const emailService = new EmailService()
