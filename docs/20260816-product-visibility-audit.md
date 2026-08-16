# Reliable Now Product Visibility Audit

## Current publication behavior

`src/services/productService.ts` currently exposes `getAllProducts()` as an unrestricted `products` table query ordered by `created_at DESC`. `getActiveProducts()` only filters `status = 'active'`; it does not filter by seller-store-only or marketplace/home visibility. `getProductById()` reads any product by ID.

`src/pages/Products.tsx` loads `getAllProducts()` and separately loads active promoted product IDs. This means the Products page currently receives all products and applies no database-backed marketplace visibility boundary in the service query.

`src/pages/ProductDetails.tsx` loads related products from `getAllProducts()` and filters only by category, ID inequality, and `status === 'active'`. The product detail page also loads the seller business and displays the product’s seller store link.

`src/pages/Home.tsx` and other public catalog consumers must be inspected further, but the shared unrestricted catalog service indicates the likely current behavior: active seller products can surface globally unless a page-specific filter removes them.

## Existing promotion infrastructure

`src/components/SellerPromotions.tsx` already reads active `promotion_plans` and seller products, and calls promotion-related services. The existing infrastructure should be evaluated for reuse, but it must not be assumed to enforce the new requested store/home/products visibility packages until its schema and payment verification paths are audited.

## Seller/admin product management

Product creation and updates are handled through `src/pages/Admin.tsx` and `src/components/InventoryManagement.tsx`, using `createProduct`, `updateProduct`, and `deleteProduct` from `productService.ts`. Product writes currently accept the complete `Product` object and there is no confirmed visibility-package field in the current TypeScript model or product service.

## Security implication

The safe default for the new feature should be store-only. Public marketplace queries should be changed to use a secure database-backed visibility predicate or RPC based on verified, active package entitlements. Client-side filtering alone is insufficient because unrestricted `getAllProducts()` would continue exposing products to any caller.

## Financial implication

Visibility packages are a paid entitlement. Payment must be verified server-side through the existing Paystack integration, with idempotent references, explicit pending/success/failed states, duration/expiry, and no publication until verification succeeds. No payout logic should be coupled to package activation.
