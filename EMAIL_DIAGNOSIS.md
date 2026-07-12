# Email Notification Diagnosis

## Current Implementation Details
- **Provider System**: The application uses a multi-provider `EmailService` (`src/services/emailService.ts`) supporting:
  - `console` (default, logs to console only)
  - `resend` (Resend.com API)
  - `sendgrid` (SendGrid API)
  - `ses` (AWS SES - noted as "not yet implemented")
- **Frontend-only Logic**: Email notifications are triggered directly from the frontend browser after successful actions (e.g., in `Checkout.tsx` after order creation).
- **Environment Variables**: The service looks for:
  - `EMAIL_PROVIDER`
  - `EMAIL_API_KEY`
  - `FROM_EMAIL`
  - `ADMIN_EMAIL`
- **Missing Backend**: There is no server-side component (Edge Functions or API routes) handling emails. They are sent via `fetch` directly from the client.

## Identified Issues
1. **Environment Variables Prefix**: In Vite-based projects, environment variables must be prefixed with `VITE_` to be accessible in the client-side code. The current code uses `process.env.EMAIL_PROVIDER` which is usually `undefined` in a browser environment unless specifically handled.
2. **Client-side Fetch Limitations**: Sending emails directly from the client via `fetch` to provider APIs (like Resend/SendGrid) often fails due to CORS (Cross-Origin Resource Sharing) policies. These APIs are typically designed for server-to-server communication.
3. **Missing Configuration**: If the user hasn't provided API keys or configured a provider, it defaults to `console` mode, which only logs to the browser console and doesn't send real emails.

## Required Credentials
To send real emails, the following are needed:
- A Resend or SendGrid API Key.
- A verified sender domain or email address.
- These must be added to Vercel environment variables with the `VITE_` prefix.
