# Product Visibility Package Design

## Approved direction

Reliable Now will use admin-controlled, paid product-visibility packages. Package names, prices in GHS, durations, target destinations, and active/inactive state are managed from the admin dashboard. Sellers can select only an active package and a product belonging to one of their stores.

## Safe default

Every product is store-only unless it has a verified, unexpired visibility entitlement. Storefront queries continue to show active products for that store. Public Home and Products queries must use a secure visibility predicate backed by the database/RPC, not only client-side filtering.

## Destinations

The supported targets are `STORE_ONLY`, `PRODUCTS`, `HOME`, and `HOME_AND_PRODUCTS`. Store visibility is always retained. A package target grants only the corresponding public destination(s).

## Package and entitlement separation

A package defines the admin-controlled commercial offer. A purchase/entitlement records the seller, store, product, package, Paystack reference, amount/currency snapshot, payment state, activation timestamp, expiry timestamp, and admin revocation metadata. Package prices and duration are snapshotted into the purchase so later admin edits cannot rewrite historical payment terms.

## Payment states and activation

The purchase lifecycle is `PENDING`, `PAID`, `EXPIRED`, `CANCELLED`, `REFUNDED`, or `REVOKED`. The product becomes publicly visible only after the server verifies the Paystack transaction, confirms the reference belongs to the authenticated seller's pending purchase, confirms the expected amount and currency, and performs an idempotent transition from `PENDING` to `PAID`. A repeated confirmation must return the existing paid result without duplicating activation.

The server must never trust a browser-supplied price, seller ID, store ID, product ID, target, or expiry. It must load the active package and ownership from Supabase, create a server-generated unique reference, and initialize Paystack with the database price. The confirmation path must use the authenticated bearer token and Paystack's live verification response.

## Expiry and revocation

Public visibility requires `payment_state = 'PAID'`, `revoked_at IS NULL`, and `expires_at > now()`. A scheduled cleanup is optional; queries should enforce expiry at read time so stale records cannot keep products public. Admin revocation immediately removes public visibility while retaining the audit record.

## Admin controls

The admin dashboard will include a Visibility Packages panel to create, activate/deactivate, edit future offers, and revoke individual paid entitlements. Existing paid entitlements retain their snapshots. The dashboard will show seller, store, product, target, amount, payment reference, state, activated time, expiry time, and revocation reason.

## Financial isolation

Visibility-package revenue is separate from seller order payouts and wallet accumulation. No package payment changes order payout status, seller net payout, Paystack transfer eligibility, or the Golden payout. All payment records are idempotent and auditable.
