import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../types'
import type { LanguageCode } from './index'
import { translateCategory } from './index'

type TranslatedFields = { name: string; description: string; category: string }
type ProductInput = { id: string; name: string; description: string; category: string }
const memoryCache = new Map<string, TranslatedFields>()
const pendingKeys = new Map<string, Promise<void>>()
const queued = new Map<string, ProductInput>()
const queueWaiters = new Map<string, Array<() => void>>()
const queueTimers = new Map<string, ReturnType<typeof setTimeout>>()
const keyFor = (language: LanguageCode, product: ProductInput) => `${language}:${product.id}:${product.name}:${product.description}:${product.category}`

function queueBatch(language: LanguageCode, product: ProductInput) {
  const key = keyFor(language, product)
  if (memoryCache.has(key)) return Promise.resolve()
  const existing = pendingKeys.get(key)
  if (existing) return existing
  queued.set(`${language}:${product.id}`, product)
  const promise = new Promise<void>(resolve => {
    const waiters = queueWaiters.get(`${language}:${product.id}`) || []
    waiters.push(resolve)
    queueWaiters.set(`${language}:${product.id}`, waiters)
  })
  pendingKeys.set(key, promise)
  if (!queueTimers.has(language)) {
    queueTimers.set(language, setTimeout(() => {
      queueTimers.delete(language)
      void flushBatch(language)
    }, 0))
  }
  return promise
}

async function flushBatch(language: LanguageCode) {
  const items = Array.from(queued.entries()).filter(([key]) => key.startsWith(`${language}:`)).map(([, item]) => item).slice(0, 60)
  items.forEach(item => queued.delete(`${language}:${item.id}`))
  if (!items.length) return
  try {
    const response = await fetch('/api/generate-description', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'translate-content', language, items }) })
    const payload = response.ok ? await response.json() : { translations: {} }
    for (const item of items) {
      const translated = payload?.translations?.[item.id]
      if (translated) memoryCache.set(keyFor(language, item), { name: translated.name || item.name, description: translated.description || item.description, category: translated.category || item.category })
      const waiters = queueWaiters.get(`${language}:${item.id}`) || []
      waiters.forEach(resolve => resolve())
      queueWaiters.delete(`${language}:${item.id}`)
      pendingKeys.delete(keyFor(language, item))
    }
  } catch {
    items.forEach(item => {
      ;(queueWaiters.get(`${language}:${item.id}`) || []).forEach(resolve => resolve())
      queueWaiters.delete(`${language}:${item.id}`)
      pendingKeys.delete(keyFor(language, item))
    })
  }
  if (queued.keys().next().value) {
    queueTimers.set(language, setTimeout(() => { queueTimers.delete(language); void flushBatch(language) }, 0))
  }
}

export function useTranslatedProduct(product: Product | null, language: LanguageCode) {
  const input = product ? { id: product.id, name: product.name, description: product.description || '', category: product.category || '' } : null
  const key = input ? keyFor(language, input) : `loading:${language}`
  const [translated, setTranslated] = useState<TranslatedFields>(() => input ? (memoryCache.get(key) || { name: input.name, description: input.description, category: translateCategory(input.category, language) }) : { name: '', description: '', category: '' })
  useEffect(() => {
    let active = true
    if (!product || !input) return () => { active = false }
    const cached = memoryCache.get(key)
    setTranslated(cached || { name: input.name, description: input.description, category: translateCategory(input.category, language) })
    queueBatch(language, input).then(() => { if (active) { const next = memoryCache.get(key); if (next) setTranslated(next) } })
    return () => { active = false }
  }, [key, language, product, input])
  return useMemo(() => product ? ({ ...product, name: translated.name, description: translated.description, category: translated.category }) : null, [product, translated])
}
