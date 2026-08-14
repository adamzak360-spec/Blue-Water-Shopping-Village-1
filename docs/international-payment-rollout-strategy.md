# Reliable Premium Marketplace — Revised International Payment Rollout

## Executive conclusion

Flutterwave is not currently available for Reliable’s onboarding profile because its response states that it is onboarding only enterprise businesses processing above **$5 million annually**. We should not inflate the declared volume or change the business description to bypass that requirement.

The safest immediate expansion is to use the existing Paystack merchant account for **international buyers**. Paystack’s official documentation states that Ghana-based businesses can receive payments from customers anywhere in the world using Mastercard, Visa, or Verve cards, subject to business activation and compliance approval. Ghana transactions are charged and settled in GHS. [1]

This solves international customer checkout, but it does not mean that international sellers can automatically receive local payouts. Seller settlement remains tied to the platform’s verified payout rails and the seller’s eligible payout profile.

## Capability distinction

| Capability | Immediate status | Correct interpretation |
|---|---|---|
| International customers paying Reliable sellers | Potentially available through Paystack international cards | Request and enable international payments in Paystack Dashboard after compliance approval. |
| Platform commission retention | Already implemented | Keep the existing `commission_bps` calculation and ledger unchanged. |
| Ghana seller payouts | Existing Paystack payout path | Continue the current automated payout queue and delivery-confirmation hold. |
| Sellers in other African countries receiving local payouts | Not yet verified | Requires an approved provider and payout capability for each seller country. |
| Global seller onboarding and payouts | Not yet verified | Stripe Connect’s official cross-border payout page lists self-serve Connect platform locations as US, UK, EEA, Canada, and Switzerland; it says self-serve cross-border payouts are not supported to countries outside that list. [2] |
| Flutterwave split payments | Not activatable now | The adapter is isolated in code, but merchant access is unavailable under the current onboarding profile. |

## Recommended phases

### Phase 1 — Enable international buyers through Paystack

The user should open the Paystack Dashboard and check **Settings → Preferences → Accept international payments**. If it is not enabled, use **Request international payments** and complete Paystack’s compliance process. Paystack states that the response should arrive within 48 working hours after a valid request. [1]

No checkout code change is required for the first test because Reliable already initializes and verifies Paystack payments in GHS. The customer’s bank handles the currency conversion, while Paystack settles the charged GHS amount minus transaction fees to the Ghana business account. [1]

### Phase 2 — Preserve commission and Ghana settlement

The marketplace should continue recording the order in the order currency, then calculate:

```text
gross amount − platform commission = seller net amount
```

The seller net amount remains in the existing payout ledger. Delivery confirmation, dispute holds, reversal handling, and automated Paystack transfers remain unchanged until a new provider is verified for a specific seller country.

### Phase 3 — Add international seller countries one by one

For each new seller country, Reliable must verify four separate capabilities before enabling it: buyer checkout, currency settlement, seller onboarding, and seller payout. A country should remain disabled if any required capability is unavailable.

The provider-neutral tables and Flutterwave adapter already added to the codebase remain useful for this staged approach. They are not live-enabled and do not change Paystack behavior.

## Provider decision rule

Do not add a provider merely because it accepts international cards. A marketplace provider must also legally and operationally support the platform’s business location, seller onboarding, commission splitting, refunds/chargebacks, and payouts. Stripe Connect is a powerful marketplace product, but its official cross-border documentation does not establish that a Ghana-based platform can self-serve global seller payouts. [2] Adyen and similar enterprise platforms require direct commercial confirmation before they should be treated as an available route.

## Immediate user action

1. Log in to the [Paystack Dashboard](https://dashboard.paystack.com/).
2. Open **Settings → Preferences**.
3. Check whether **Accept international payments** is enabled.
4. If disabled, choose **Request international payments** and complete the compliance request.
5. Do not modify or remove the existing Paystack secret and public keys.

## References

[1] [Paystack — Enabling international payments for your business](https://support.paystack.com/en/articles/2130690)

[2] [Stripe — Cross-border payouts](https://docs.stripe.com/connect/cross-border-payouts)

[3] [Flutterwave — Split Payments](https://developer.flutterwave.com/v3.0/docs/split-payments)
