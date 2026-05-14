import { checkAppPermission } from '../platform/permissionCenter'

export type HomeMascotWeather = 'rainy' | 'sunny'
export type HomeMascotWeatherSource = 'network' | 'cache' | 'fallback'
export type HomeWeatherDebugScenario = 'none' | 'rainy' | 'sunny' | 'http-error' | 'timeout'
export type HomeWeatherDebugLocationMode =
  | 'device-first'
  | 'cache-only'
  | 'override-only'
  | 'device-fail'
  | 'device-denied'

export type HomeWeatherResultKind = 'rainy' | 'sunny' | 'fallback'
export type HomeWeatherResultOrigin = 'real-api' | 'cache' | 'fallback' | 'debug-mock'

interface CachedCoordinates {
  latitude: number
  longitude: number
  updatedAt: number
}

interface CachedWeather {
  mascotWeather: HomeMascotWeather
  icon: string | null
  text: string | null
  location: CachedCoordinates | null
  updatedAt: number
}

export interface HomeMascotWeatherResult {
  mascotWeather: HomeMascotWeather
  icon: string | null
  text: string | null
  source: HomeMascotWeatherSource
  origin: HomeWeatherResultOrigin
  location: CachedCoordinates | null
  resolvedAt: number
}

interface ResolveHomeMascotWeatherOptions {
  forceRefresh?: boolean
  bypassFreshCache?: boolean
  ttlMs?: number
  locationOverride?: {
    latitude: number
    longitude: number
  } | null
  resolveCoordinatesMode?: HomeWeatherDebugLocationMode
  mockNow?: {
    code?: string
    icon?: string | null
    text?: string | null
  } | null
  debugScenario?: HomeWeatherDebugScenario
}

const IS_DEV = import.meta.env.DEV
const QWEATHER_API_KEY = import.meta.env.VITE_QWEATHER_API_KEY?.trim() ?? ''
const QWEATHER_API_HOST_RAW = import.meta.env.VITE_QWEATHER_API_HOST?.trim() ?? ''
const QWEATHER_NOW_ENDPOINT = '/v7/weather/now'

const HOME_WEATHER_CACHE_KEY = 'home-mascot-weather-cache-v1'
const HOME_COORDS_CACHE_KEY = 'home-mascot-coords-cache-v1'
export const HOME_WEATHER_CACHE_TTL_MS = 25 * 60 * 1000
const HOME_WEATHER_DEBUG_WARNED_KEYS = {
  missingApiKey: false,
  missingApiHost: false,
  configSnapshot: false,
}

export function hasHomeWeatherApiKey() {
  return Boolean(QWEATHER_API_KEY)
}

function normalizeQWeatherHost(input: string) {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const parsed = new URL(withProtocol)
    if (!parsed.host) {
      return null
    }

    return parsed.host
  } catch {
    return null
  }
}

const QWEATHER_API_HOST = normalizeQWeatherHost(QWEATHER_API_HOST_RAW)

export function hasHomeWeatherApiHost() {
  return Boolean(QWEATHER_API_HOST)
}

function canRequestQWeatherNow() {
  return hasHomeWeatherApiKey() && hasHomeWeatherApiHost()
}

const DEFAULT_WEATHER_RESULT: HomeMascotWeatherResult = {
  mascotWeather: 'sunny',
  icon: null,
  text: null,
  source: 'fallback',
  origin: 'fallback',
  location: null,
  resolvedAt: 0,
}

function parseFiniteNumber(value: unknown, fallback: number) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function normalizeCoordinates(input: unknown): CachedCoordinates | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const record = input as Partial<Record<keyof CachedCoordinates, unknown>>
  const latitude = parseFiniteNumber(record.latitude, NaN)
  const longitude = parseFiniteNumber(record.longitude, NaN)
  const updatedAt = parseFiniteNumber(record.updatedAt, NaN)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(updatedAt)) {
    return null
  }

  return {
    latitude,
    longitude,
    updatedAt,
  }
}

