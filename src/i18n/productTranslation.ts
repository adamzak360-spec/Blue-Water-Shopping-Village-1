import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../types'
import type { LanguageCode } from './index'
import { translateCategory } from './index'

type TranslatedFields = { name: string; description: string; category: string }
const memoryCache = new Map<string, TranslatedFields>()
const pending = new Map<string, Promise<void>>()
const keyFor = (language: LanguageCode, product: Product) => `${language}:${product.id}:${product.name}:${product.description || ''}:${product.category || ''}`

async function requestTranslation(language: LanguageCode, product: Product) {
  if (language === 'en') return
  const key = keyFor(language, product)
  if (memoryCache.has(key) || pending.has(key)) return pending.get(key)
  const promise = fetch('/api/translate-content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, items: [{ id: product.id, name: product.name, description: product.description || '', category: product.category || '' }] }) })
    .then(response => response.ok ? response.json() : { translations: {} })
    .then(payload => { const translated = payload?.translations?.[product.id]; if (translated) memoryCache.set(key, { name: translated.name || product.name, description: translated.description || product.description || '', category: translated.category || product.category }) })
    .catch(() => undefined)
    .finally(() => { pending.delete(key) })
  pending.set(key, promise)
  return promise
}

export function useTranslatedProduct(product: Product | null, language: LanguageCode) {
  const key = product ? keyFor(language, product) : `loading:${language}`
  const [translated, setTranslated] = useState<TranslatedFields>({ name: product?.name || '', description: product?.description || '', category: product ? translateCategory(product.category, language) : '' })
  useEffect(() => {
    let active = true
    if (!product) return () => { active = false }
    const cached = memoryCache.get(key)
    setTranslated(cached || { name: product.name, description: product.description || '', category: translateCategory(product.category, language) })
    requestTranslation(language, product).then(() => { if (active) { const next = memoryCache.get(key); if (next) setTranslated(next) } })
    return () => { active = false }
  }, [key, language, product])
  return useMemo(() => product ? ({ ...product, name: translated.name, description: translated.description, category: translated.category }) : null, [product, translated])
}
