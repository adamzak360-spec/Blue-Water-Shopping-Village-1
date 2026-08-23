Reliable egress optimization baseline — 2026-08-23

Source: public production homepage https://reliable-now.vercel.app/?egress-baseline=1, captured via browser PerformanceResourceTiming before code changes.

Measured visible Supabase/API resource entries: 25 total (the console output was partially truncated after the first 20 rows, so this is a lower-bound inventory for the full page resource set). Browser timing reported transferSize=0 for most cross-origin Supabase responses, so exact byte totals are unavailable from this browser context; response timing and request URLs were captured.

Observed homepage requests included:
- Auth outage health probe: POST /auth/v1/otp.
- Two business settings reads: logo_url and favicon_url.
- call_to_order_settings with select=*.
- get_active_reliable_ads RPC.
- get_public_catalog_products_bounded RPC.
- get_active_promoted_products RPC.
- get_home_showcase_config RPC.
- business-assets logo and favicon storage downloads.
- Multiple product-images Storage downloads for visible product cards.
- news_updates narrow read: id,title,message.
- A second full-row products REST request: /rest/v1/products?select=*&id=in.(8 ids)&status=eq.active. This is an avoidable duplicate/full-column fetch used by the home showcase override.
- Two manifest API requests.

The public homepage visibly rendered 3 featured cards in the captured viewport and several below-fold sections. The homepage source already uses getBoundedPublicCatalogProducts('HOME', {limit:12}) but the bounded RPC returns SETOF public.products, which transmits every product column. A separate selected-products query uses select=* for showcase IDs.

No code was modified during this baseline capture. Next implementation should remove the full-row public card path, reuse the initial catalog data where safe, keep the 3-column mobile design, and defer product-detail chat/realtime separately.
