# Reliable Seller Payout Audit

## Current verified behavior

The current marketplace supports Paystack customer payment initialization and transaction verification. After a verified customer transaction, the frontend creates an order with payment metadata such as `payment_status`, `paystack_reference`, `amount_paid`, `payment_date`, and `transaction_id`.

Order status currently represents operational fulfillment states such as pending, approved, processing, ready-for-pickup, out-for-delivery, delivered, and cancelled. The order service updates this status and sends notifications, but there is no separate customer-received or admin-confirmed-delivery state.

The current Paystack serverless API supports only transaction initialization and transaction verification. It does not support transfer recipients, transfers, transfer verification, webhooks, balance checks, payout references, or idempotency handling.

The inspected repository contains no payout queue, payout table, seller payout profile, wallet ledger, commission ledger, payout audit log, or automatic background worker. The seller and admin interfaces currently expose order/payment information but not payout eligibility or transfer status.

## Safety boundary

The existing customer checkout and payment flow must remain unchanged. No live Paystack charge or seller transfer will be initiated during development testing. Production payout initiation must remain disabled until a secure server-side configuration, payout recipient data model, database migration, and trusted Paystack verification path are available.

## Required backward-compatible work

1. Add separate delivery-confirmation and payout status fields rather than treating `delivered` or `customer_confirmed_received` as paid.
2. Add an idempotent payout record keyed by order and unique payout reference.
3. Preserve the existing commission rules and store gross, commission, and net values explicitly.
4. Add server-side-only payout operations; never expose Paystack secret credentials in client code.
5. Add audit events, retry/hold states, and verified transfer completion states.
6. Add safe tests that mock Paystack and exercise duplicate confirmation, duplicate payout attempts, failures, retries, and concurrent queue claims.
7. Deploy only after build, regression, and configuration checks pass.
