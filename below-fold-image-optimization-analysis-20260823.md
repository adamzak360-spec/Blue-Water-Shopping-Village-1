# Below-Fold Image Request Analysis

**Audit basis:** the production homepage performance capture from 23 August 2026.  
**Relevant evidence:** 17 transformed product-image requests, 37 total Storage resources, approximately 586 ms document navigation, and a slowest individual transformed image of approximately 2.44 seconds.

## Finding

The 17 transformed image requests are not a failure of the image transformation strategy. They confirm that the browser is receiving resized 240px card assets rather than original full-resolution objects, which is the correct payload shape for the three-column mobile layout. The remaining issue is **when the image elements are inserted into the document**.

The homepage renders multiple product rails and grids at once: Featured Products, Latest Products, Sponsored Products when available, Trending Now, Flash Deals, Marketplace Favorites, and New Arrivals. `ProductCard` already uses `loading="lazy"` and responsive `srcset`, but native lazy loading permits the browser to fetch images that are several viewport-heights away. Because all rails are mounted in the initial React tree, the browser can begin downloading a large portion of the homepage’s below-fold cards before the visitor scrolls to them.

The measured request set therefore represents a **tail-latency and egress problem**, not primarily a first-document rendering problem. Aggregate resource duration was approximately 23.59 seconds across overlapping requests and must not be interpreted as 23.59 seconds of page blocking. However, every request still consumes Supabase Storage bandwidth, connection work, image transformation work, and cache space. On a mobile connection, those parallel requests compete with the first useful images and can delay completion of the visual page even when the document lifecycle itself finishes in under 600 ms.

## Impact assessment

| Observation | Measured value | Practical impact |
|---|---:|---|
| Transformed product images | 17 | Multiple cards are loading actual image assets during one homepage visit. |
| Image transformation width | 240px for card requests | Good fit for small cards; substantially safer than original assets. |
| Total Storage resources | 37 | Image traffic is a large portion of the Supabase resource profile. |
| Slowest transformed image | ~2.44 s | Slow cross-origin image responses extend the visual tail and compete with other assets. |
| Document navigation | ~585.6 ms | The HTML/React shell is already fast; further gains should target post-load asset work. |
| Wildcard product requests | 0 | Database payload optimization is complete for the audited homepage path. |
| Browser-reported cross-origin bytes | unavailable | Exact byte savings cannot be calculated from this browser context. |

## Recommended strategy

### 1. Keep above-the-fold cards eager and small

The first Featured Products row should remain immediately renderable. Preserve the existing three-column mobile layout and request only the first viewport’s worth of cards eagerly. The first visible card image may use the current responsive transformation, with a `srcset` of 240w, 360w, and 540w and `sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 220px"`. Do not replace these with original URLs.

For the first visible image that is the likely Largest Contentful Paint candidate, use `fetchpriority="high"` only if measurement confirms it is the LCP image. Other above-fold images should remain normal priority. This prevents the optimization from accidentally making the first shopping content slower.

### 2. Mount below-fold product rails only near the viewport

Native `loading="lazy"` should remain as a safety net, but it should not be the only gate. Add a reusable `LazyProductSection` wrapper using `IntersectionObserver` with a root margin of approximately `800px 0px`. Before a section enters that threshold, render its existing skeleton or a fixed-height placeholder; do not mount its `ProductCard` children. Once near the viewport, mount the cards and allow their existing lazy image behavior to operate.

This is the highest-value change because unmounted cards cannot create image requests. It also preserves the current visual layout if each placeholder reserves the same approximate height as the section. The 800px margin gives the browser enough time to fetch the next rail during normal scrolling without loading every rail at initial page load.

### 3. Use staged loading inside each horizontal rail

For each mounted rail, render the first four to six cards immediately and append additional cards only when the user scrolls the rail or when the rail becomes active. The current homepage already caps many sections to six or eight products in JavaScript; the next step is to cap **initially mounted cards** separately from the total available product array. This avoids requesting images for cards that are present in a long horizontal track but are not yet visible.

### 4. Add a low-priority policy for non-critical images

For cards that are below the first viewport, add `fetchPriority="low"` and keep `decoding="async"`. Continue using `resize=contain`, the existing quality around 78, and long cache control for immutable Storage objects. Do not reduce the first visible cards below their current quality without a visual comparison; the current problem is timing and request count more than image dimensions.

### 5. Reserve layout space and preserve accessibility

Each deferred section must retain a stable minimum height or use `contain-intrinsic-size` with `content-visibility:auto` so that inserting product cards does not cause large cumulative layout shifts. Skeleton sections should retain their headings and accessible labels where possible. The product links and card buttons should become available as soon as the section enters the observer threshold; deferral must never prevent keyboard users from reaching products through normal navigation.

### 6. Defer non-image work associated with rails

The section observer should gate only the visual product rail, not essential homepage metadata, SEO links, or the main navigation. Promotion impression tracking should begin when a sponsored card is actually mounted or becomes visible, rather than when an off-screen sponsored rail is rendered. This reduces unnecessary promotion events alongside image requests.

## Expected outcome

The strategy should reduce the number of image requests made before first interaction from the current broad homepage set to approximately the number of above-fold cards plus a small scroll-ahead buffer. A conservative target is **four to six initial image requests on mobile**, with subsequent images loaded in batches as the visitor approaches or uses each section. The exact byte reduction requires repeated cold-cache and warm-cache measurements because the current browser context reports zero cross-origin transfer sizes for most Supabase resources.

The optimization should be evaluated using five cold-cache and five warm-cache runs under a fixed mobile profile. Record Largest Contentful Paint, first contentful paint, navigation duration, the timestamp of the first image request, the number of image requests before first scroll, total Supabase Storage request count, and the number of images loaded after a scripted scroll to each rail. The key acceptance criteria are: the first visible product row is not slower, the three-column layout is unchanged, no layout shift is introduced, and below-fold image requests do not occur before their rail is within the observer margin.

## Priority order

| Priority | Change | Why |
|---|---|---|
| P0 | IntersectionObserver-gated section mounting | Prevents below-fold image requests at the source. |
| P1 | Staged card mounting inside horizontal rails | Limits off-screen cards in a mounted rail. |
| P1 | Fixed-height placeholders and `content-visibility` safeguards | Prevents layout shift while deferring work. |
| P2 | Low fetch priority for non-critical card images | Helps the first viewport win network contention. |
| P2 | Visibility-based promotion impression tracking | Reduces non-image background work. |
| P3 | Repeatable mobile lab measurement | Establishes defensible before/after percentages. |

## References

[1]: ./homepage-performance-audit-20260823.md "Reliable Homepage Performance Audit"
[2]: ./homepage-performance-postfix-20260823.json "Raw post-fix homepage performance metrics"
[3]: https://reliable-now.vercel.app/ "Reliable Premium Marketplace production homepage"
