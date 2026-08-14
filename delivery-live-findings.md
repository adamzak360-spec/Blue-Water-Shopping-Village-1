# Delivery-fee live findings

Date: 2026-08-14

The live product `e352c220-4474-4487-bf8e-f1517e8cfccf` (Children Wear) is sold by `/store/reliable-marketplace` and exposes delivery options including Tamale Delivery, STC Transport, and VVIP Transport at GH₵1.00 on the product page.

The browser cart contains the product with business_id `aeb8de9f-31ec-4cb2-ab92-ba2b9ce12f33`, currency `GHS`, and size variants. The fresh live `/checkout` page resolves the same seller business and displays `Seller test delivery — Tamale — GH₵1.00 (1-2 days)`, with Delivery Fee GH₵1.00 and Total GH₵5.00 for the current cart subtotal GH₵4.00.

The user-provided screenshot shows GH₵15.00, but that result was not reproduced on the fresh current live checkout. Repository investigation found a likely recurring cause: seller delivery settings are mounted using the first business returned by `getBusinessByOwner`, while a seller can own multiple businesses and checkout uses the cart item's actual `business_id`; this can save GH₵1 on one store while checkout correctly falls back to the global GH₵15 on another. The legacy `CheckoutWithPaystack.tsx` also contains a hard-coded GH₵15 fee but is not routed by `src/App.tsx`, where `/checkout` uses `Checkout.tsx`.

Relevant live URL: https://reliable-now.vercel.app/checkout?delivery-debug=1786748110
Relevant product URL: https://reliable-now.vercel.app/product/e352c220-4474-4487-bf8e-f1517e8cfccf
Relevant Supabase project host observed in page assets: https://iwouhwizzwwykchgflyk.supabase.co

No payment was submitted during this reproduction.
