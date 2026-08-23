# Reliable egress optimization validation — 2026-08-23

## Result

The approved egress optimization batch is implemented in commit `f791b96ec4236d6fbe3461243bf9e1f16a520904` and pushed to the `main` branch of the connected GitHub repository. The local production build, JavaScript syntax checks, and whitespace validation all pass.

## Implemented controls

| Area | Before | After | Expected effect |
|---|---|---|---|
| Public catalog initial page | Up to 60 rows per request | 18 rows per request | At least 70% fewer product rows on the initial catalog request |
| Catalog continuation | No bounded continuation UI | Explicit `Load More Products` request with offset | Heavy product data is fetched only when the visitor asks for it |
| Product grid projection | Existing bounded RPC returned `SETOF public.products` | New `get_public_catalog_cards_bounded` returns only card, checkout-fallback, stock, seller, and delivery-fee fields as JSONB | Avoids transmitting gallery, specifications, and other detail-only columns |
| Seller storefront | Direct `select('*')`, up to 60 rows | Business-scoped bounded card request, 18 rows | Prevents empty stores from falling back to the marketplace and reduces store-grid payloads |
| Product detail chat | Unread fetch and realtime subscription during page load | Chat unread fetch and realtime subscription begin only after authenticated user clicks Chat with Seller | Removes chat traffic from ordinary product views |
| Public card images | Original Storage object URL | Supabase transformed image URL with responsive `srcSet`; original URL remains a fallback | Reduces image bytes for small grid thumbnails without changing the stored image or product IDs |
| Auth outage probe | Anonymous POST to `/auth/v1/otp` with dummy email | Lightweight GET to `/auth/v1/settings` | Removes unnecessary OTP/auth-attempt traffic |
| Sitemap | One request up to 5,000 full image-related product rows | Sitemap index plus 1,000-row child pages; regular URL pages select only `id,updated_at` | Bounds sitemap response and egress size |
| Social preview | Already narrow product selection | Preserved narrow selection and Reliable branding | Keeps WhatsApp/social previews intact |

## Validation performed

The following checks passed locally:

```text
npm run build
node --check api/share-product.js
node --check api/sitemap.js
git diff --check
```

The GitHub `main` branch contains the pushed commit. A fresh inspection of `https://reliable-now.vercel.app/` still showed the previous production bundle requesting `/auth/v1/otp` and `get_public_catalog_products_bounded`; therefore the live Vercel deployment had not yet switched to this commit at the time of verification. The new Supabase RPC also must be applied to the active project before the optimized projection is used. Until then, the application safely falls back to the existing bounded RPC.

## Required rollout step

Apply `migrations/20260823_public_catalog_cards.sql` to the active **Blue Water Shopping Village 1** Supabase project. This is additive and does not alter product IDs, checkout tables, Paystack fields, stock triggers, or payment logic. After the migration and Vercel deployment complete, recheck browser resource URLs: the catalog should call `get_public_catalog_cards_bounded`, the auth notice should call `/auth/v1/settings`, and ordinary product-detail views should not create chat conversation/message or realtime requests.

## Measurement limitation

The inherited baseline recorded 25 visible Supabase/API resource entries, but cross-origin `transferSize` values were zero in the browser context, so exact byte-level before/after egress could not be calculated there. The implementation therefore records deterministic request and row caps; the authoritative byte comparison should be taken from Supabase usage metrics after the deployment has been active for a full comparable traffic window.