function normalizeCachedWeather(input: unknown): CachedWeather | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const record = input as Partial<Record<keyof CachedWeather, unknown>>
  const mascotWeather: HomeMascotWeather = record.mascotWeather === 'rainy' ? 'rainy' : 'sunny'
  const icon = typeof record.icon === 'string' && record.icon.trim().length > 0 ? record.icon.trim() : null
  const text = typeof record.text === 'string' && record.text.trim().length > 0 ? record.text.trim() : null
  const location = normalizeCoordinates(record.location)
  const updatedAt = parseFiniteNumber(record.updatedAt, NaN)

  if (!Number.isFinite(updatedAt)) {
    return null
  }

  return {
    mascotWeather,
    icon,
    text,
    location,
    updatedAt,
  }
}

function loadFromStorage<T>(key: string, normalize: (value: unknown) => T | null): T | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    return normalize(parsed)
  } catch {
    return null
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore local storage errors
  }
}

function loadCachedCoordinates() {
  return loadFromStorage(HOME_COORDS_CACHE_KEY, normalizeCoordinates)
}

function saveCachedCoordinates(coords: CachedCoordinates) {
  saveToStorage(HOME_COORDS_CACHE_KEY, coords)
}

function loadCachedWeather() {
  return loadFromStorage(HOME_WEATHER_CACHE_KEY, normalizeCachedWeather)
}

function saveCachedWeather(weather: CachedWeather) {
  saveToStorage(HOME_WEATHER_CACHE_KEY, weather)
}

export function clearHomeWeatherCache() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(HOME_WEATHER_CACHE_KEY)
    window.localStorage.removeItem(HOME_COORDS_CACHE_KEY)
  } catch {
    // ignore local storage errors
  }
}

function devWeatherLog(event: string, payload: Record<string, unknown>) {
  if (!IS_DEV) {
    return
  }

  console.debug(`[home-weather] ${event}`, payload)
}

function warnMissingApiKeyOnce() {
  if (!IS_DEV || QWEATHER_API_KEY) {
    return
  }

  if (HOME_WEATHER_DEBUG_WARNED_KEYS.missingApiKey) {
    return
  }

  HOME_WEATHER_DEBUG_WARNED_KEYS.missingApiKey = true
  console.warn('[home-weather] VITE_QWEATHER_API_KEY is missing. Using cache/fallback only.')
}

function warnMissingApiHostOnce() {
  if (!IS_DEV || QWEATHER_API_HOST) {
    return
  }

  if (HOME_WEATHER_DEBUG_WARNED_KEYS.missingApiHost) {
    return
  }

  HOME_WEATHER_DEBUG_WARNED_KEYS.missingApiHost = true
  console.warn('[home-weather] VITE_QWEATHER_API_HOST is missing or invalid. Using cache/fallback only.')
}

function logQWeatherConfigSnapshotOnce() {
  if (!IS_DEV || HOME_WEATHER_DEBUG_WARNED_KEYS.configSnapshot) {
    return
  }

  HOME_WEATHER_DEBUG_WARNED_KEYS.configSnapshot = true
  devWeatherLog('config:snapshot', {
    hasApiKey: hasHomeWeatherApiKey(),
    hasApiHost: hasHomeWeatherApiHost(),
    endpoint: QWEATHER_NOW_ENDPOINT,
    canRequestRealWeather: canRequestQWeatherNow(),
  })
}

export function loadCachedHomeMascotWeather(): HomeMascotWeatherResult | null {
  const cached = loadCachedWeather()

  if (!cached) {
    return null
  }

  return {
    mascotWeather: cached.mascotWeather,
    icon: cached.icon,
    text: cached.text,
    location: cached.location,
    source: 'cache',
    origin: 'cache',
    resolvedAt: cached.updatedAt,
  }
}

function isFresh(timestamp: number, ttlMs: number) {
  if (!Number.isFinite(timestamp)) {
    return false
  }

  return Date.now() - timestamp <= ttlMs
}

