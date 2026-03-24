import type {
  DreamAssistantQuestion,
  RawDreamInput,
  RefinedDreamPrompt,
} from '../types/dream'

export const ASSISTANT_QUESTIONS: DreamAssistantQuestion[] = [
  {
    id: 'environment',
    title: 'Environment',
    prompt: 'Where did the dream unfold?',
    placeholder: 'A floating train station above the sea...',
    chips: ['Ancient temple', 'Neon city', 'Infinite ocean', 'Moonlit forest'],
  },
  {
    id: 'characters',
    title: 'Characters',
    prompt: 'Who or what appeared in the dream?',
    placeholder: 'A faceless friend, a glowing fox, strangers...',
    chips: ['Future self', 'Unknown child', 'My family', 'A luminous creature'],
  },
  {
    id: 'feeling',
    title: 'Feeling',
    prompt: 'What emotion was strongest?',
    placeholder: 'Calm wonder, anxious, nostalgic, euphoric...',
    chips: ['Wonder', 'Anxious', 'Tender', 'Fearless'],
  },
  {
    id: 'action',
    title: 'Action',
    prompt: 'What was happening or changing?',
    placeholder: 'I was flying through doors of light...',
    chips: ['Running toward light', 'Falling slowly', 'Searching', 'Dancing in rain'],
  },
  {
    id: 'strangeDetail',
    title: 'Strange detail',
    prompt: 'What was the most surreal detail?',
    placeholder: 'The sky whispered my name in silver letters...',
    chips: ['Melting clocks', 'Echoing shadows', 'Breathing walls', 'Silent thunder'],
  },
]

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((word) => `${word[0]?.toUpperCase() ?? ''}${word.slice(1)}`)
    .join(' ')
}

function firstMeaningfulChunk(value: string) {
  return value
    .split(/[.!?。！？]/)
    .map((item) => item.trim())
    .find((item) => item.length > 8)
}

export function createRefinedPrompt(input: RawDreamInput): RefinedDreamPrompt {
  const memory = input.memory.trim()
  const environment = input.environment.trim()
  const characters = input.characters.trim()
  const feeling = input.feeling.trim()
  const action = input.action.trim()
  const strangeDetail = input.strangeDetail.trim()

  const lines = [
    memory ? `Dream memory: ${memory}.` : '',
    environment ? `Set inside ${environment}.` : '',
    characters ? `Featuring ${characters}.` : '',
    action ? `Core movement: ${action}.` : '',
    feeling ? `Mood: ${feeling}.` : '',
    strangeDetail ? `Uncanny detail: ${strangeDetail}.` : '',
    'Visual tone: cinematic ethereal blue-violet glow, soft nebula haze, premium dreamlike atmosphere.',
  ]
    .filter(Boolean)
    .join(' ')

  const candidateTitle = titleCase(firstMeaningfulChunk(memory) ?? 'Untitled Dream')
  const title = candidateTitle.length > 4 ? candidateTitle : 'Untitled Dream'

  return {
    text: lines,
    title,
    summary: `${title} · ${feeling || 'Uncharted feeling'} · ${
      environment || 'Unknown horizon'
    }`,
    createdAt: new Date().toISOString(),
    source: input,
  }
}
