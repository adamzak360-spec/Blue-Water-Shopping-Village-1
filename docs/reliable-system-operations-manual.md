# Reliable System Operations Manual

**Reliable Premium Marketplace**  
**Audience:** Company leadership, administrators, sellers, support staff, and conference audiences  
**Last updated:** August 2026  
**Document owner:** Reliable Operations

> Reliable is a Ghana-focused digital marketplace that connects customers with independent sellers through discoverable stores, product browsing, secure checkout, delivery coordination, seller payouts, customer support, and accountable administration.

## 1. Company and platform overview

Reliable is designed as a trusted marketplace rather than a single-store catalogue. The platform gives each seller a storefront while providing customers with a consistent way to discover products, compare offers, place orders, communicate around products, and receive delivery support. The public experience includes the Home page, Products catalogue, Stores directory, product details, cart, checkout, order history, account settings, support content, and marketplace policies.

The operating model has three connected layers. The **customer layer** discovers products, shops, communicates, pays, and confirms delivery. The **seller layer** manages a store, publishes products, processes orders, maintains payout details, and communicates with interested customers. The **admin layer** governs the marketplace, manages registered sellers and stores, controls publication and visibility, reviews payouts, maintains policies and branding, and protects the integrity of payments and user access.

| Platform area | Primary purpose | Main users |
|---|---|---|
| Home | Brand introduction, discovery, campaigns, and selected product exposure | Everyone |
| Products | Searchable product catalogue and purchase entry point | Customers and visitors |
| Stores | Discovery of independent seller storefronts | Customers and visitors |
| Storefront | Seller-owned catalogue and store information | Sellers and customers |
| Product details | Product information, cart action, seller context, and public product chat | Everyone |
| Customer account | Orders, settings, saved items, and support access | Customers |
| Seller workspace | Products, orders, store settings, promotion, visibility, and payouts | Sellers |
| Admin dashboard | Governance, operations, finance controls, security, branding, and reporting | Administrators |

## 2. Customer operating journey

A customer can begin from Home, Products, Stores, a direct product link, or a shared product conversation. Search is designed to support discovery across active store inventory. A normal catalogue view follows the marketplace publication policy, while an explicit product search can discover an active product held by any participating store. Store search helps customers move from a product or category idea to the seller’s complete storefront.

The standard customer flow is:

1. Discover a product or store.
2. Open the product details page and review price, stock, images, variants, delivery information, return information, and seller context.
3. Add the product to the cart and review quantities, delivery options, and totals.
4. Complete checkout using the available payment flow.
5. Track order status from the customer account.
6. Communicate through the product group chat when clarification is useful.
7. Confirm delivery when the order is received and accurate.
8. Use support, returns, or refund processes when the order requires intervention.

Customers should not share payment secrets, seller credentials, or one-time authentication codes in product chat. Support requests involving payment or account access should be escalated through the official support channel.

## 3. Seller operating journey

A seller registers, completes the required business and payout information, creates a store profile, adds products, and manages fulfilment. Product records include commercial information such as name, description, price, currency, category, stock, images, variants, delivery fees, processing time, service area, pickup instructions, delivery instructions, return policy, and customer-facing notes.

A seller’s store remains the permanent home for its active products. The seller store is not removed when a public visibility package expires. Public Home and Products exposure is a separate entitlement controlled by the marketplace publication mode and the verified visibility package system.

| Seller responsibility | Required operating standard |
|---|---|
| Product accuracy | Use truthful names, descriptions, prices, images, stock, and specifications. |
| Fulfilment | Process orders within the stated time and keep stock status accurate. |
| Communication | Respond professionally and avoid requesting sensitive credentials in chat. |
| Delivery | Follow the stated service area, fees, pickup rules, and delivery instructions. |
| Returns | Honour the published return policy and escalate disputes promptly. |
| Payouts | Maintain accurate Paystack recipient details and understand settlement timing. |
| Account security | Protect the account, use trusted devices, and respond to new-device alerts. |

## 4. Stores and product visibility

Every seller has a store-level catalogue. The administrator controls how products are exposed beyond the seller’s store. The safe paid-publication mode keeps products store-only unless an active, verified, unexpired entitlement grants access to the Home page, Products page, or both.

The administrator can also enable **Free Public Catalog Mode**. When enabled, active products can appear on Home and Products without sellers purchasing visibility packages. This is a marketplace-wide operating switch and is controlled only from the admin dashboard. When disabled, the verified package rules apply again.

| Mode | Storefront | Products page | Home page | Seller payment required |
|---|---:|---:|---:|---:|
| Free Public Catalog Mode enabled | Yes | Yes for active products | Yes for active products | No |
| Paid visibility mode | Yes | Only with verified Products or Home + Products entitlement | Only with verified Home or Home + Products entitlement | Yes for public exposure |
| Expired or revoked entitlement | Yes | No, unless free mode is enabled | No, unless free mode is enabled | Not applicable |

