import {
  initializeFlutterwavePayment,
  verifyFlutterwavePayment,
  type FlutterwaveInitializeResult,
  type FlutterwaveVerificationResult,
} from './flutterwaveService'
import {
  initializePayment,
  verifyPayment,
  type PaystackInitializePaymentResponse,
  type PaystackVerifyPaymentResponse,
} from './paystackService'

export type PaymentProvider = 'paystack' | 'flutterwave'

export interface ProviderPaymentInitializeRequest {
  provider: PaymentProvider
  email: string
  amountMinor: number
  currency: string
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}

export type ProviderPaymentInitializeResult =
  | { provider: 'paystack'; providerReference: string; redirectUrl: string; raw: PaystackInitializePaymentResponse }
  | { provider: 'flutterwave'; providerReference: string; redirectUrl: string; raw: FlutterwaveInitializeResult }

export type ProviderPaymentVerificationResult =
  | { provider: 'paystack'; providerReference: string; status: 'success' | 'pending' | 'failed'; amountMinor: number; currency: string; transactionId?: string; raw: PaystackVerifyPaymentResponse }
  | { provider: 'flutterwave'; providerReference: string; status: FlutterwaveVerificationResult['status']; amountMinor: number; currency: string; transactionId?: string; raw: FlutterwaveVerificationResult }

export async function initializeProviderPayment(
  request: ProviderPaymentInitializeRequest,
): Promise<ProviderPaymentInitializeResult> {
  if (request.provider === 'paystack') {
    const raw = await initializePayment({
      email: request.email,
      amount: request.amountMinor,
      currency: request.currency.toUpperCase(),
      reference: request.reference,
      callback_url: request.callbackUrl,
      metadata: request.metadata,
    })
    return {
      provider: 'paystack',
      providerReference: raw.data.reference,
      redirectUrl: raw.data.authorization_url,
      raw,
    }
  }

  const raw = await initializeFlutterwavePayment({
    email: request.email,
    amount: request.amountMinor / 100,
    currency: request.currency.toUpperCase(),
    tx_ref: request.reference,
    redirect_url: request.callbackUrl,
    customer: { email: request.email },
    meta: request.metadata,
  })
  return {
    provider: 'flutterwave',
    providerReference: raw.providerReference,
    redirectUrl: raw.redirectUrl,
    raw,
  }
}

export async function verifyProviderPayment(
  provider: PaymentProvider,
  reference: string,
): Promise<ProviderPaymentVerificationResult> {
  if (provider === 'paystack') {
    const raw = await verifyPayment(reference)
    return {
      provider: 'paystack',
      providerReference: raw.data.reference,
      status: raw.data.status === 'success' ? 'success' : 'failed',
      amountMinor: raw.data.amount,
      currency: String(raw.data.currency || '').toUpperCase(),
      transactionId: String(raw.data.id),
      raw,
    }
  }

  const raw = await verifyFlutterwavePayment({ tx_ref: reference })
  return {
    provider: 'flutterwave',
    providerReference: raw.providerReference || reference,
    status: raw.status,
    amountMinor: raw.amountMinor,
    currency: raw.currency,
    transactionId: raw.transactionId,
    raw,
  }
}
