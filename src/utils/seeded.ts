export function hashString(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function createSeededRandom(initialSeed: number) {
  let seed = initialSeed || 1

  return () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 1_000_000) / 1_000_000
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