Visibility packages are admin-configured offers. Each package has a name, code, description, GHS price, duration, target destination, and active/inactive state. The current supported destinations are **Home**, **Products**, and **Home + Products**. Package activation makes an offer available; it does not publish a seller product by itself.

## 5. Visibility-package payment operations

A seller selects an eligible product and an active package. The server loads the package and verifies product ownership before initializing Paystack. The amount, currency, seller, store, product, target, and expiry are never trusted from the browser. A server-generated unique reference links the pending purchase to the authenticated seller.

A product becomes public only after the server verifies the Paystack transaction, confirms the expected amount and currency, confirms that the payment reference belongs to the seller’s pending purchase, and performs an idempotent transition to the paid state. Repeated confirmation must return the existing result rather than creating duplicate entitlements.

| Entitlement state | Meaning |
|---|---|
| PENDING | Payment initialized but not verified as successful. |
| PAID | Payment verified and public visibility active until expiry or revocation. |
| EXPIRED | The paid period has ended. |
| CANCELLED | The pending purchase was cancelled before activation. |
| REFUNDED | The payment was refunded and public visibility must not remain active. |
| REVOKED | An administrator removed visibility while preserving the audit record. |

Visibility-package revenue is financially separate from order payouts and the seller wallet. It must not change a seller’s order net amount, Paystack transfer eligibility, queued payout, or payout threshold calculation.

## 6. Orders, settlement, and seller payouts

Order payouts follow the existing secure Paystack process. Customer payment, marketplace commission, Paystack charges, seller net proceeds, settlement timing, and transfer eligibility are distinct events. A customer payment does not guarantee that the same funds are immediately available for a transfer; Paystack settlement and available balance rules still apply.

The payout worker is idempotent. It must never create duplicate transfers, mark an unpaid transfer as paid, or bypass the recipient and authorization checks. When the seller’s eligible wallet balance is below the configured transfer threshold, the amount remains accumulated in the seller wallet and the payout remains safely queued rather than being sent prematurely.

Golden’s previously reviewed GHS 1.90 payout is an example of this protection: it remains queued because it is below the configured wallet requirement, and no transfer should be initiated without a verified balance, fee, recipient, authorization, and explicit operational approval.

| Control | Operational rule |
|---|---|
| Recipient | Confirm the legitimate active Paystack recipient before transfer. |
| Amount | Use the immutable verified seller net amount. |
| Fees | Use the applicable Ghana transfer fee for the payout method; never guess. |
| Balance | Check live available Paystack balance, not dashboard revenue alone. |
| Threshold | Accumulate below-threshold seller earnings in the wallet ledger. |
| Idempotency | One payout record and one transfer attempt per approved operation. |
| Audit | Preserve status, reference, timestamps, operator, and failure reason. |

## 7. Product group chat and receipts

Each product can have a public WhatsApp-style group conversation for customers, visitors, and the seller. The interface uses chronological messages, compact participant headers, green message bubbles, external timestamps, and delivery/read indicators.

The receipt lifecycle is **sending**, **sent**, **delivered**, **read**, and **offline/retry**. Realtime message and receipt subscriptions allow participants to see new messages without refreshing. Opening a product chat clears that user’s unread count for the product. The product-detail Chat button can show a WhatsApp-style unread badge when new messages have not yet been viewed.

Chat is for product-related communication, not for collecting passwords, authentication codes, card details, Paystack secrets, or other confidential information. Abuse, fraud attempts, or suspicious payment instructions should be reported to administration.

## 8. Account security and new-device alerts

Reliable uses authenticated account access and new-device sign-in alerts to help users detect unexpected account activity. A new-device alert should identify the account event, advise the user to review the account, and direct suspicious activity to support. Administrators must not request passwords or one-time codes through chat or informal messages.

Administrative access is role-gated. High-risk operations such as payout authorization and administrative configuration require the appropriate role and server-side validation. Production database changes must be additive, reviewed, confirmed, and followed by read-only verification.

## 9. Administration handbook

The admin dashboard is the operating control centre. Administrators should use it to review marketplace health, manage products and stores, inspect registered sellers, review orders and payouts, configure visibility packages, enable or disable free public catalog mode, manage marketplace branding, and review operational reports.

| Admin area | Core action |
|---|---|
| Dashboard | Review activity, alerts, account readiness, and operational summary. |
| Products | Review, edit, activate, or deactivate catalogue records. |
| Orders | Monitor fulfilment, status, delivery confirmation, and exceptions. |
| Registered Sellers | Review participating businesses and store information. |
| Seller Payouts | Review queued, eligible, failed, and completed payout records. |
| Product Visibility | Configure packages, free catalog mode, and paid entitlements. |
| Marketplace Settings | Maintain global branding, logo, favicon, and marketplace settings. |
| Store Settings | Maintain seller-specific profile, delivery, and social settings. |
| Reports and Analytics | Review financial, inventory, sales, and operational performance. |
| Security and policies | Maintain safe operating rules, notices, and escalation paths. |

