export interface ConfigurePaystackRecipientPayload {
  store_id: string
  recipient_type: string
  account_name: string
  account_number: string
  bank_code: string
  currency: string
  country_code: string
}

export interface ConfigurePaystackRecipientResponse {
  status: boolean
  data: {
    recipient_code: string
    recipient_type: string
    currency: string
    country_code: string
    account_name: string
    account_number_last4: string
    provider_onboarding_status: 'ACTIVE'
  }
}

export async function configurePaystackRecipient(
  payload: ConfigurePaystackRecipientPayload,
  accessToken: string,
): Promise<ConfigurePaystackRecipientResponse> {
  const response = await fetch('/api/paystack-recipient', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok || !data.status) throw new Error(data.error || 'Could not configure Paystack payout recipient')
  return data as ConfigurePaystackRecipientResponse
}
