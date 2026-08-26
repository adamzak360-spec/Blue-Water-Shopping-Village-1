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
  const timePart = Date.now() >>> 0
  const randomPart = Math.floor(Math.random() * 0xffffffff) >>> 0
  return (timePart ^ randomPart) >>> 0
}
