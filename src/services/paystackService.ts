/**
 * Paystack Service
 * 
 * Communicates with Paystack through the Vercel serverless API
 * to keep the secret key server-side and avoid CORS issues.
 */

export interface PaystackInitializePaymentPayload {
  email: string
  amount: number // Amount in kobo (smallest currency unit)
  reference?: string
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

export interface PaystackVerifyPaymentResponse {
  status: boolean
  message: string
  data: {
    id: number
    reference: string
    amount: number
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
  payload: PaystackInitializePaymentPayload
): Promise<PaystackInitializePaymentResponse> => {
  try {
    const response = await fetch('/api/paystack', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'initialize',
        email: payload.email,
        amount: payload.amount,
        reference: payload.reference,
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
