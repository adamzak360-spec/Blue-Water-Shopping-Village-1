# Unified Checkout Implementation

## Overview
This document describes the implementation of a unified order creation flow for authenticated customers and guests.

## Changes Made

### 1. Type System Update (`src/types/index.ts`)
- **Added**: `user_id?: string` field to the `Order` interface
- **Purpose**: Track which authenticated user created the order
- **Backward Compatible**: Field is optional, so existing guest orders remain unaffected

### 2. Checkout Page Refactor (`src/pages/Checkout.tsx`)

#### Key Changes:
- **Import Auth Context**: Added `useAuth()` hook to access authenticated user information
- **Import Order Service**: Added `createOrder` from `orderService` for authenticated customers
- **Pre-populate Form Fields**: When user is logged in, form fields are pre-populated with:
  - `fullName`: From `user.user_metadata.full_name` or email prefix
  - `email`: From `user.email`
  - `phone`: From `user.user_metadata.phone`
  - `address`: From `user.user_metadata.address`
  - `city`: From `user.user_metadata.city`
  - `region`: From `user.user_metadata.region`

#### Order Creation Logic:
```typescript
if (user) {
  // Authenticated customer - use unified orderService
  result = await createOrder({
    ...orderPayload,
    user_id: user.id
  })
} else if (GUEST_CHECKOUT_ENABLED) {
  // Guest checkout - use guestOrderService
  result = await createGuestOrder(orderPayload)
} else {
  throw new Error('Guest checkout is disabled. Please log in to place an order.')
}
```

#### Configuration:
- `GUEST_CHECKOUT_ENABLED` constant controls whether guest checkout is allowed
- Currently set to `true` to maintain backward compatibility
- Can be moved to environment variables for dynamic configuration

### 3. Login Page Enhancement (`src/pages/Login.tsx`)
- **Added Redirect Support**: Login page now respects a `redirect` query parameter
- **Behavior**: After successful login, users are redirected to their intended destination (e.g., `/checkout`) instead of always going to `/admin`
- **Fallback**: If no redirect parameter is provided, users are redirected to `/admin` as before

### 4. Navigation Update (`src/App.tsx`)
- **Login Link**: Now includes a `redirect` query parameter pointing to the current page
- **Benefit**: Users can click "Login" from the checkout page and return to checkout after logging in

## Order Creation Flow

### For Authenticated Customers:
1. User logs in via `/login` page
2. User adds products to cart
3. User proceeds to checkout at `/checkout`
4. Form fields are pre-populated with user data from Supabase auth metadata
5. User submits the form
6. `createOrder()` is called with:
   - All order details (customer info, items, totals)
   - `user_id` from the authenticated session
7. Order is created in the database with `user_id` attached
8. Cart is cleared and user is redirected to home

### For Guest Customers:
1. User (not logged in) adds products to cart
2. User proceeds to checkout at `/checkout`
3. Form fields are empty (no user data to pre-populate)
4. User manually enters all customer information
5. User submits the form
6. `createGuestOrder()` is called with all form data
7. Order is created in the database without `user_id`
8. Cart is cleared and user is redirected to home

## Database Schema Considerations

### Current RLS Policy:
The migration `20260710_fix_guest_checkout.sql` created an INSERT policy:
```sql
CREATE POLICY "Allow anyone to create an order" ON orders
  FOR INSERT
  WITH CHECK (true);
```

This allows both authenticated and unauthenticated users to insert orders.

### Recommended Future Enhancement:
Consider creating separate policies for authenticated vs. guest orders:
```sql
-- For authenticated users
CREATE POLICY "Authenticated users can create orders" ON orders
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- For guest orders (if guest checkout is enabled)
CREATE POLICY "Guests can create orders" ON orders
  FOR INSERT
  WITH CHECK (auth.role() = 'anon' AND guest_checkout_enabled = true);
```

## Testing Checklist

### Authenticated Customer Flow:
- [ ] Create a new customer account in Supabase Auth
- [ ] Log in with the customer account
- [ ] Add products to cart
- [ ] Proceed to checkout
- [ ] Verify form fields are pre-populated with user data
- [ ] Submit order
- [ ] Verify order appears in admin orders table
- [ ] Verify `user_id` is correctly set in the order record
- [ ] Verify order contains correct customer name, email, phone, address, city, region

### Guest Customer Flow:
- [ ] Do NOT log in
- [ ] Add products to cart
- [ ] Proceed to checkout
- [ ] Verify form fields are empty
- [ ] Fill in all customer information manually
- [ ] Submit order
- [ ] Verify order appears in admin orders table
- [ ] Verify `user_id` is NULL in the order record
- [ ] Verify order contains correct manually entered customer information

### Admin Functionality:
- [ ] Log in as admin
- [ ] Verify all orders (both authenticated and guest) appear in the orders table
- [ ] Verify order status can be updated
- [ ] Verify payment status can be updated
- [ ] Verify no existing admin functionality is broken

### Navigation:
- [ ] From products page, click "Login"
- [ ] Verify redirect parameter is set correctly
- [ ] Log in successfully
- [ ] Verify user is redirected back to products page
- [ ] Repeat with checkout page

## Configuration Options

### Guest Checkout Enable/Disable:
To disable guest checkout, change in `src/pages/Checkout.tsx`:
```typescript
const GUEST_CHECKOUT_ENABLED = false
```

When disabled:
- Unauthenticated users will see an error: "Guest checkout is disabled. Please log in to place an order."
- Users must log in before they can place orders

### User Metadata Fields:
The pre-population logic looks for these fields in `user.user_metadata`:
- `full_name`: User's full name
- `phone`: User's phone number
- `address`: User's delivery address
- `city`: User's city
- `region`: User's region

These fields can be populated during user registration or profile update.

## Backward Compatibility

- ✅ Existing guest orders continue to work unchanged
- ✅ Existing admin functionality is completely unchanged
- ✅ `orderService.createOrder()` is used for both authenticated and admin orders
- ✅ `guestOrderService.createGuestOrder()` remains available for guest orders
- ✅ No breaking changes to the database schema or RLS policies

## Future Enhancements

1. **User Profile Management**: Add a profile page where users can update their delivery address and phone number
2. **Order History**: Add a page where authenticated users can view their past orders
3. **Order Tracking**: Allow users to track their orders in real-time
4. **Guest Order Lookup**: Allow guests to look up their orders using order ID and email
5. **Conditional Guest Checkout**: Make guest checkout configurable via environment variables or admin settings
6. **Order Notifications**: Send email confirmations to both authenticated and guest customers
