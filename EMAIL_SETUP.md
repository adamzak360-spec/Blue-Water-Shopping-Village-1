# Email Notification System Setup Guide

## Overview

The Blue Water Shopping Village now includes a professional email notification system that sends automated emails for:

- **Order Confirmations** - Sent immediately after a successful order
- **Order Status Updates** - Sent when admin changes order status
- **Welcome Emails** - Sent to new registered customers
- **Admin Notifications** - Sent to admin when new orders arrive
- **Password Reset** - Handled by Supabase authentication

## Architecture

The email system is designed to be provider-agnostic and supports multiple transactional email services:

### Email Service Files

```
src/services/
├── emailService.ts              # Core email sending service
├── emailTemplates.ts            # Professional HTML email templates
└── emailNotifications.ts        # Email notification handlers

src/api/
└── emailNotificationHandler.ts  # API handlers for email triggers
```

### Integration Points

1. **Checkout.tsx** - Triggers order confirmation and admin notification
2. **Admin.tsx** - Triggers order status update emails
3. **Authentication** - Supabase handles password reset emails

## Configuration

### Environment Variables

Add these variables to your `.env` file or Vercel environment settings:

```env
# Email Provider Configuration
EMAIL_PROVIDER=console          # Options: 'console', 'resend', 'sendgrid', 'ses'
EMAIL_API_KEY=your_api_key      # Your provider's API key
FROM_EMAIL=noreply@bluewatershopping.com
ADMIN_EMAIL=admin@bluewatershopping.com
```

### Development Mode (Console)

By default, emails are logged to the console for development:

```env
EMAIL_PROVIDER=console
```

When set to `console`, all emails are logged to the server console with full content. This is perfect for testing without sending real emails.

## Setting Up Email Providers

### Option 1: Resend (Recommended)

[Resend](https://resend.com) is a modern transactional email service perfect for applications.

**Setup Steps:**

1. Create account at https://resend.com
2. Get your API key from the dashboard
3. Set environment variables:

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@bluewatershopping.com
ADMIN_EMAIL=admin@bluewatershopping.com
```

4. Verify your domain (optional but recommended for production)

### Option 2: SendGrid

[SendGrid](https://sendgrid.com) is a popular email service with generous free tier.

**Setup Steps:**

1. Create account at https://sendgrid.com
2. Create an API key in Settings > API Keys
3. Set environment variables:

```env
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=SG.xxxxxxxxxxxxx
FROM_EMAIL=noreply@bluewatershopping.com
ADMIN_EMAIL=admin@bluewatershopping.com
```

### Option 3: AWS SES

[AWS SES](https://aws.amazon.com/ses) is part of the AWS ecosystem.

**Note:** AWS SES support is not yet fully implemented. To enable it:

1. Install AWS SDK: `npm install @aws-sdk/client-ses`
2. Configure AWS credentials
3. Set environment variables:

```env
EMAIL_PROVIDER=ses
EMAIL_API_KEY=your_aws_access_key
FROM_EMAIL=noreply@bluewatershopping.com
ADMIN_EMAIL=admin@bluewatershopping.com
```

## Email Templates

All email templates are professionally designed and responsive:

### 1. Order Confirmation Email

**Sent to:** Customer
**When:** Immediately after successful order
**Contains:**
- Order ID and date
- Items ordered with quantities and prices
- Order total and delivery fee
- Delivery address
- Link to track order

### 2. Order Status Update Email

**Sent to:** Customer
**When:** Admin changes order status
**Statuses:**
- Pending
- Confirmed
- Processing
- Out for Delivery
- Delivered
- Cancelled

**Contains:**
- Previous and current status
- Status-specific message
- Order summary
- Link to view order details

### 3. Welcome Email

**Sent to:** New customer
**When:** After account registration
**Contains:**
- Personalized greeting
- Benefits of shopping with us
- Call-to-action to start shopping
- Support contact information

### 4. Admin Notification Email

**Sent to:** Admin
**When:** New order placed
**Contains:**
- Order ID and customer details
- Items ordered
- Total amount
- Delivery address
- Customer contact information

## Testing Email Notifications

### Test in Development

1. Set `EMAIL_PROVIDER=console` in your `.env`
2. Place an order or trigger an email event
3. Check the server console for email output

### Test with Real Provider

1. Configure your email provider credentials
2. Set `EMAIL_PROVIDER` to your chosen provider
3. Check your email inbox for test emails

### Manual Testing

You can manually test email sending using the test function:

```typescript
import { testEmailSending } from './src/api/emailNotificationHandler'

// Test email sending
const result = await testEmailSending('your-email@example.com')
console.log(result)
```

## Deployment to Vercel

### Step 1: Add Environment Variables

1. Go to Vercel project settings
2. Navigate to Environment Variables
3. Add the following:

```
EMAIL_PROVIDER=resend (or your chosen provider)
EMAIL_API_KEY=your_api_key
FROM_EMAIL=noreply@bluewatershopping.com
ADMIN_EMAIL=admin@bluewatershopping.com
```

### Step 2: Deploy

Push your changes to GitHub and Vercel will automatically deploy:

```bash
git add .
git commit -m "Add email notification system"
git push origin main
```

### Step 3: Verify

1. Visit your live site
2. Place a test order
3. Check your email inbox for confirmation
4. Check admin email for new order notification

## Troubleshooting

### Emails Not Sending

**Check 1: Provider Configuration**
- Verify `EMAIL_PROVIDER` is set correctly
- Verify `EMAIL_API_KEY` is valid
- Check provider dashboard for API usage/errors

**Check 2: Environment Variables**
- Confirm all required env vars are set
- In Vercel, redeploy after adding env vars
- Check server logs for error messages

**Check 3: Email Address**
- Verify `FROM_EMAIL` is verified with your provider
- Verify `ADMIN_EMAIL` is correct
- Check spam folder

### Console Mode Not Working

- Verify `EMAIL_PROVIDER=console`
- Check server console/logs
- Ensure no errors in email service

### Provider-Specific Issues

**Resend:**
- Check domain verification status
- Verify API key has correct permissions
- Check Resend dashboard for delivery status

**SendGrid:**
- Verify sender email is approved
- Check SendGrid dashboard for bounces/blocks
- Ensure API key has mail send permission

## Future Enhancements

Potential improvements to the email system:

1. **Email Templates UI** - Admin panel to customize email templates
2. **Email History** - Track all sent emails in database
3. **Retry Logic** - Automatic retry for failed emails
4. **Attachments** - Support for invoices/receipts as PDF attachments
5. **Scheduled Emails** - Send emails at specific times
6. **A/B Testing** - Test different email variations
7. **Unsubscribe** - Allow customers to manage email preferences

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review email provider documentation
3. Check server logs for error messages
4. Contact support at support@bluewatershopping.com

## Security Notes

- **Never commit API keys** - Always use environment variables
- **Use HTTPS** - All email links should be HTTPS
- **Validate emails** - Ensure email addresses are valid before sending
- **Rate limiting** - Consider implementing rate limiting to prevent abuse
- **Unsubscribe links** - Always include unsubscribe options in emails

---

**Last Updated:** July 12, 2026
**Version:** 1.0
