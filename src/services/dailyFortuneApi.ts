import { storageGetItem, storageSetItem } from '../platform/storageAdapter'
import { ZODIAC_SIGNS, type DailyFortunePayload, type ZodiacSign } from '../types/dailyFortune'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3001'
const DAILY_FORTUNE_ZODIAC_KEY = 'daily-fortune-zodiac-v1'
const DEFAULT_ZODIAC_SIGN: ZodiacSign = 'libra'

const ZODIAC_SIGN_SET = new Set<ZodiacSign>(ZODIAC_SIGNS)

export interface DailyFortuneApiError extends Error {
  name: 'DailyFortuneApiError'
  status: number | null
  code: 'HTTP_ERROR' | 'NETWORK_ERROR'
}

function createDailyFortuneApiError(
  message: string,
  code: DailyFortuneApiError['code'],
  status: number | null,
) {
  const error = new Error(message) as DailyFortuneApiError
  error.name = 'DailyFortuneApiError'
  error.status = status
  error.code = code
  return error
}

export function isZodiacSign(value: string): value is ZodiacSign {
  return ZODIAC_SIGN_SET.has(value as ZodiacSign)
}

export function resolveTodayDateIso() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function resolveDefaultZodiacSign() {
  return DEFAULT_ZODIAC_SIGN
}

export async function loadStoredZodiacSign() {
  const value = await storageGetItem(DAILY_FORTUNE_ZODIAC_KEY)

  if (!value || !isZodiacSign(value)) {
    return null
  }

  return value
}

export async function saveStoredZodiacSign(sign: ZodiacSign) {
  await storageSetItem(DAILY_FORTUNE_ZODIAC_KEY, sign)
}

export async function fetchDailyFortune(params: { zodiacSign: ZodiacSign; date: string }) {
  const query = new URLSearchParams({
    zodiacSign: params.zodiacSign,
    date: params.date,
  })
  const url = `${API_BASE_URL}/daily-fortune?${query.toString()}`

  let response: Response

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
  } catch (exception) {
    const message =
      exception instanceof Error && exception.message.trim().length > 0
        ? exception.message
        : 'Network request failed'

    throw createDailyFortuneApiError(message, 'NETWORK_ERROR', null)
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`

    try {
      const payload = (await response.json()) as { message?: string | string[] }

      if (Array.isArray(payload.message)) {
        message = payload.message.join(', ')
      } else if (payload.message) {
        message = payload.message
      }
    } catch {
      // keep default message
    }

    throw createDailyFortuneApiError(message, 'HTTP_ERROR', response.status)
  }

  return (await response.json()) as DailyFortunePayload
}
