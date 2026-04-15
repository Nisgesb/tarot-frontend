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

interface RequestOptions {
  method?: 'GET' | 'POST';
  token?: string;
  body?: unknown;
}

async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const hasJsonBody = options.body !== undefined

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: hasJsonBody ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;

    try {
      const payload = (await response.json()) as { message?: string | string[] };

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ');
      } else if (payload.message) {
        message = payload.message;
      }
    } catch {
      // Keep default message
    }

    throw new Error(message);
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
