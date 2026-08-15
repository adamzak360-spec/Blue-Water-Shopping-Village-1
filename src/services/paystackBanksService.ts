export interface PaystackInstitution {
  name: string
  code: string
  type: 'ghipss' | 'mobile_money'
  currency: 'GHS'
  country_code: 'GH'
}

export async function listPaystackInstitutions(
  type: 'ghipss' | 'mobile_money',
  accessToken: string,
): Promise<PaystackInstitution[]> {
  const response = await fetch(`/api/paystack-banks?type=${encodeURIComponent(type)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await response.json()
  if (!response.ok || !data.status) throw new Error(data.error || 'Could not load Paystack institutions')
  return data.data as PaystackInstitution[]
}
