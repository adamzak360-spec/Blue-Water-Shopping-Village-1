import axios from 'axios'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const PAYSTACK_PUBLIC_KEY = 'pk_test_6a63edf615e22d386c9de31ff0c445ec00f12c71'
const PAYSTACK_SECRET_KEY = 'sk_test_e33edb0722a842a8a811c71e3a32a1e594538d70'

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
 * Initialize a payment with Paystack
 * @param payload Payment initialization data
 * @returns Authorization URL and payment reference
 */
export const initializePayment = async (
  payload: PaystackInitializePaymentPayload
): Promise<PaystackInitializePaymentResponse> => {
  try {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: payload.email,
        amount: payload.amount,
        reference: payload.reference,
        metadata: payload.metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.error('[Paystack] Payment initialization failed:', error.response?.data || error.message)
    throw new Error(
      error.response?.data?.message || 'Failed to initialize payment with Paystack'
    )
  }
}

/**
 * Verify a payment with Paystack
 * @param reference Payment reference from Paystack
 * @returns Payment verification details
 */
export const verifyPayment = async (reference: string): Promise<PaystackVerifyPaymentResponse> => {
  try {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    return response.data
  } catch (error: any) {
    console.error('[Paystack] Payment verification failed:', error.response?.data || error.message)
    throw new Error(
      error.response?.data?.message || 'Failed to verify payment with Paystack'
    )
  }
}

/**
 * Generate a unique payment reference
 * @returns Unique reference string
 */
export const generatePaymentReference = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get the Paystack public key for frontend
 * @returns Public key
 */
export const getPublicKey = (): string => {
  return PAYSTACK_PUBLIC_KEY
}
