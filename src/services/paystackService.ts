/**
 * Paystack Service
 * 
 * Communicates with Paystack through the Vercel serverless API
 * to keep the secret key server-side and avoid CORS issues.
 */

export interface PaystackInitializePaymentPayload {
  email: string
  amount: number // Amount in kobo (smallest currency unit)
  currency?: string
  reference?: string
  callback_url?: string
  metadata?: Record<string, any>
}

export interface PaystackInitializePaymentResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface ConfirmPOSSubscriptionPayload {
  business_id: string
  reference: string
  expected_amount_minor: number
  currency: string
}

export interface ConfirmPOSSubscriptionResponse {
  status: boolean
  message: string
  data: {
    business_id: string
    reference: string
    pos_subscription_active: boolean
    pos_subscription_expires_at: string
  }
}

export interface SellerPromotionConfirmationPayload {
  promotion_id: string
  reference: string
}

export interface SellerPromotionConfirmationResponse {
  status: boolean
  message: string
  data: { id: string; status: string; starts_at: string; ends_at: string; payment_reference: string }
}

export interface PaystackVerifyPaymentResponse {
  status: boolean
  message: string
  data: {
    id: number
    reference: string
    amount: number
    currency?: string
    paid_at: string
    status: string
    customer: {
      id: number
      email: string
      customer_code: string
      first_name: string | null
      last_name: string | null
      phone: string | null
    }
    metadata: Record<string, any>
  }
}

/**
 * Initialize a payment with Paystack via serverless API
 * @param payload Payment initialization data
 * @returns Authorization URL and payment reference
 */
export const initializePayment = async (
  payload: PaystackInitializePaymentPayload,
  accessToken?: string,
): Promise<PaystackInitializePaymentResponse> => {
  try {
    const response = await fetch('/api/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        action: 'initialize',
        email: payload.email,
        amount: payload.amount,
        currency: payload.currency,
        reference: payload.reference,
        callback_url: payload.callback_url,
        metadata: payload.metadata,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to initialize payment')
    }

    if (!data.status) {
      throw new Error(data.message || 'Payment initialization failed')
    }

    return data as PaystackInitializePaymentResponse
  } catch (error: any) {
    console.error('[Paystack] Payment initialization failed:', error.message)
    throw new Error(error.message || 'Failed to initialize payment with Paystack')
  }
}

/**
 * Verify a payment with Paystack via serverless API
 * @param reference Payment reference from Paystack
 * @returns Payment verification details
 */
export const confirmPOSSubscription = async (
  payload: ConfirmPOSSubscriptionPayload,
  accessToken: string,
): Promise<ConfirmPOSSubscriptionResponse> => {
  const response = await fetch('/api/paystack', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'confirm_pos_subscription',
      ...payload,
    }),
  })

  const data = await response.json()
  if (!response.ok || !data.status) {
    throw new Error(data.error || data.message || 'Failed to confirm POS subscription')
  }

  return data as ConfirmPOSSubscriptionResponse
}

export const confirmSellerPromotion = async (
  payload: SellerPromotionConfirmationPayload,
  accessToken: string,
): Promise<SellerPromotionConfirmationResponse> => {
  const response = await fetch('/api/paystack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action: 'confirm_seller_promotion', reference: payload.reference, promotion_id: payload.promotion_id }),
  })
  const data = await response.json()
  if (!response.ok || !data.status) throw new Error(data.error || data.message || 'Failed to confirm seller promotion')
  return data as SellerPromotionConfirmationResponse
}

export const verifyPayment = async (reference: string): Promise<PaystackVerifyPaymentResponse> => {
  try {
    const response = await fetch('/api/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verify',
        reference,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to verify payment')
    }

    if (!data.status) {
      throw new Error(data.message || 'Payment verification failed')
    }

    return data as PaystackVerifyPaymentResponse
  } catch (error: any) {
    console.error('[Paystack] Payment verification failed:', error.message)
    throw new Error(error.message || 'Failed to verify payment with Paystack')
  }
}

/**
 * Generate a unique payment reference
 * @returns Unique reference string
 */
export const generatePaymentReference = (): string => {
  return `rlbl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}
