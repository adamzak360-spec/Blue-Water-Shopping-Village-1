# Reliable Premium Marketplace — International Payment Architecture

## Objective

Add international checkout and seller settlement without changing the existing commission formula or breaking Paystack. The platform must remain the merchant-facing orchestration layer, retain its configured commission, and record the seller’s net entitlement independently of the payment provider.

> The gateway is an execution adapter. The commission ledger and payout state machine are the financial source of truth.

## Provider options

| Approach | Tradeoffs | Cost | Setup complexity |
|---|---|---|---|
| Keep Paystack only and expand countries one by one | Lowest code risk, but limited coverage and country-specific availability; does not solve global reach | Existing provider fees | Low |
| Add Flutterwave first for African expansion | Direct split-payment model, regional mobile-money and bank rails, but requires subaccount onboarding and marketplace chargeback responsibility | Provider transaction and settlement fees | Medium |
| Add Stripe Connect first for global expansion | Strong marketplace primitives, destination charges, connected-account onboarding, and broad customer currency support; seller-country and cross-border settlement rules require careful validation | Stripe processing, Connect, conversion, and payout fees vary by country | Medium–High |
| Add PayPal as a payout or optional buyer rail | Broad recipient reach and payout currencies, but PayPal Payouts is primarily a disbursement product; marketplace split eligibility requires a separate product review | Provider fees vary by region and payout type | Medium |

The recommended rollout is **Flutterwave first for African checkout and split settlement**, followed by **Stripe Connect for global seller countries**. Paystack remains the Ghana adapter during the migration. PayPal is deferred until its marketplace product eligibility and country-specific commercial terms are confirmed.

## Canonical payment contract

Every checkout provider must map into the following internal contract:

```ts
export type PaymentProvider = 'paystack' | 'flutterwave' | 'stripe' | 'paypal'

export interface PaymentInitializeRequest {
  orderId?: string
  email: string
  amountMinor: number
  currency: string
  countryCode: string
  provider: PaymentProvider
  reference: string
  callbackUrl: string
  metadata: Record<string, unknown>
}

export interface PaymentInitializeResult {
  provider: PaymentProvider
  providerReference: string
  redirectUrl?: string
  clientSecret?: string
  status: 'requires_action' | 'pending'
}

export interface PaymentVerificationResult {
  provider: PaymentProvider
  providerReference: string
  transactionId?: string
  status: 'success' | 'pending' | 'failed' | 'refunded' | 'reversed'
  amountMinor: number
  currency: string
  paidAt?: string
  raw: Record<string, unknown>
}
```

The browser never chooses the amount, commission, seller share, or provider credentials. The server resolves the country, currency, provider capability, current order total, and applicable commission configuration. The browser receives only the provider redirect/client response needed to complete the payment.

## Canonical seller-settlement contract

Commission calculation remains the existing basis-point formula:

```text
gross_amount_minor = order total converted to the order currency’s minor unit
commission_amount_minor = round(gross_amount_minor × commission_bps ÷ 10,000)
seller_payout_amount_minor = gross_amount_minor − commission_amount_minor
```

The settlement adapter receives an eligible payout record and performs the provider-specific transfer. It must return a normalized lifecycle event:

```ts
export type PayoutEventName = 'transfer.success' | 'transfer.failed' | 'transfer.reversed'

export interface PayoutTransferRequest {
  payoutId: string
  sellerId: string
  recipientReference: string
  amountMinor: number
  currency: string
  reference: string
  reason: string
}

export interface PayoutTransferResult {
  provider: PaymentProvider
  reference: string
  providerTransferId?: string
  status: 'processing' | 'success' | 'failed'
  raw: Record<string, unknown>
}
```

The platform commission is retained in the platform/provider balance or split contract. Sellers receive only `seller_payout_amount_minor`. Refunds, chargebacks, delivery holds, and reversals must update the payout ledger before any transfer is marked paid.

## Database direction

The existing tables use Paystack-specific names. The migration should be additive and backward compatible:

1. Add `payment_provider`, `provider_reference`, `provider_transaction_id`, and `payment_metadata` to `orders` while retaining `paystack_reference` for existing records.
2. Add a `payment_transactions` table with one row per provider attempt, unique on `(provider, provider_reference)`, and idempotent status transitions.
3. Add `payment_provider` and generic `transfer_reference`/`provider_transfer_id` fields to `seller_payouts`; retain the Paystack columns during a compatibility period.
4. Add `payment_provider`, `provider_account_reference`, and onboarding status fields to `seller_payout_profiles` so Flutterwave subaccounts and Stripe connected accounts can coexist.
5. Replace the single `countries.payment_provider` value with a capability table keyed by country, currency, provider, and operation (`checkout`, `split_payment`, `payout`), while retaining the old column until the migration is complete.
6. Keep all webhook event keys globally idempotent and include the provider in the event identity.

## Server routing

The server should expose one payment endpoint with provider dispatch:

```text
POST /api/payments?action=initialize
POST /api/payments?action=verify
POST /api/payments?action=webhook&provider=paystack|flutterwave|stripe|paypal
POST /api/payments?action=refund
```

The current `/api/paystack` endpoint remains active and unchanged for promotion and POS subscription flows until those specialized flows are migrated. Marketplace checkout can be migrated behind a feature flag, initially enabled only for selected sandbox countries.

The provider adapter interface should contain `initialize`, `verify`, `handleWebhook`, `createSellerAccount` or `createSubaccount`, `createPayout`, and `normalizeError`. Each adapter owns authentication, signatures, provider field names, and raw payload handling; shared code owns authorization, idempotency, order amount validation, transaction recording, commission calculation, and normalized status updates.

## Rollout gates

No live provider should be enabled until the following are verified in sandbox or provider test mode:

| Gate | Required result |
|---|---|
| Initialization | Server ignores browser-supplied amount and seller split values and uses server-side order data |
| Verification | Provider reference, amount, currency, and success status are all checked |
| Idempotency | Repeated redirects and webhook deliveries create one payment and one order effect |
| Commission | Platform commission and seller net match the configured `commission_bps` exactly in minor units |
| Settlement | Seller transfer uses the net amount, not gross amount, and records provider-specific identifiers |
| Failure handling | Failed, reversed, refunded, and chargeback states prevent or reverse payout appropriately |
| Security | Webhook signature verification and server-only secrets are enforced |
| Compatibility | Existing Paystack promotion, POS subscription, and Ghana checkout tests remain green |

## Required credentials for sandbox implementation

The next implementation step requires a **Flutterwave test secret key** and, for real seller split testing, a Flutterwave test subaccount or the ability to create one from the dashboard. The secret must be added to Vercel server-only environment variables; it must not be placed in frontend code, Git, or chat logs. Existing Paystack keys should not be rotated or removed.

## Sources

[1] [Stripe — Create destination charges](https://docs.stripe.com/connect/destination-charges)

[2] [Stripe — Global availability](https://stripe.com/global)

[3] [Flutterwave — Split Payments](https://developer.flutterwave.com/v3.0/docs/split-payments)

[4] [PayPal — Send money to multiple recipients with Payouts](https://developer.paypal.com/payouts/overview/)
