# Reliable Production End-to-End Regression Report

**Audit date:** 23 August 2026  
**Production domain:** https://reliable-now.vercel.app  
**Test type:** production-safe public smoke, performance, metadata, and browser regression checks.

## Result

The final automated suite passed **17 of 17 HTTP checks**. All tested routes returned successful responses, the sitemap and share-preview serverless endpoints returned the expected content, and the browser-level homepage and product-detail checks passed.

The suite does not submit a payment, create an account, place an order, change inventory, publish content, or modify production data. Checkout and account routes were tested as application-shell responses; payment execution and authenticated dashboards require a real user session and were intentionally not mutated during this production-safe run.

## Test matrix

| Area | Result | Evidence |
|---|---:|---|
| Homepage shell | Pass | HTTP 200; Reliable root rendered in browser. |
| Catalog shell | Pass | HTTP 200. |
| Store directory shell | Pass | HTTP 200. |
| Product-detail shell | Pass | HTTP 200 for product `c3f79325-f143-4104-90ef-3f79d384f69a`. |
| Checkout shell | Pass | HTTP 200; no payment submitted. |
| Login and seller-registration shells | Pass | HTTP 200; no credentials submitted. |
| About, Contact, FAQ, Delivery, Terms, Returns, Privacy | Pass | All returned HTTP 200 application shells. |
| Protected dashboard fallback | Pass | HTTP 200 application shell; no authenticated mutation. |
| Sitemap endpoint | Pass | HTTP 200 XML with `urlset`/sitemap content. |
| Share-preview endpoint | Pass | HTTP 200 with Reliable Open Graph metadata and product image metadata. |
| Wildcard product query | Pass | Browser observed **0** `products?...select=*` requests. |
| Auth probe | Pass | `/auth/v1/settings` observed; old `/auth/v1/otp` probe absent. |
| Product detail rendering | Pass | Title, price, stock, Add to Cart, Call to Order, and delivery options rendered. |
| Product chat deferral | Pass | The only chat-matching resource was the lazy JavaScript chunk `chatUnreadStore`; no messages, conversations, or realtime data request occurred before activation. |

## Performance observations

The HTTP suite’s homepage request completed in approximately **253 ms** during the final run. The browser homepage check measured approximately **291 ms** navigation time and **290 ms** DOMContentLoaded in a separate run, with 22 rendered product cards, 14 transformed image requests, zero wildcard product requests, and the optimized Auth settings probe present.

The performance values are single-run observations and are not a substitute for a statistically controlled lab benchmark. They confirm that the deployed page is responsive and that the main egress safeguards remain active.

## Regression found and resolved

The first HTTP suite version incorrectly required dynamic page headings such as “Login”, “About”, and “Contact” to be present in the raw HTML response. Reliable is a Vite React single-page application, so those route contents are rendered after JavaScript hydration and are not expected in the initial HTML shell. The suite was corrected to validate the application shell over HTTP and reserve dynamic content assertions for browser-level checks. The corrected suite passed all 17 checks.

## Production notes

The browser-level product test confirmed the product title “Cross sandals”, price `GH₵0.10`, stock `14 in stock`, current Call to Order number `+233 59 560 9966`, size buttons, delivery options, and Add to Cart control. Clicking the Chat with Seller control correctly displayed the account-required chat modal without attempting an unauthenticated conversation request.

No regression requiring an application-code fix was found in the tested public flows. The repository build and whitespace checks also pass. The corrected automated suite is stored at `scripts/production-smoke.mjs` and the final raw run is stored in `production-e2e-smoke-final.json`.

## References

[1]: ./scripts/production-smoke.mjs "Reliable production smoke suite"
[2]: ./production-e2e-smoke-final.json "Raw final production smoke results"
[3]: ./homepage-performance-audit-20260823.md "Homepage performance audit"
[4]: https://reliable-now.vercel.app/ "Reliable production homepage"