export function mapQWeatherIconToHomeMascot(icon: string | null): HomeMascotWeather {
  if (!icon) {
    return 'sunny'
  }

  const code = Number(icon)

  if (!Number.isFinite(code)) {
    return 'sunny'
  }

  if ((code >= 300 && code <= 399) || (code >= 400 && code <= 499)) {
    return 'rainy'
  }

  return 'sunny'
}

function normalizeText(text: string | null | undefined) {
  return typeof text === 'string' ? text.trim().toLowerCase() : ''
}

function isRainyWeatherText(text: string) {
  return (
    /rain|shower|storm|drizzle|thunder|sleet|downpour|hail/.test(text) ||
    /雨|阵雨|雷阵雨|雷雨|暴雨|大雨|中雨|小雨|毛毛雨|雨夹雪|冻雨|冰雨|雪|冰雹/.test(text)
  )
}

function isSunnyWeatherText(text: string) {
  return /sunny|clear|fair|晴|少云|多云/.test(text)
}

export interface QWeatherNowSignal {
  code?: string | number | null
  icon?: string | null
  text?: string | null
}

export interface QWeatherClassification {
  mascotWeather: HomeMascotWeather
  weatherKind: HomeWeatherResultKind
  matchedBy: 'code' | 'text' | 'fallback'
  normalizedCode: string | null
  normalizedText: string | null
}

interface HomeWeatherCacheDecisionInput {
  now: number
  cachedUpdatedAt: number | null
  ttlMs: number
  forceRefresh?: boolean
  bypassFreshCache?: boolean
}

export function classifyQWeatherNow(input: QWeatherNowSignal): QWeatherClassification {
  const normalizedCode = input.code === null || input.code === undefined ? null : String(input.code).trim()
  const normalizedIcon = typeof input.icon === 'string' ? input.icon.trim() : ''
  const normalizedText = normalizeText(input.text)
  const iconCode = Number((normalizedIcon || normalizedCode || '').trim())

  if (Number.isFinite(iconCode)) {
    if ((iconCode >= 300 && iconCode <= 399) || (iconCode >= 400 && iconCode <= 499)) {
      return {
        mascotWeather: 'rainy',
        weatherKind: 'rainy',
        matchedBy: 'code',
        normalizedCode,
        normalizedText: input.text?.trim() ?? null,
      }
    }

    if (iconCode === 100 || iconCode === 150) {
      return {
        mascotWeather: 'sunny',
        weatherKind: 'sunny',
        matchedBy: 'code',
        normalizedCode,
        normalizedText: input.text?.trim() ?? null,
      }
    }
  }

  if (normalizedText) {
    if (isRainyWeatherText(normalizedText)) {
      return {
        mascotWeather: 'rainy',
        weatherKind: 'rainy',
        matchedBy: 'text',
        normalizedCode,
        normalizedText: input.text?.trim() ?? null,
      }
    }

    if (isSunnyWeatherText(normalizedText)) {
      return {
        mascotWeather: 'sunny',
        weatherKind: 'sunny',
        matchedBy: 'text',
        normalizedCode,
        normalizedText: input.text?.trim() ?? null,
      }
    }
  }

  return {
    mascotWeather: 'sunny',
    weatherKind: 'fallback',
    matchedBy: 'fallback',
    normalizedCode,
    normalizedText: input.text?.trim() ?? null,
  }
}

export function decideHomeWeatherCacheUsage(input: HomeWeatherCacheDecisionInput) {
  if (input.forceRefresh || input.bypassFreshCache) {
    return false
  }

  if (input.cachedUpdatedAt === null || !Number.isFinite(input.cachedUpdatedAt)) {
    return false
  }

  return input.now - input.cachedUpdatedAt <= input.ttlMs
}

export function shouldSkipHomeWeatherNetworkRequest(options: {
  hasApiKey: boolean
  hasApiHost: boolean
  debugScenario: HomeWeatherDebugScenario
  hasMockNow: boolean
}) {
  if ((!options.hasApiKey || !options.hasApiHost) && options.debugScenario === 'none' && !options.hasMockNow) {
    return true
  }

  return false
}

