# Reliable Evolution: Global Marketplace Migration Guide

I have implemented a comprehensive set of features to evolve Reliable into a global multi-vendor marketplace. To complete the setup, you need to run the following SQL migrations in your Supabase SQL Editor.

## Migration Order

Please run these scripts in the order listed below:

1.  `migrations/20260811_global_architecture.sql` - Sets up the global country and currency foundation.
2.  `migrations/20260811_identity_verification.sql` - Sets up identity verification for users.
3.  `migrations/20260811_business_verification.sql` - Sets up business verification for sellers.
4.  `migrations/20260811_global_payouts.sql` - Relaxes payout constraints for international support.
5.  `migrations/20260811_security_hardening.sql` - Replaces hardcoded admin emails with role-based security.

## New Features Implemented

| Feature | Description |
| :--- | :--- |
| **Global Architecture** | Support for multiple countries (GH, NG, KE, US, GB) and currencies (GHS, NGN, KES, USD, GBP). |
| **Identity Verification** | Users can upload IDs (Passports, National IDs) for verification. |
| **Business Verification** | Sellers can upload business registration and address documents. |
| **Seller Onboarding** | Enhanced registration flow with a dashboard checklist to guide new sellers. |
| **Store Branding** | Sellers can now upload custom logos and banners for their storefronts. |
| **International Payouts** | Support for international bank accounts, IBAN, and SWIFT codes. |
| **Admin Management** | New interfaces to review verifications, manage commissions, and configure marketplace settings. |

## Important Note on Storage
I have created policies for 3 new storage buckets:
- `identity-documents` (Private)
- `business-documents` (Private)
- `business-assets` (Public)

Ensure these buckets are created in your Supabase Storage dashboard if they aren't automatically created by the SQL scripts.
