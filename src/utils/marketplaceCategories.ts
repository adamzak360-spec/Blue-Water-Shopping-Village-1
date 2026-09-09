export const MARKETPLACE_CATEGORY_LABELS = [
  'Games',
  'Fashion',
  'Beauty',
  'Automotive',
  'Food & Groceries',
  'Electronics',
  'Home & Living',
  'Sports & Fitness',
  'Baby Products',
  'Other',
] as const

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORY_LABELS)[number]

export const isMarketplaceCategory = (value: string): value is MarketplaceCategory =>
  (MARKETPLACE_CATEGORY_LABELS as readonly string[]).includes(value)