export function runHomeWeatherSelfChecks() {
  const now = Date.now()
  const checks = [
    {
      name: 'rainy-icon',
      passed: classifyQWeatherNow({ icon: '302', text: '雷阵雨' }).mascotWeather === 'rainy',
    },
    {
      name: 'rainy-text',
      passed: classifyQWeatherNow({ icon: null, text: 'light drizzle' }).mascotWeather === 'rainy',
    },
    {
      name: 'sunny-text',
      passed: classifyQWeatherNow({ icon: '100', text: 'clear sky' }).mascotWeather === 'sunny',
    },
    {
      name: 'unknown-fallback',
      passed: classifyQWeatherNow({ icon: '999', text: '未知天气' }).weatherKind === 'fallback',
    },
    {
      name: 'cache-fresh-hit',
      passed: decideHomeWeatherCacheUsage({
        now,
        cachedUpdatedAt: now - 60 * 1000,
        ttlMs: HOME_WEATHER_CACHE_TTL_MS,
        forceRefresh: false,
        bypassFreshCache: false,
      }),
    },
    {
      name: 'cache-expired-refresh',
      passed:
        decideHomeWeatherCacheUsage({
          now,
          cachedUpdatedAt: now - (HOME_WEATHER_CACHE_TTL_MS + 1000),
          ttlMs: HOME_WEATHER_CACHE_TTL_MS,
          forceRefresh: false,
          bypassFreshCache: false,
        }) === false,
    },
    {
      name: 'missing-key-skip-network',
      passed: shouldSkipHomeWeatherNetworkRequest({
        hasApiKey: false,
        hasApiHost: true,
        debugScenario: 'none',
        hasMockNow: false,
      }),
    },
    {
      name: 'missing-host-skip-network',
      passed: shouldSkipHomeWeatherNetworkRequest({
        hasApiKey: true,
        hasApiHost: false,
        debugScenario: 'none',
        hasMockNow: false,
      }),
    },
    {
      name: 'debug-mock-allows-without-key',
      passed:
        shouldSkipHomeWeatherNetworkRequest({
          hasApiKey: false,
          hasApiHost: false,
          debugScenario: 'rainy',
          hasMockNow: false,
        }) === false,
    },
  ]

  if (IS_DEV) {
    console.debug('[home-weather] self-checks', checks)
  }

  return checks
}

function getCurrentPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function resolveCoordinates(mode: HomeWeatherDebugLocationMode, override: CachedCoordinates | null) {
  const cachedCoordinates = loadCachedCoordinates()

  if (mode === 'override-only') {
    return override ?? cachedCoordinates
  }

  if (mode === 'cache-only') {
    return cachedCoordinates
  }

  if (mode === 'device-denied') {
    devWeatherLog('location:debug-denied', {
      mode,
      hasCachedCoordinates: Boolean(cachedCoordinates),
    })

    return cachedCoordinates
  }

  if (mode === 'device-fail') {
    devWeatherLog('location:debug-fail', {
      mode,
      hasCachedCoordinates: Boolean(cachedCoordinates),
    })

    return cachedCoordinates
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    devWeatherLog('location:unsupported', {
      mode,
      hasCachedCoordinates: Boolean(cachedCoordinates),
    })
    return cachedCoordinates
  }

  const permissionSnapshot = await checkAppPermission('location')
  devWeatherLog('location:permission', {
    mode,
    state: permissionSnapshot.state,
  })

  if (permissionSnapshot.state !== 'granted') {
    devWeatherLog('location:permission-not-granted', {
      mode,
      state: permissionSnapshot.state,
      hasCachedCoordinates: Boolean(cachedCoordinates),
    })
    return cachedCoordinates
  }

  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 10 * 60 * 1000,
    })

    const coords: CachedCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      updatedAt: Date.now(),
    }

    saveCachedCoordinates(coords)
    devWeatherLog('location:resolved', {
      mode,
      latitude: coords.latitude,
      longitude: coords.longitude,
      source: 'device-first',
    })
    return coords
  } catch {
    devWeatherLog('location:failed', {
      mode,
      hasCachedCoordinates: Boolean(cachedCoordinates),
    })
    return cachedCoordinates
  }
}

