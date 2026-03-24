export interface RawDreamInput {
  memory: string
  environment: string
  characters: string
  feeling: string
  action: string
  strangeDetail: string
}

export interface DreamAssistantQuestion {
  id: keyof Omit<RawDreamInput, 'memory'>
  title: string
  prompt: string
  placeholder: string
  chips: string[]
}

export interface DreamAssistantState {
  phase: 'dreamEntry' | 'assistantRefine'
  questionIndex: number
  input: RawDreamInput
  refinedText: string
}

export interface RefinedDreamPrompt {
  text: string
  title: string
  summary: string
  createdAt: string
  source: RawDreamInput
}

export interface DreamAssetLayer {
  x: number
  y: number
  size: number
  blur: number
  alpha: number
  driftX: number
  driftY: number
  hueShift: number
}

export interface DreamAsset {
  seed: number
  palette: string[]
  orbAccent: string
  shimmer: number
  pulseSpeed: number
  grain: number
  layers: DreamAssetLayer[]
}

export interface DreamRecord {
  id: string
  title: string
  refinedPrompt: string
  summary: string
  rawInput: RawDreamInput
  createdAt: string
  source: 'user' | 'gallery'
  insights: string[]
  asset: DreamAsset
}

export interface DreamCollection {
  id: 'gallery' | 'my-dreams'
  label: string
  dreams: DreamRecord[]
}

export const EMPTY_RAW_DREAM_INPUT: RawDreamInput = {
  memory: '',
  environment: '',
  characters: '',
  feeling: '',
  action: '',
  strangeDetail: '',
}
