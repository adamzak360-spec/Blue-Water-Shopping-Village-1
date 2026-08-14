export interface FlutterwaveInitializePayload {
  email: string
  amount: number // Major currency unit for Flutterwave Standard checkout.
  currency: string
  tx_ref: string
  redirect_url: string
  customer?: {
    email?: string
    name?: string
    phonenumber?: string
  }
  meta?: Record<string, unknown>
  payment_options?: string
}

export interface FlutterwaveInitializeResult {
  provider: 'flutterwave'
  providerReference: string
  redirectUrl: string
  status: 'requires_action' | 'pending'
  raw?: Record<string, unknown>
}

export interface FlutterwaveVerificationResult {
  provider: 'flutterwave'
  providerReference: string
  transactionId?: string
  status: 'success' | 'pending' | 'failed' | 'refunded' | 'reversed'
  amountMinor: number
  currency: string
  paidAt?: string
  raw?: Record<string, unknown>
}

async function postFlutterwave<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/flutterwave', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Flutterwave request failed')
  return data as T
}

export function initializeFlutterwavePayment(
  payload: FlutterwaveInitializePayload,
): Promise<FlutterwaveInitializeResult> {
  return postFlutterwave<FlutterwaveInitializeResult>({
    action: 'initialize',
    ...payload,
    currency: payload.currency.toUpperCase(),
  })
}

export function verifyFlutterwavePayment(input: {
  tx_ref?: string
  transaction_id?: string
}): Promise<FlutterwaveVerificationResult> {
  return postFlutterwave<FlutterwaveVerificationResult>({
    action: 'verify',
    ...input,
  })
}