interface QWeatherNowResponse {
  code?: string
  now?: {
    icon?: string
    text?: string
  }
}

async function fetchQWeatherNow(coords: CachedCoordinates) {
  logQWeatherConfigSnapshotOnce()

  if (!QWEATHER_API_KEY) {
    warnMissingApiKeyOnce()
    return null
  }

  if (!QWEATHER_API_HOST) {
    warnMissingApiHostOnce()
    return null
  }

  const location = `${coords.longitude.toFixed(2)},${coords.latitude.toFixed(2)}`
  const requestUrl = new URL(QWEATHER_NOW_ENDPOINT, `https://${QWEATHER_API_HOST}`)
  requestUrl.searchParams.set('location', location)
  requestUrl.searchParams.set('lang', 'zh')
  requestUrl.searchParams.set('key', QWEATHER_API_KEY)

  let response: Response

  try {
    response = await fetch(requestUrl.toString(), {
      method: 'GET',
      headers: {
        'X-QW-Api-Key': QWEATHER_API_KEY,
      },
    })
  } catch {
    devWeatherLog('weather:network-error', {
      hasApiKey: Boolean(QWEATHER_API_KEY),
      hasApiHost: Boolean(QWEATHER_API_HOST),
      endpoint: QWEATHER_NOW_ENDPOINT,
      location,
    })
    return null
  }

  if (!response.ok) {
    devWeatherLog('weather:http-error', {
      status: response.status,
      hasApiKey: Boolean(QWEATHER_API_KEY),
      hasApiHost: Boolean(QWEATHER_API_HOST),
      endpoint: QWEATHER_NOW_ENDPOINT,
      location,
    })
    return null
  }

  let payload: QWeatherNowResponse

  try {
    payload = (await response.json()) as QWeatherNowResponse
  } catch {
    devWeatherLog('weather:parse-error', {
      hasApiKey: Boolean(QWEATHER_API_KEY),
      hasApiHost: Boolean(QWEATHER_API_HOST),
      endpoint: QWEATHER_NOW_ENDPOINT,
      location,
    })
    return null
  }

  if (payload.code !== '200' || !payload.now) {
    devWeatherLog('weather:invalid-payload', {
      code: payload.code ?? null,
      hasApiKey: Boolean(QWEATHER_API_KEY),
      hasApiHost: Boolean(QWEATHER_API_HOST),
      endpoint: QWEATHER_NOW_ENDPOINT,
      location,
    })
    return null
  }

  const icon = typeof payload.now.icon === 'string' && payload.now.icon.trim().length > 0
    ? payload.now.icon.trim()
    : null
  const text = typeof payload.now.text === 'string' && payload.now.text.trim().length > 0
    ? payload.now.text.trim()
    : null
  const classification = classifyQWeatherNow({
    code: payload.code ?? null,
    icon,
    text,
  })

  const result = {
    icon,
    text,
    mascotWeather: classification.mascotWeather,
  }

  devWeatherLog('weather:resolved', {
    hasApiKey: Boolean(QWEATHER_API_KEY),
    hasApiHost: Boolean(QWEATHER_API_HOST),
    endpoint: QWEATHER_NOW_ENDPOINT,
    location,
    code: payload.code ?? null,
    icon: result.icon,
    text: result.text,
    mascotWeather: result.mascotWeather,
    classification,
  })

  return result
}

