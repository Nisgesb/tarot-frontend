import { storageGetItem, storageSetItem } from '../platform/storageAdapter'
import type {
  CreateAiReadingSessionRequest,
  CreateAiReadingSessionResponse,
  GenerateAiReadingRequest,
  GeneratePhysicalReadingRequest,
} from '../types/aiReading'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001'
const AI_READING_ANONYMOUS_SESSION_KEY = 'ai-reading-anonymous-session-v1'

export interface AiReadingApiError extends Error {
  name: 'AiReadingApiError'
  status: number | null
  code: 'HTTP_ERROR' | 'NETWORK_ERROR'
}

function createAiReadingApiError(
  message: string,
  code: AiReadingApiError['code'],
  status: number | null,
) {
  const error = new Error(message) as AiReadingApiError
  error.name = 'AiReadingApiError'
  error.status = status
  error.code = code
  return error
}

async function requestJson<T>(path: string, init: RequestInit) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, init)
  } catch (exception) {
    const message =
      exception instanceof Error && exception.message.trim().length > 0
        ? exception.message
        : 'Network request failed'

    throw createAiReadingApiError(message, 'NETWORK_ERROR', null)
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`

    try {
      const payload = (await response.json()) as {
        message?: string | string[]
      }

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ')
      } else if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        message = payload.message
      }
    } catch {
      // keep fallback message
    }

    throw createAiReadingApiError(message, 'HTTP_ERROR', response.status)
  }

  return (await response.json()) as T
}

async function extractErrorMessage(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        message?: string | string[]
      }

      if (Array.isArray(payload.message)) {
        return payload.message.join(', ')
      }

      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        return payload.message
      }
    } catch {
      // keep fallback message
    }
  }

  try {
    const text = await response.text()

    if (text.trim().length > 0) {
      return text.trim()
    }
  } catch {
    // keep fallback message
  }

  return `Request failed: ${response.status}`
}

export async function loadStoredAiReadingAnonymousSessionId() {
  const value = await storageGetItem(AI_READING_ANONYMOUS_SESSION_KEY)

  if (!value || value.trim().length === 0) {
    return null
  }

  return value
}

export async function saveStoredAiReadingAnonymousSessionId(sessionId: string) {
  await storageSetItem(AI_READING_ANONYMOUS_SESSION_KEY, sessionId)
}

export async function createAiReadingSession(payload: CreateAiReadingSessionRequest) {
  return requestJson<CreateAiReadingSessionResponse>('/ai-readings/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

export async function generateAiReading(
  readingId: string,
  payload: GenerateAiReadingRequest,
  onChunk: (chunk: string) => void,
) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/ai-readings/${encodeURIComponent(readingId)}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      body: JSON.stringify(payload),
    })
  } catch (exception) {
    const message =
      exception instanceof Error && exception.message.trim().length > 0
        ? exception.message
        : 'Network request failed'

    throw createAiReadingApiError(message, 'NETWORK_ERROR', null)
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response)

    throw createAiReadingApiError(message, 'HTTP_ERROR', response.status)
  }

  if (!response.body) {
    const text = await response.text()

    if (text.length > 0) {
      onChunk(text)
    }

    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const chunk = decoder.decode(value, { stream: true })

    if (!chunk) {
      continue
    }

    fullText += chunk
    onChunk(chunk)
  }

  const tail = decoder.decode()

  if (tail) {
    fullText += tail
    onChunk(tail)
  }

  return fullText
}

export async function generatePhysicalReading(
  payload: GeneratePhysicalReadingRequest,
  onChunk: (chunk: string) => void,
) {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/ai-readings/physical/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain',
      },
      body: JSON.stringify(payload),
    })
  } catch (exception) {
    const message =
      exception instanceof Error && exception.message.trim().length > 0
        ? exception.message
        : 'Network request failed'

    throw createAiReadingApiError(message, 'NETWORK_ERROR', null)
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response)

    throw createAiReadingApiError(message, 'HTTP_ERROR', response.status)
  }

  if (!response.body) {
    const text = await response.text()

    if (text.length > 0) {
      onChunk(text)
    }

    return text
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    const chunk = decoder.decode(value, { stream: true })

    if (!chunk) {
      continue
    }

    fullText += chunk
    onChunk(chunk)
  }

  const tail = decoder.decode()

  if (tail) {
    fullText += tail
    onChunk(tail)
  }

  return fullText
}