For any financial action, administrators should first inspect the record, confirm the seller and store, verify the amount and recipient, inspect the relevant Paystack state, and confirm that no duplicate or conflicting operation exists. Never use a browser-visible value as the sole source of truth for a transfer.

## 10. Day-to-day operating checklist

At the start of an operating day, review the dashboard, order exceptions, seller onboarding issues, payout queue, security alerts, and public catalogue state. During the day, monitor new orders, seller communication, product moderation, and delivery exceptions. At close of day, review unresolved orders, failed payments, queued payouts, package entitlements nearing expiry, and support escalations.

| Frequency | Review |
|---|---|
| Every operating day | Orders, failed payments, support, new-device alerts, and seller issues. |
| Before a payout | Recipient, amount, fee, live balance, threshold, authorization, and idempotency. |
| Weekly | Registered sellers, inactive products, expired entitlements, catalog quality, and reports. |
| Monthly | Marketplace policies, package pricing, payout performance, security posture, and branding. |
| Before a conference | Product flow, store flow, admin controls, screenshots, slide logo, and presenter notes. |

## 11. Conference and meeting presentation use

The presentation is intended to explain Reliable to partners, sellers, investors, conference audiences, and internal teams. It should show the company mission, marketplace architecture, customer and seller journeys, trust controls, product discovery, store model, chat, delivery, payout discipline, and growth controls without exposing secrets or personal data.

Before downloading a presentation, an administrator can upload a logo in the presentation workspace. The logo is placed into the designated branded areas so the exported presentation remains consistent. Use a transparent PNG or SVG with adequate padding for the cleanest result.

## 12. Incident and escalation principles

When a product, order, payment, payout, account, or database issue is reported, preserve the original record and capture the exact user-visible error. Do not create a duplicate record to work around a failure. Classify the incident, restrict any high-risk action, verify the relevant source of truth, and record the resolution.

A payout discrepancy should be treated as a financial investigation, not a UI problem. A sign-in or new-device concern should be treated as a security issue. A product visibility problem should be checked against store status, product status, free catalog mode, entitlement state, and expiry. A chat issue should be checked against the conversation room, Realtime subscription, receipt row, and offline retry state.

## 13. Safe information handling

This manual intentionally excludes passwords, service-role keys, Paystack secret keys, personal access tokens, private customer details, and raw authentication material. Such information belongs only in approved secret-management or authenticated operational systems. Conference slides should use sanitized screenshots and representative examples rather than live confidential records.

## References

[1]: ../docs/20260816-product-visibility-package-design.md "Reliable product visibility package design"
[2]: ../docs/20260816-vercel-chat-timeout-investigation.md "Reliable Vercel chat timeout investigation"
[3]: ../docs/seller-wallet-accumulation-implementation.md "Seller wallet accumulation implementation"
[4]: ../migrations/20260816_chat_message_receipts.sql "Chat message receipts migration"
[5]: ../migrations/20260816_product_visibility_packages.sql "Product visibility package migration"
[6]: ../migrations/20260816_free_public_catalog_mode.sql "Free public catalog mode migration"
[7]: ../src/pages/Admin.tsx "Reliable admin dashboard source"
[8]: https://reliable-now.vercel.app/ "Reliable Premium Marketplace"
[9]: https://reliable-now.vercel.app/products "Reliable Products page"
[10]: https://reliable-now.vercel.app/stores "Reliable Stores directory"

*Prepared for internal operations, onboarding, and conference communication. Review before external distribution.*

## Appendix A: Presenter safety checklist

Before presenting, confirm that screenshots contain no customer names, private contact details, payment references, authentication prompts, service-role keys, or seller payout secrets. Use the administrator logo uploader to brand the deck, export a PDF or presentation file, and keep the live dashboard closed during public presentations unless a sanitized demo account is being used.

## Appendix B: Glossary

| Term | Meaning |
|---|---|
| Active product | A product record available for its permitted publication context and stock state. |
| Entitlement | A verified, time-bounded permission for a product to appear on a public destination. |
| Free catalog mode | An admin-controlled setting that allows active products to appear publicly without a visibility payment. |
| Store-only | The default product publication boundary in paid visibility mode. |
| Wallet accumulation | Holding eligible seller earnings until the transfer threshold and other payout controls are satisfied. |
| Realtime receipt | A delivery/read state for a product-chat message. |
| Idempotent operation | An operation that can safely be repeated without creating a duplicate financial or publication result. |

## Appendix C: Presenter narrative

Reliable brings independent sellers and customers into one accountable marketplace. Customers discover through Home, Products, and Stores. Sellers keep ownership of their storefronts and products. Administrators control quality, visibility, security, and financial discipline. The platform does not confuse product discovery with payment settlement: public publication, order fulfilment, and seller payout are separate controlled operations. This separation is the foundation for trust as Reliable grows.