export async function resolveHomeMascotWeather(
  options: ResolveHomeMascotWeatherOptions = {},
): Promise<HomeMascotWeatherResult> {
  logQWeatherConfigSnapshotOnce()

  const ttlMs = options.ttlMs ?? HOME_WEATHER_CACHE_TTL_MS
  const cachedWeather = loadCachedWeather()
  const weatherScenario = options.debugScenario ?? 'none'
  const resolveMode = options.resolveCoordinatesMode ?? 'device-first'

  devWeatherLog('resolve:start', {
    hasApiKey: hasHomeWeatherApiKey(),
    hasApiHost: hasHomeWeatherApiHost(),
    endpoint: QWEATHER_NOW_ENDPOINT,
    canRequestRealWeather: canRequestQWeatherNow(),
    ttlMs,
    forceRefresh: Boolean(options.forceRefresh),
    bypassFreshCache: Boolean(options.bypassFreshCache),
    weatherScenario,
    resolveMode,
    hasCachedWeather: Boolean(cachedWeather),
  })

  const useCache = decideHomeWeatherCacheUsage({
    now: Date.now(),
    cachedUpdatedAt: cachedWeather?.updatedAt ?? null,
    ttlMs,
    forceRefresh: options.forceRefresh,
    bypassFreshCache: options.bypassFreshCache,
  })

  if (useCache && cachedWeather && isFresh(cachedWeather.updatedAt, ttlMs)) {
    devWeatherLog('resolve:cache-hit', {
      source: 'cache',
      mascotWeather: cachedWeather.mascotWeather,
      text: cachedWeather.text,
      icon: cachedWeather.icon,
    })

    return {
      mascotWeather: cachedWeather.mascotWeather,
      icon: cachedWeather.icon,
      text: cachedWeather.text,
      location: cachedWeather.location,
      source: 'cache',
      origin: 'cache',
      resolvedAt: cachedWeather.updatedAt,
    } satisfies HomeMascotWeatherResult
  }

  if (
    shouldSkipHomeWeatherNetworkRequest({
      hasApiKey: hasHomeWeatherApiKey(),
      hasApiHost: hasHomeWeatherApiHost(),
      debugScenario: weatherScenario,
      hasMockNow: Boolean(options.mockNow),
    })
  ) {
    warnMissingApiKeyOnce()
    warnMissingApiHostOnce()

    if (cachedWeather) {
      devWeatherLog('resolve:no-key-use-cache', {
        source: 'cache',
        mascotWeather: cachedWeather.mascotWeather,
        text: cachedWeather.text,
        icon: cachedWeather.icon,
      })

      return {
        mascotWeather: cachedWeather.mascotWeather,
        icon: cachedWeather.icon,
        text: cachedWeather.text,
        location: cachedWeather.location,
        source: 'cache',
        origin: 'cache',
        resolvedAt: cachedWeather.updatedAt,
      } satisfies HomeMascotWeatherResult
    }

    devWeatherLog('resolve:no-key-fallback', {
      source: 'fallback',
      hasCachedWeather: false,
    })

    return {
      ...DEFAULT_WEATHER_RESULT,
      resolvedAt: Date.now(),
    }
  }

  const coordsFromOverride = options.locationOverride
    ? {
        latitude: options.locationOverride.latitude,
        longitude: options.locationOverride.longitude,
        updatedAt: Date.now(),
      }
    : null
  const coords =
    coordsFromOverride ?? (await resolveCoordinates(resolveMode, coordsFromOverride))

  devWeatherLog('resolve:coords', {
    resolveMode,
    hasCoords: Boolean(coords),
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  })

  if (!coords) {
    if (cachedWeather) {
      devWeatherLog('resolve:no-coords-use-cache', {
        source: 'cache',
        mascotWeather: cachedWeather.mascotWeather,
        text: cachedWeather.text,
        icon: cachedWeather.icon,
      })

      return {
        mascotWeather: cachedWeather.mascotWeather,
        icon: cachedWeather.icon,
        text: cachedWeather.text,
        location: cachedWeather.location,
        source: 'cache',
        origin: 'cache',
        resolvedAt: cachedWeather.updatedAt,
      } satisfies HomeMascotWeatherResult
    }

    return {
      ...DEFAULT_WEATHER_RESULT,
      origin: 'fallback',
      resolvedAt: Date.now(),
    }
  }

  const mockedByScenario =
    weatherScenario === 'rainy'
      ? { icon: '302', text: '雷阵雨', mascotWeather: 'rainy' as const }
      : weatherScenario === 'sunny'
        ? { icon: '100', text: '晴', mascotWeather: 'sunny' as const }
        : weatherScenario === 'http-error'
          ? null
          : weatherScenario === 'timeout'
            ? null
            : null
  const mockedNow = options.mockNow
    ? {
      icon: options.mockNow.icon ?? null,
      text: options.mockNow.text ?? null,
      mascotWeather: classifyQWeatherNow({ icon: options.mockNow.icon ?? null, text: options.mockNow.text ?? null }).mascotWeather,
      }
    : mockedByScenario

  if (weatherScenario === 'http-error' || weatherScenario === 'timeout') {
    if (cachedWeather) {
      devWeatherLog('resolve:mock-error-use-cache', {
        weatherScenario,
        source: 'cache',
        mascotWeather: cachedWeather.mascotWeather,
      })

      return {
        mascotWeather: cachedWeather.mascotWeather,
        icon: cachedWeather.icon,
        text: cachedWeather.text,
        location: cachedWeather.location,
        source: 'cache',
        origin: 'cache',
        resolvedAt: cachedWeather.updatedAt,
      } satisfies HomeMascotWeatherResult
    }

    return {
      ...DEFAULT_WEATHER_RESULT,
      location: coords,
      origin: 'fallback',
      resolvedAt: Date.now(),
    }
  }

  const now = mockedNow ?? (await fetchQWeatherNow(coords))

  if (!now) {
    if (cachedWeather) {
      devWeatherLog('resolve:weather-failed-use-cache', {
        source: 'cache',
        mascotWeather: cachedWeather.mascotWeather,
        text: cachedWeather.text,
        icon: cachedWeather.icon,
      })

      return {
        mascotWeather: cachedWeather.mascotWeather,
        icon: cachedWeather.icon,
        text: cachedWeather.text,
        location: cachedWeather.location,
        source: 'cache',
        origin: 'cache',
        resolvedAt: cachedWeather.updatedAt,
      } satisfies HomeMascotWeatherResult
    }

    devWeatherLog('resolve:weather-failed-fallback', {
      source: 'fallback',
      hasCachedWeather: false,
      weatherScenario,
    })

    return {
      ...DEFAULT_WEATHER_RESULT,
      location: coords,
      origin: 'fallback',
      resolvedAt: Date.now(),
    }
  }

  const classification = classifyQWeatherNow({
    code: options.mockNow?.code ?? null,
    icon: now.icon,
    text: now.text,
  })
  const savedAt = Date.now()
  const sourceOrigin: HomeWeatherResultOrigin =
    options.mockNow || weatherScenario !== 'none' ? 'debug-mock' : 'real-api'
  const snapshot: CachedWeather = {
    mascotWeather: classification.mascotWeather,
    icon: now.icon,
    text: now.text,
    location: coords,
    updatedAt: savedAt,
  }

  if (sourceOrigin === 'real-api') {
    saveCachedWeather(snapshot)
  } else {
    devWeatherLog('resolve:skip-cache-persist', {
      source: sourceOrigin,
      weatherScenario,
      mascotWeather: snapshot.mascotWeather,
      icon: snapshot.icon,
      text: snapshot.text,
    })
  }
  devWeatherLog('resolve:weather-success', {
    source: sourceOrigin,
    rawIcon: now.icon,
    rawText: now.text,
    classification,
    cached: true,
  })

  return {
    mascotWeather: snapshot.mascotWeather,
    icon: snapshot.icon,
    text: snapshot.text,
    location: snapshot.location,
    source: 'network',
    origin: sourceOrigin,
    resolvedAt: snapshot.updatedAt,
  } satisfies HomeMascotWeatherResult
}
