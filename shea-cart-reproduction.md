# Shea Butter Cart Reproduction

Source: https://reliable-now.vercel.app/product/390408c1-869a-47ce-b73c-a09a64bd4af2

Live page shows Shea butter, product ID `390408c1-869a-47ce-b73c-a09a64bd4af2`, status Active, stock `1`, quantity input `1`, and enabled Add to Cart button. The product has no size-selection UI on the page. Browser click on the product-detail Add to Cart did not visibly open the cart (expected after the prior cart-flow change), and the header cart state did not visibly show a count after the click, suggesting the item was not inserted into shared cart state.

Relevant source findings:
- `src/pages/ProductDetails.tsx`: `handleAddToCart` calls `addToCart` with the loaded product and quantity; it only blocks when `product.has_sizes && selectedSizes.length === 0`. The button is disabled using `isOutOfStock`.
- `isOutOfStock` currently equals `product.stock_quantity === 0 || product.status === 'inactive'`; the live Shea product reports stock 1 and Active.
- `currentStock` uses the base product stock unless sizes are selected.
- `src/context/CartContext.tsx`: `addToCart` updates React state and localStorage, but no longer opens the drawer after the prior requested cart-flow change.
- Possible failure area: numeric/stock normalization, stale live bundle, or cart state persistence/count update after clicking; also need robust quantity cap at available stock and avoid hidden size validation when `has_sizes` is true but no variants are loaded.
