export type AiReadingMode = "three-card";

export type AiReadingSlot = 1 | 2 | 3;

export interface SpreadCardItem {
  slot: AiReadingSlot;
  slotLabel: string;
  cardId: string;
  cardSlug: string;
  cardName: string;
  cardTags: string[];
}

export interface CreateAiReadingSessionRequest {
  mode: AiReadingMode;
  question: string;
  anonymousSessionId?: string;
}

export interface CreateAiReadingSessionResponse {
  anonymousSessionId: string;
  readingId: string;
  mode: AiReadingMode;
  question: string;
  spread: SpreadCardItem[];
  createdAt: string;
}

export interface GenerateAiReadingRequest {
  anonymousSessionId: string;
}

export interface GenerateAiReadingResponse {
  rawText: string;
  usedMock: boolean;
  debugMeta: {
    providerMode: "RESPONSES" | "CHAT_COMPLETIONS" | "MOCK";
    model?: string;
    fallbackReason?: string;
    latencyMs?: number;
  };
}

export interface GeneratePhysicalReadingRequest {
  question: string;
  imageDataUrl: string;
}
