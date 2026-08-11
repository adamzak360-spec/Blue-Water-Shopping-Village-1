# Tamale-Daa Supabase Security Audit

Audit date: 2026-08-11.

The affected project is `Tamale-Daa` with project reference `obbwccldkvnoxtxmlraj`.

Supabase Advisor identified two critical findings for `public.products`: policies exist but RLS is disabled, and the public table is therefore accessible without those policies being enforced. The displayed policies include `Admins can delete products`, `Admins can insert products`, `Admins can update products`, and `Products are viewable by everyone`.

The Advisor sidebar also currently lists additional findings that require separate review: bounce-back email sending privileges, mutable function search paths for `public.set_order_total_amount` and `public.reduce_stock_on_order`, leaked-password protection disabled, public listing enabled for `storage.product-images` and `storage.product-videos`, and several `RLS Policy Always True` findings for newsletter_subscribers, orders, product_suppliers, and suppliers.

No database mutation has been performed during this audit. The next step is to inspect the exact table schema, foreign keys, policies, and application access patterns before enabling RLS or changing any policy.
