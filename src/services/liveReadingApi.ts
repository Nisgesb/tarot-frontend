import type {
  AuthPayload,
  CardRevealPayload,
  CallSession,
  JoinTokenResponse,
  ReaderSummary,
  TarotDeckSummary,
} from '../types/liveReading';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001';
export const LIVEKIT_WS_URL = import.meta.env.VITE_LIVEKIT_WS_URL ?? 'ws://127.0.0.1:7880';
const AUTH_STORAGE_KEY = 'live-reading-auth-v1';
type RequestMethod = 'GET' | 'POST';

export type LiveReadingApiErrorCode = 'HTTP_ERROR' | 'NETWORK_ERROR';

export interface LiveReadingApiError extends Error {
  name: 'LiveReadingApiError';
  code: LiveReadingApiErrorCode;
  method: RequestMethod;
  path: string;
  url: string;
  status: number | null;
  serverMessage: string | null;
}

interface RequestOptions {
  method?: RequestMethod;
  token?: string;
  body?: unknown;
}

interface CreateApiErrorOptions {
  message: string;
  code: LiveReadingApiErrorCode;
  method: RequestMethod;
  path: string;
  url: string;
  status: number | null;
  serverMessage: string | null;
}

function createLiveReadingApiError(options: CreateApiErrorOptions): LiveReadingApiError {
  const error = new Error(options.message) as LiveReadingApiError;
  error.name = 'LiveReadingApiError';
  error.code = options.code;
  error.method = options.method;
  error.path = options.path;
  error.url = options.url;
  error.status = options.status;
  error.serverMessage = options.serverMessage;
  return error;
}

export function isLiveReadingApiError(error: unknown): error is LiveReadingApiError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as Partial<LiveReadingApiError>;
  return (
    candidate.name === 'LiveReadingApiError' &&
    (candidate.code === 'HTTP_ERROR' || candidate.code === 'NETWORK_ERROR') &&
    typeof candidate.path === 'string' &&
    typeof candidate.url === 'string'
  );
}

async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const method = options.method ?? 'GET';
  const url = `${API_BASE_URL}${path}`;
  const hasJsonBody = options.body !== undefined

  let response: Response;

  try {
    response = await fetch(url, {
      method,
      headers: {
        ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: hasJsonBody ? JSON.stringify(options.body) : undefined,
    });
  } catch (exception) {
    const message =
      exception instanceof Error && exception.message.trim().length > 0
        ? exception.message
        : 'Network request failed';

    throw createLiveReadingApiError({
      message,
      code: 'NETWORK_ERROR',
      method,
      path,
      url,
      status: null,
      serverMessage: null,
    });
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    let serverMessage: string | null = null;

    try {
      const payload = (await response.json()) as { message?: string | string[] };

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
        serverMessage = message;
      } else if (payload.message) {
        message = payload.message;
        serverMessage = payload.message;
      }
    } catch {
      // Keep default message
    }

    throw createLiveReadingApiError({
      message,
      code: 'HTTP_ERROR',
      method,
      path,
      url,
      status: response.status,
      serverMessage,
    });
  }

  return (await response.json()) as T;
}

export function loadStoredAuth(): AuthPayload | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as AuthPayload;
  } catch {
    return null;
  }
}

export function saveStoredAuth(auth: AuthPayload | null) {
  try {
    if (!auth) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
  } catch {
    // ignore local storage errors
  }
}

export function registerWithEmail(email: string, password: string) {
  return requestJson<AuthPayload>('/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });
}

export function loginWithEmail(email: string, password: string) {
  return requestJson<AuthPayload>('/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });
}

export function getOnlineReaders() {
  return requestJson<ReaderSummary[]>('/readers/online');
}

export function getTarotDecks() {
  return requestJson<TarotDeckSummary[]>('/tarot/decks');
}

export function createCallSession(token: string, readerId: string, deckId: string) {
  return requestJson<CallSession>('/calls', {
    method: 'POST',
    token,
    body: {
      readerId,
      deckId,
    },
  });
}

export function createCallJoinToken(token: string, sessionId: string) {
  return requestJson<JoinTokenResponse>(`/calls/${sessionId}/join-token`, {
    method: 'POST',
    token,
  });
}

export function submitRevealEvent(token: string, sessionId: string, payload: CardRevealPayload) {
  return requestJson(`/calls/${sessionId}/reveal`, {
    method: 'POST',
    token,
    body: {
      cardId: payload.cardId,
      archetype: payload.archetype,
      effectPreset: payload.effectPreset,
      ts: payload.ts,
    },
  });
}

export function endCallSession(token: string, sessionId: string) {
  return requestJson<CallSession>(`/calls/${sessionId}/end`, {
    method: 'POST',
    token,
  });
}
