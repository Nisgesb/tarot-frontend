import type { DreamAssetLayer, DreamRecord, RawDreamInput } from '../types/dream'
import { createRefinedPrompt } from './dreamAssistantService'
import { createSeededRandom, hashString } from '../utils/seeded'

const DREAM_PALETTES = [
  ['#0054FF', '#156BFF', '#38BEFF', '#D8B6FF', '#F3D4FF'],
  ['#0A2DFF', '#1F71FF', '#7EE1FF', '#E3B5FF', '#FFD6F2'],
  ['#003DCE', '#1373FF', '#63BFFF', '#B2D6FF', '#DAB4FF'],
  ['#0024A3', '#0E59FF', '#38BEFF', '#9DDCFF', '#EAC6FF'],
]

const INSIGHT_POOL = [
  'Dreams often amplify what we avoid during daylight.',
  'Your symbols suggest a desire to bridge control and surrender.',
  'Repetition in dream landscapes can signal unfinished emotional loops.',
  'Unusual details often mark memories that are emotionally charged.',
  'Color intensity in recalled dreams may map to emotional clarity.',
  'Fluid motion imagery can reflect adaptation in real life transitions.',
]

function deriveLayers(seed: number): DreamAssetLayer[] {
  const random = createSeededRandom(seed)
  const layers: DreamAssetLayer[] = []

  for (let index = 0; index < 8; index += 1) {
    layers.push({
      x: random() * 1.2 - 0.1,
      y: random() * 1.1 - 0.05,
      size: 0.24 + random() * 0.6,
      blur: 10 + random() * 50,
      alpha: 0.16 + random() * 0.44,
      driftX: (random() - 0.5) * 0.11,
      driftY: (random() - 0.5) * 0.08,
      hueShift: random() * 40 - 20,
    })
  }

  return layers
}

function pickInsights(seed: number) {
  const random = createSeededRandom(seed ^ 0x9e3779b9)
  const pool = [...INSIGHT_POOL]
  const insights: string[] = []

  while (insights.length < 3 && pool.length) {
    const pick = Math.floor(random() * pool.length)
    insights.push(pool.splice(pick, 1)[0])
  }

  return insights
}

function paletteBySeed(seed: number) {
  return DREAM_PALETTES[seed % DREAM_PALETTES.length]
}

export function createDreamAsset(seed: number) {
  const palette = paletteBySeed(seed)
  const random = createSeededRandom(seed ^ 0xa511e9b3)

  return {
    seed,
    palette,
    orbAccent: palette[Math.floor(random() * palette.length)],
    shimmer: 0.2 + random() * 0.45,
    pulseSpeed: 0.42 + random() * 0.88,
    grain: 0.04 + random() * 0.08,
    layers: deriveLayers(seed),
  }
}

export function createDreamRecordFromRefined(
  refinedText: string,
  rawInput: RawDreamInput,
  source: 'user' | 'gallery' = 'user',
  forcedId?: string,
) {
  const refined = createRefinedPrompt(rawInput)
  const text = refinedText.trim() || refined.text
  const seed = hashString(text)
  const createdAt = new Date().toISOString()
  const generatedId =
    forcedId ?? `dream-${seed.toString(36).slice(0, 7)}-${Date.now().toString(36).slice(-4)}`

  const candidateTitle = refined.title !== 'Untitled Dream' ? refined.title : text
  const title = candidateTitle.slice(0, 80)

  const record: DreamRecord = {
    id: generatedId,
    title,
    refinedPrompt: text,
    summary: refined.summary,
    rawInput,
    createdAt,
    source,
    insights: pickInsights(seed),
    asset: createDreamAsset(seed),
  }

  return record
}
