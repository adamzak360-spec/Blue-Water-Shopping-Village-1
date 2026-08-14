import { supabase } from '../supabaseClient'

export interface ProductDescriptionDraft {
  description: string
  shortDescription: string
  highlights: string[]
  seoTitle: string
  keywords: string[]
}

export interface ProductDescriptionInput {
  name: string
  category: string
  price?: string
  brand?: string
  material?: string
  sizes?: string
  colors?: string
  keyFeatures?: string
  condition?: string
  notes?: string
}

export async function generateProductDescriptionDraft(input: ProductDescriptionInput): Promise<ProductDescriptionDraft> {
  if (!supabase) throw new Error('Please sign in and configure the marketplace before using Reliable AI.')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Please sign in as a seller to use Reliable AI.')

  const response = await fetch('/api/generate-description', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(input),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Reliable AI could not generate a draft.')
  if (!payload.draftOnly || !payload.draft) throw new Error('Reliable AI returned an invalid draft.')
  return payload.draft as ProductDescriptionDraft
}
