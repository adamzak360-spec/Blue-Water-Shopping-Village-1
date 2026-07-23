# Rebranding and Fix Findings

## UI Bug Fix
- **Status**: Fixed.
- **Change**: In `src/pages/ProductDetails.tsx`, changed "By {product.category}" to "Buy {product.name}" and "By {product.category}". Actually, the user wanted "Buy + Product Name".
- **Code Change**:
```tsx
<h1 className="product-title">Buy {product.name}</h1>
<p className="product-supplier">By {product.category}</p>
```

## Notification Bell and Customer Account Order Updates
- **Finding**: The "Notification Bell" and "Notification History" are NOT currently implemented in the codebase.
- **Evidence**: 
  - `src/App.tsx` has a `<Bell />` icon from `lucide-react` but it's just a static button.
  - No `NotificationBell` component exists.
  - No `notifications` table exists in the database migrations.
  - `src/types/index.ts` has no `Notification` type.
- **Regression Cause**: A recent "email notification" implementation replaced the previously working in-app notification system (if it ever existed in this repo) or the user's previous session had it, but it was lost or not committed.
- **Plan**: 
  1. Create a `notifications` table in Supabase.
  2. Create a `NotificationBell` component.
  3. Integrate the bell into `App.tsx`.
  4. Update `orderService.ts` to insert notifications when status changes.

## Email Notifications
- **Finding**: The email notification system uses a Vercel serverless function at `/api/send-email`.
- **Issues**:
  - `VITE_EMAIL_PROVIDER` is set to `resend` by default, but requires `RESEND_API_KEY` in environment variables.
  - `VITE_FROM_EMAIL` defaults to `onboarding@resend.dev` if not set.
- **Plan**: Verify environment variables on Vercel and ensure the serverless function is working.

## Order Updates
- **Finding**: Real-time order updates are implemented in `CustomerDashboard.tsx` and `OrderDetails.tsx` using Supabase real-time subscriptions.
- **Issue**: The user says they "stopped working". This might be due to RLS policies or subscription issues.
- **Plan**: Check RLS policies for the `orders` table.
