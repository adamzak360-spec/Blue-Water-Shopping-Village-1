export function shuffle<T>(items: T[]): T[] {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }

  return result
}

/**
 * Shuffles a bounded response with a stable seed. The seed is generated once
 * per page visit, so refreshes can discover a different order while load-more
 * requests remain stable and cannot reshuffle products already displayed.
 */
export function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items]
  let state = (seed >>> 0) || 1

  const nextRandom = () => {
    state = (1664525 * state + 1013904223) >>> 0
    return state / 4294967296
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(nextRandom() * (index + 1))
    ;[result[index], result[randomIndex]] = [result[randomIndex], result[index]]
  }

  return result
}

export function createRotationSeed(): number {
  if (typeof window === 'undefined') {
    return 1
  }

  try {
    const key = 'reliable.catalog.rotation.visit'
    const previousVisit = Number.parseInt(window.sessionStorage.getItem(key) || '0', 10)
    const visit = Number.isFinite(previousVisit) ? previousVisit + 1 : 1
    window.sessionStorage.setItem(key, String(visit))
    return visit >>> 0
  } catch {
    return 1
  }
}

/**
 * Rotates a bounded page by a deterministic visit offset. Unlike a random
 * shuffle, this guarantees that a refresh changes the order while preserving
 * a stable order for the rest of the current visit.
 */
export function rotateWithSeed<T>(items: T[], seed: number): T[] {
  if (items.length < 2) return [...items]
  const offset = Math.abs(seed) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}
