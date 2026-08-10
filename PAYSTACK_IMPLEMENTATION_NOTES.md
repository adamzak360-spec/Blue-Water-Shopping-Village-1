# Paystack implementation notes

Source: official Paystack documentation reviewed 2026-08-10.

- Transfers are initiated server-side with `POST /transfer`, using `source: balance`, integer minor units, recipient code, unique reference (lowercase letters, digits, dash/underscore; 16–50 chars), and currency. Paystack's returned transfer status must not be treated as final success without verification.
- Transfer details can be fetched with `GET /transfer/:id_or_code`; the transfer API also documents a verify-transfer endpoint. The payout ledger should retain the transfer reference/code and verify final state before setting `PAID`.
- Paystack supports transfer statuses/events including pending/processing, success, failed, and reversed. Webhook event names include `transfer.success`, `transfer.failed`, and `transfer.reversed`.
- Webhooks should return HTTP 200 quickly, verify `x-paystack-signature` as HMAC-SHA512 of the raw request payload using the secret key, and process events idempotently. Duplicate delivery must not duplicate payouts.
- Paystack retries unacknowledged webhooks; therefore webhook work should be short and safe to repeat.
- Ghana recipients: bank accounts use `ghipss` and GHS; mobile money uses `mobile_money` and GHS. For mobile money, use the phone number as `account_number` and telco code as `bank_code`; supported codes are obtained from Paystack's bank listing endpoint with `currency=GHS&type=mobile_money`.
- Recipient codes should be stored in the seller's secure payout profile. Do not expose account details publicly.
- Bulk transfers exist, but the implementation should begin with controlled/idempotent per-payout processing unless the existing account configuration is verified for bulk transfers.

Official references:
- https://paystack.com/docs/api/transfer/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/transfers/creating-transfer-recipients/
- https://paystack.com/docs/transfers/
