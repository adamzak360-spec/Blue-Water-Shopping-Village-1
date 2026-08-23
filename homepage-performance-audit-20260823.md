# Reliable Homepage Performance Audit

**Audit date:** 23 August 2026  
**Production URL:** https://reliable-now.vercel.app/?performance-audit=20260823-final  
**Compared change:** removal of the homepage free-showcase `products?select=*` request.

## Executive conclusion

The production homepage is serving the optimized build. The legacy wildcard product request is no longer present: the post-fix browser audit recorded **zero** `/rest/v1/products?...select=*` requests. The homepage’s main catalog path uses `get_public_catalog_cards_bounded`, the authentication health probe uses a lightweight `/auth/v1/settings` request, and product thumbnails use transformed 240px images.

A precise before-versus-after user-perceived load-time improvement cannot be calculated from the stored baseline because the baseline captured request URLs and response timing but did not preserve a navigation timing record. The current production navigation completed in approximately **586 ms** in this browser session, with the HTML response available at approximately **370 ms** and DOMContentLoaded at approximately **585 ms**. These are valid post-fix measurements, but they should not be presented as a directly measured percentage improvement over the baseline.

## Comparable measurements

| Metric | Pre-fix baseline | Post-fix production | Interpretation |
|---|---:|---:|---|
| Homepage resource inventory | 25 visible/lower-bound entries | 73 total entries | The baseline console output was truncated and is not directly comparable to the complete post-fix inventory. |
| Supabase resources | At least 20 visible entries | 47 | The current page includes more below-fold content and complete resource enumeration. |
| Direct `/rest/v1/products` wildcard request | 1 observed request | **0** | Confirmed eliminated. |
| Main public catalog request | `get_public_catalog_products_bounded` | `get_public_catalog_cards_bounded` | The new path returns a narrow card projection rather than full product rows. |
| Auth outage probe | `POST /auth/v1/otp` | `/auth/v1/settings` | Dummy OTP traffic is eliminated. |
| Transformed product images | Not present in the baseline inventory | 17 transformed image requests | Cards request 240px images; detail pages use larger images only when needed. |
| Navigation duration | Not captured | **585.6 ms** | Post-fix browser measurement. |
| HTML response time | Not captured | **370.1 ms** | Post-fix browser measurement. |
| DOMContentLoaded | Not captured | **585.3 ms** | Post-fix browser measurement. |

## Current production request profile

The browser recorded **73 total resources**, including **47 Supabase resources**, **9 REST/API resources**, **37 Storage resources**, and **17 transformed product-image requests**. The primary catalog path was the narrow `get_public_catalog_cards_bounded` RPC. The browser recorded no direct products REST request, including no wildcard `select=*` request.

The request timing data shows that the navigation itself completed quickly, while asynchronous Supabase and image requests continued in the background. The aggregate duration of Supabase resource entries was approximately **21.26 seconds**, and aggregate duration across all resource entries was approximately **23.59 seconds**. These aggregate values are not page-load times: requests overlap in parallel, and several lazy-loaded image requests continue after the document load event.

The slowest individual Supabase resources in this session were a transformed image at approximately **2.44 seconds**, the Auth settings request at approximately **2.35 seconds**, and several additional transformed images between approximately **0.98 and 1.14 seconds**. The page therefore has a fast initial document lifecycle but a slower tail for cross-origin image and health-check requests.

## Payload limitations and measurement quality

The browser reported `transferSize=0` and `decodedBodySize=0` for most cross-origin Supabase responses in this session. This can occur when the browser context does not expose cross-origin response sizes or when responses are served from cache. Consequently, this audit uses request counts, URL shape, response timing, and the available navigation transfer size rather than claiming an exact byte or percentage reduction.

The post-fix navigation reported a document transfer size of **3,298 bytes** and decoded body size of **2,998 bytes**. Those values describe the initial document response and do not include the full asynchronous Supabase and Storage payloads.

## Mobile implications

The card image strategy is appropriate for the existing three-column mobile layout: visible cards request a 240px transformed image rather than downloading the original full-resolution asset. Lazy image loading remains enabled on cards, and the initial catalog is bounded. The main remaining mobile cost is the number of below-fold image resources that eventually load as the browser evaluates the full homepage sections.

## Remaining bottlenecks

The main wildcard product query has been removed. The next performance opportunities are to reduce the number of homepage sections rendered and to ensure below-fold sections do not eagerly initiate image requests before they approach the viewport. The Auth settings request is lightweight in payload but was one of the slowest individual cross-origin requests in this session; it should remain bounded and should not be polled repeatedly.

For future percentage-based performance reporting, the recommended method is to capture at least five cold-cache and five warm-cache runs under a fixed mobile network profile, recording navigation timing, Largest Contentful Paint, total transferred bytes, Supabase request count, and the number of images loaded before first interaction. The current browser audit establishes the post-fix production baseline needed for that repeatable comparison.

## References

[1]: ./egress-baseline-20260823.md "Reliable egress optimization baseline — 2026-08-23"
[2]: ./homepage-performance-postfix-20260823.json "Raw post-fix homepage performance metrics"
[3]: https://reliable-now.vercel.app/ "Reliable Premium Marketplace production homepage"
