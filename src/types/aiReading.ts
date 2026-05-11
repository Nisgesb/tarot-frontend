export type AiReadingMode = 'three-card'

export type AiReadingPosition = 'past' | 'present' | 'future'

export type AiReadingPositionLabel = 'Past' | 'Present' | 'Future'

export interface SpreadCardItem {
  position: AiReadingPosition
  positionLabel: AiReadingPositionLabel
  cardId: string
  cardSlug: string
  cardName: string
  cardTags: string[]
}

export interface CreateAiReadingSessionRequest {
  mode: AiReadingMode
  question: string
  anonymousSessionId?: string
}

export interface CreateAiReadingSessionResponse {
  anonymousSessionId: string
  readingId: string
  mode: AiReadingMode
  question: string
  spread: SpreadCardItem[]
  createdAt: string
}

export interface GenerateAiReadingRequest {
  anonymousSessionId: string
}

export interface GeneratePhysicalReadingRequest {
  question: string
  imageDataUrl: string
}
