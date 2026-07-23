
/**
 * Email Service
 * 
 * This service handles all email notifications for the Reliable.
 * It uses a Vercel Serverless Function to send emails securely.
 */

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

class EmailService {
  private provider: string
  private fromEmail: string
  private adminEmail: string

  constructor() {
    // In Vite, use import.meta.env with VITE_ prefix for client-side access
    this.provider = import.meta.env.VITE_EMAIL_PROVIDER || 'resend'
    this.fromEmail = import.meta.env.VITE_FROM_EMAIL || 'noreply@reliable.com'
    this.adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'admin@reliable.com'
  }

  /**
   * Send email using the serverless backend
   */
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      console.log(`[EMAIL SERVICE] Requesting email send to: ${payload.to}, Subject: ${payload.subject}`);
      
      // If provider is console, just log and return success
      if (this.provider === 'console') {
        console.log('[EMAIL SERVICE] CONSOLE MODE: Email would be sent:', payload);
        return { success: true, messageId: `console-${Date.now()}` };
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          replyTo: payload.replyTo || this.fromEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[EMAIL SERVICE] Backend error:', result.error);
        return { success: false, error: result.error };
      }

      console.log('[EMAIL SERVICE] Email sent successfully via backend:', result.id);
      return { success: true, messageId: result.id };
    } catch (error: any) {
      console.error('[EMAIL SERVICE] Fetch error:', error);
      return { success: false, error: error.message };
    }
  }

  getAdminEmail(): string {
    return this.adminEmail
  }

  getFromEmail(): string {
    return this.fromEmail
  }
}

export const emailService = new EmailService()
