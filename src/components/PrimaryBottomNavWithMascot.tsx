import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { getRuntimePlatform, isNativeApp } from '../platform/runtime'
import {
  clearHomeWeatherCache,
  hasHomeWeatherApiKey,
  HOME_WEATHER_CACHE_TTL_MS,
  loadCachedHomeMascotWeather,
  resolveHomeMascotWeather,
  runHomeWeatherSelfChecks,
  type HomeWeatherDebugLocationMode,
  type HomeWeatherDebugScenario,
  type HomeMascotWeather,
  type HomeMascotWeatherResult,
  type HomeWeatherResultOrigin,
} from '../services/homeWeatherService'
import { PrimaryBottomNav, type PrimaryBottomNavTab } from './PrimaryBottomNav'
import styles from './PrimaryBottomNavWithMascot.module.css'

interface PrimaryBottomNavWithMascotProps {
  activeTab: PrimaryBottomNavTab
  onGoMy: () => void
  onGoHome: () => void
  onGoCircle: () => void
  showMascot: boolean
}

type HomeMascotVideoId = 'rainy' | 'sunny'

interface HomeMascotVideoFallbackState {
  baseVideoId: HomeMascotWeather
  fallbackVideoId: HomeMascotWeather
}

interface HomeMascotDebugState {
  mode: 'auto' | 'manual'
  manualScenario: HomeWeatherDebugScenario
  requestLocationMode: HomeWeatherDebugLocationMode
  overrideLatitude: number
  overrideLongitude: number
  forceRefresh: boolean
  sizePercent: number
  offsetX: number
  offsetY: number
}

const HOME_MASCOT_DEBUG_STORAGE_KEY = 'home-loop-video-debug-v1'
const WEATHER_REFRESH_MIN_INTERVAL_MS = HOME_WEATHER_CACHE_TTL_MS
const IS_DEV = import.meta.env.DEV

const HOME_MASCOT_VIDEO_OPTIONS = [
  {
    id: 'rainy' as const,
    label: '小猫视频1（雨天）',
    src: '/media/home-mascot-rainy-web.mp4',
    iosNativeSrc: '/media/home-mascot-rainy-ios.mov',
  },
  {
    id: 'sunny' as const,
    label: '小猫视频2（晴天）',
    src: '/media/home-mascot-sunny-web.mp4',
    iosNativeSrc: '/media/home-mascot-sunny-ios.mov',
  },
]

const DEFAULT_HOME_MASCOT_DEBUG_STATE: HomeMascotDebugState = {
  mode: 'auto',
  manualScenario: 'none',
  requestLocationMode: 'device-first',
  overrideLatitude: 31.2304,
  overrideLongitude: 121.4737,
  forceRefresh: false,
  sizePercent: 100,
  offsetX: 0,
  offsetY: 0,
}

function loadInitialHomeMascotDebugState() {
  if (typeof window === 'undefined') {
    return DEFAULT_HOME_MASCOT_DEBUG_STATE
  }

  try {
    const raw = window.localStorage.getItem(HOME_MASCOT_DEBUG_STORAGE_KEY)

    if (!raw) {
      return DEFAULT_HOME_MASCOT_DEBUG_STATE
    }

    const parsed = JSON.parse(raw)
    return normalizeHomeMascotDebugState(parsed)
  } catch {
    return DEFAULT_HOME_MASCOT_DEBUG_STATE
  }
}

function parseFiniteNumber(value: unknown, fallback: number) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHomeMascotDebugState(input: unknown): HomeMascotDebugState {
  if (!input || typeof input !== 'object') {
    return DEFAULT_HOME_MASCOT_DEBUG_STATE
  }

  const state = input as Partial<Record<keyof HomeMascotDebugState, unknown>>
  const mode = state.mode === 'manual' ? 'manual' : 'auto'
  const manualScenario: HomeWeatherDebugScenario =
    state.manualScenario === 'rainy' ||
    state.manualScenario === 'sunny' ||
    state.manualScenario === 'http-error' ||
    state.manualScenario === 'timeout'
      ? state.manualScenario
      : 'none'
  const requestLocationMode =
    state.requestLocationMode === 'cache-only' ||
    state.requestLocationMode === 'override-only' ||
    state.requestLocationMode === 'device-fail' ||
    state.requestLocationMode === 'device-denied'
      ? state.requestLocationMode
      : 'device-first'
  const overrideLatitude = clampNumber(
    parseFiniteNumber(state.overrideLatitude, DEFAULT_HOME_MASCOT_DEBUG_STATE.overrideLatitude),
    -90,
    90,
  )
  const overrideLongitude = clampNumber(
    parseFiniteNumber(state.overrideLongitude, DEFAULT_HOME_MASCOT_DEBUG_STATE.overrideLongitude),
    -180,
    180,
  )
  const forceRefresh = state.forceRefresh === true
  const sizePercent = Math.round(
    clampNumber(
      parseFiniteNumber(state.sizePercent, DEFAULT_HOME_MASCOT_DEBUG_STATE.sizePercent),
      70,
      150,
    ),
  )
  const offsetX = Math.round(
    clampNumber(parseFiniteNumber(state.offsetX, DEFAULT_HOME_MASCOT_DEBUG_STATE.offsetX), -120, 120),
  )
  const offsetY = Math.round(
    clampNumber(parseFiniteNumber(state.offsetY, DEFAULT_HOME_MASCOT_DEBUG_STATE.offsetY), -120, 120),
  )

  return {
    mode,
    manualScenario,
    requestLocationMode,
    overrideLatitude,
    overrideLongitude,
    forceRefresh,
    sizePercent,
    offsetX,
    offsetY,
  }
}

function describeWeatherResult(result: HomeMascotWeatherResult) {
  const weatherText = result.text ?? (result.mascotWeather === 'rainy' ? '降水' : '晴/多云')
  const originLabel =
    result.origin === 'real-api'
      ? '实时'
      : result.origin === 'cache'
        ? '缓存'
        : result.origin === 'debug-mock'
          ? '调试模拟'
          : '回退'

  return `天气: ${weatherText}（${originLabel}）`
}

export function PrimaryBottomNavWithMascot({
  activeTab,
  onGoMy,
  onGoHome,
  onGoCircle,
  showMascot,
}: PrimaryBottomNavWithMascotProps) {
  const initialCachedWeather = useMemo(() => loadCachedHomeMascotWeather(), [])
  const [debugOpen, setDebugOpen] = useState(false)
  const [debugState, setDebugState] = useState<HomeMascotDebugState>(() =>
    loadInitialHomeMascotDebugState(),
  )
  const [weatherVideoId, setWeatherVideoId] = useState<HomeMascotVideoId>(
    initialCachedWeather?.mascotWeather ?? 'sunny',
  )
  const [weatherLabel, setWeatherLabel] = useState(
    initialCachedWeather
      ? `天气: ${initialCachedWeather.text ?? (initialCachedWeather.mascotWeather === 'rainy' ? '降水' : '晴/多云')}（缓存）`
      : '天气: 默认晴天',
  )
  const [weatherResolvedAt, setWeatherResolvedAt] = useState(initialCachedWeather?.resolvedAt ?? 0)
  const [weatherOrigin, setWeatherOrigin] = useState<HomeWeatherResultOrigin>(
    initialCachedWeather?.origin ?? 'fallback',
  )
  const [weatherSource, setWeatherSource] = useState(initialCachedWeather?.source ?? 'fallback')
  const [videoFallbackSource, setVideoFallbackSource] = useState<HomeMascotVideoFallbackState | null>(null)
  const weatherResolvedAtRef = useRef(initialCachedWeather?.resolvedAt ?? 0)
  const weatherRefreshRunIdRef = useRef(0)
  const weatherRequestInFlightRef = useRef<{
    key: string
    requestId: number
    promise: Promise<HomeMascotWeatherResult>
  } | null>(null)
  const backgroundRefreshQueuedAtRef = useRef<number | null>(null)
  const refreshWeatherRef = useRef<
    ((options: { forceRefresh: boolean; bypassFreshCache: boolean }) => Promise<void>) | null
  >(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const isIosNativeRuntime = useMemo(() => {
    const runtimePlatform = getRuntimePlatform()
    return runtimePlatform === 'ios' && isNativeApp()
  }, [])
  const hasApiKey = useMemo(() => hasHomeWeatherApiKey(), [])

  useEffect(() => {
    runHomeWeatherSelfChecks()
  }, [])

  useEffect(() => {
    weatherResolvedAtRef.current = weatherResolvedAt
  }, [weatherResolvedAt])

  const startWeatherRequest = useCallback(
    ({
      forceRefresh,
      bypassFreshCache,
    }: {
      forceRefresh: boolean
      bypassFreshCache: boolean
    }) => {
      const isManualMode = debugState.mode === 'manual'
      const shouldUseOverrideCoordinates =
        isManualMode && debugState.requestLocationMode === 'override-only'
      const requestKey = JSON.stringify({
        mode: debugState.mode,
        forceRefresh: debugState.forceRefresh || forceRefresh,
        bypassFreshCache,
        manualScenario: isManualMode ? debugState.manualScenario : 'none',
        requestLocationMode: isManualMode ? debugState.requestLocationMode : 'device-first',
        overrideLatitude: shouldUseOverrideCoordinates ? debugState.overrideLatitude : null,
        overrideLongitude: shouldUseOverrideCoordinates ? debugState.overrideLongitude : null,
      })

      const existing = weatherRequestInFlightRef.current
      if (existing?.key === requestKey) {
        if (IS_DEV) {
          console.debug('[home-weather-ui] dedupe-weather-request', {
            requestId: existing.requestId,
            mode: debugState.mode,
            forceRefresh: debugState.forceRefresh || forceRefresh,
            bypassFreshCache,
          })
        }
        return existing
      }

      const requestId = ++weatherRefreshRunIdRef.current
      const promise = resolveHomeMascotWeather({
        forceRefresh: debugState.forceRefresh || forceRefresh,
        bypassFreshCache,
        ttlMs: HOME_WEATHER_CACHE_TTL_MS,
        debugScenario: isManualMode ? debugState.manualScenario : 'none',
        resolveCoordinatesMode: isManualMode ? debugState.requestLocationMode : 'device-first',
        locationOverride: shouldUseOverrideCoordinates
          ? {
              latitude: debugState.overrideLatitude,
              longitude: debugState.overrideLongitude,
            }
          : null,
      }).finally(() => {
        if (weatherRequestInFlightRef.current?.requestId === requestId) {
          weatherRequestInFlightRef.current = null
        }
      })

      const request = {
        key: requestKey,
        requestId,
        promise,
      }

      weatherRequestInFlightRef.current = request
      return request
    },
    [
      debugState.forceRefresh,
      debugState.manualScenario,
      debugState.mode,
      debugState.overrideLatitude,
      debugState.overrideLongitude,
      debugState.requestLocationMode,
    ],
  )

  const refreshWeather = useCallback(
    async ({
      forceRefresh,
      bypassFreshCache,
    }: {
      forceRefresh: boolean
      bypassFreshCache: boolean
    }) => {
      const request = startWeatherRequest({
        forceRefresh,
        bypassFreshCache,
      })

      let result: HomeMascotWeatherResult

      try {
        result = await request.promise
      } catch (error) {
        if (IS_DEV) {
          console.warn('[home-weather-ui] weather-request-failed', {
            error: error instanceof Error ? error.message : String(error),
            mode: debugState.mode,
          })
        }
        return
      }

      if (request.requestId !== weatherRefreshRunIdRef.current) {
        return
      }

      const nextLabel = describeWeatherResult(result)

      setWeatherVideoId((previous) => (previous === result.mascotWeather ? previous : result.mascotWeather))
      setWeatherResolvedAt((previous) => (previous === result.resolvedAt ? previous : result.resolvedAt))
      setWeatherOrigin((previous) => (previous === result.origin ? previous : result.origin))
      setWeatherSource((previous) => (previous === result.source ? previous : result.source))
      weatherResolvedAtRef.current = result.resolvedAt
      setWeatherLabel((previous) => (previous === nextLabel ? previous : nextLabel))

      if (result.source !== 'cache' || result.origin !== 'cache') {
        backgroundRefreshQueuedAtRef.current = null
      }

      if (
        debugState.mode === 'auto' &&
        hasApiKey &&
        !forceRefresh &&
        !bypassFreshCache &&
        result.source === 'cache' &&
        result.origin === 'cache' &&
        backgroundRefreshQueuedAtRef.current !== result.resolvedAt
      ) {
        backgroundRefreshQueuedAtRef.current = result.resolvedAt
        window.setTimeout(() => {
          const nextRefresh = refreshWeatherRef.current

          if (nextRefresh) {
            void nextRefresh({
              forceRefresh: true,
              bypassFreshCache: true,
            })
          }
        }, 0)
      }

      if (IS_DEV) {
        const selectedVideo =
          HOME_MASCOT_VIDEO_OPTIONS.find((item) => item.id === result.mascotWeather) ??
          HOME_MASCOT_VIDEO_OPTIONS[0]
        const selectedSrc = isIosNativeRuntime ? selectedVideo.iosNativeSrc : selectedVideo.src
        console.debug('[home-weather-ui] weather-applied', {
          mode: debugState.mode,
          mascotWeather: result.mascotWeather,
          source: result.source,
          origin: result.origin,
          text: result.text,
          icon: result.icon,
          resolvedAt: result.resolvedAt,
          videoId: selectedVideo.id,
          videoSrc: selectedSrc,
          latitude: result.location?.latitude ?? null,
          longitude: result.location?.longitude ?? null,
        })
      }
    },
    [debugState.mode, hasApiKey, isIosNativeRuntime, startWeatherRequest],
  )

  useEffect(() => {
    refreshWeatherRef.current = refreshWeather
  }, [refreshWeather])

  useEffect(() => {
    const now = Date.now()
    const shouldForceNow =
      weatherResolvedAtRef.current <= 0 ||
      now - weatherResolvedAtRef.current > WEATHER_REFRESH_MIN_INTERVAL_MS
    const bypassFreshCache = debugState.mode === 'manual'
    const timer = window.setTimeout(() => {
      void refreshWeather({
        forceRefresh: debugState.mode === 'manual' ? true : shouldForceNow,
        bypassFreshCache,
      })
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [debugState.mode, refreshNonce, refreshWeather])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return
      }

      const visibleNow = Date.now()
      const shouldForce = visibleNow - weatherResolvedAtRef.current > WEATHER_REFRESH_MIN_INTERVAL_MS
      const bypassFreshCache = debugState.mode === 'manual'

      void refreshWeather({
        forceRefresh: bypassFreshCache ? true : shouldForce,
        bypassFreshCache,
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [debugState.mode, refreshWeather])

  const effectiveVideoId: HomeMascotWeather = weatherVideoId
  const renderedVideoId =
    videoFallbackSource && videoFallbackSource.baseVideoId === effectiveVideoId
      ? videoFallbackSource.fallbackVideoId
      : effectiveVideoId

  const activeVideo = useMemo(
    () =>
      HOME_MASCOT_VIDEO_OPTIONS.find((item) => item.id === renderedVideoId) ??
      HOME_MASCOT_VIDEO_OPTIONS[0],
    [renderedVideoId],
  )

  const activeVideoSrc = useMemo(() => {
    return isIosNativeRuntime ? activeVideo.iosNativeSrc : activeVideo.src
  }, [activeVideo, isIosNativeRuntime])

  const videoStyle = useMemo(
    () =>
      ({
        '--home-loop-scale': String(debugState.sizePercent / 100),
        '--home-loop-offset-x': `${debugState.offsetX}px`,
        '--home-loop-offset-y': `${debugState.offsetY}px`,
      }) as CSSProperties,
    [debugState.offsetX, debugState.offsetY, debugState.sizePercent],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(HOME_MASCOT_DEBUG_STORAGE_KEY, JSON.stringify(debugState))
    } catch {
      // 忽略视频调试状态写入失败。
    }
  }, [debugState])

  const patchDebugState = (patch: Partial<HomeMascotDebugState>) => {
    setDebugState((previous) => normalizeHomeMascotDebugState({ ...previous, ...patch }))
  }

  const handleClearWeatherCache = () => {
    clearHomeWeatherCache()
    setWeatherLabel('天气缓存已清除，等待重新解析')
    setWeatherResolvedAt(0)
    setWeatherOrigin('fallback')
    setWeatherSource('fallback')
    setWeatherVideoId('sunny')
    setVideoFallbackSource(null)
    weatherRequestInFlightRef.current = null
    backgroundRefreshQueuedAtRef.current = null
    weatherRefreshRunIdRef.current += 1
    setRefreshNonce((previous) => previous + 1)
  }

  const handleForceRefreshNow = () => {
    patchDebugState({ mode: 'manual', forceRefresh: true })
    setVideoFallbackSource(null)
    weatherRequestInFlightRef.current = null
    backgroundRefreshQueuedAtRef.current = null
    weatherRefreshRunIdRef.current += 1
    setRefreshNonce((previous) => previous + 1)
  }

  const locationModeOptions: Array<{ id: HomeWeatherDebugLocationMode; label: string }> = [
    { id: 'device-first', label: '设备定位' },
    { id: 'cache-only', label: '仅缓存定位' },
    { id: 'override-only', label: '固定坐标' },
    { id: 'device-fail', label: '定位失败' },
    { id: 'device-denied', label: '权限拒绝' },
  ]

  useEffect(() => {
    const videoNodes = HOME_MASCOT_VIDEO_OPTIONS.flatMap((option) => [option.src, option.iosNativeSrc])

    videoNodes.forEach((src) => {
      const preloadVideo = document.createElement('video')
      preloadVideo.preload = 'auto'
      preloadVideo.muted = true
      preloadVideo.playsInline = true
      preloadVideo.src = src
      try {
        preloadVideo.load()
      } catch {
        // ignore preload errors
      }
    })
  }, [])

  return (
    <div className={styles.root}>
      <div className={styles.debugDock}>
        <button
          type="button"
          className={styles.debugToggle}
          onClick={() => {
            setDebugOpen((previous) => !previous)
          }}
          aria-expanded={debugOpen}
          aria-controls="home-mascot-debug-panel"
        >
          {debugOpen ? '收起视频调试' : '视频调试'}
        </button>

        {debugOpen ? (
          <div id="home-mascot-debug-panel" className={styles.debugPanel}>
            <div className={styles.modeSwitch} role="tablist" aria-label="模式切换">
              <button
                type="button"
                className={`${styles.modeButton} ${debugState.mode === 'auto' ? styles.modeButtonActive : ''}`}
                onClick={() => {
                  patchDebugState({ mode: 'auto' })
                }}
                aria-pressed={debugState.mode === 'auto'}
              >
                自动天气
              </button>
              <button
                type="button"
                className={`${styles.modeButton} ${debugState.mode === 'manual' ? styles.modeButtonActive : ''}`}
                onClick={() => {
                  patchDebugState({ mode: 'manual' })
                }}
                aria-pressed={debugState.mode === 'manual'}
              >
                手动调试
              </button>
            </div>

            <p className={styles.weatherInfo}>{weatherLabel}</p>
            <p className={styles.weatherInfo}>
              来源：{weatherOrigin} / {weatherSource} / hasApiKey: {hasApiKey ? 'true' : 'false'}
            </p>
            {debugState.mode === 'manual' ? (
              <p className={styles.weatherInfo}>
                手动模式下将通过“接口参数挡板”驱动结果，不直接指定最终天气类型。
              </p>
            ) : null}

            <div className={styles.sourceSwitch} role="tablist" aria-label="视频切换">
              {[
                { id: 'none' as const, label: '真实接口' },
                { id: 'rainy' as const, label: '模拟雨天' },
                { id: 'sunny' as const, label: '模拟晴天' },
                { id: 'http-error' as const, label: '模拟接口错' },
                { id: 'timeout' as const, label: '模拟超时' },
              ].map((item) => {
                const active = item.id === debugState.manualScenario

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.sourceButton} ${active ? styles.sourceButtonActive : ''}`}
                    onClick={() => {
                      patchDebugState({ manualScenario: item.id, mode: 'manual' })
                    }}
                    aria-pressed={active}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <div className={styles.sourceSwitch} role="tablist" aria-label="定位来源">
              {locationModeOptions.map((item) => {
                const active = item.id === debugState.requestLocationMode

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.sourceButton} ${active ? styles.sourceButtonActive : ''}`}
                    onClick={() => {
                      patchDebugState({ requestLocationMode: item.id, mode: 'manual' })
                    }}
                    aria-pressed={active}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>

            <label className={styles.sliderRow}>
              <span className={styles.sliderLabel}>纬度</span>
              <input
                className={styles.slider}
                type="range"
                min={-90}
                max={90}
                step={0.01}
                value={debugState.overrideLatitude}
                onChange={(event) => {
                  patchDebugState({ overrideLatitude: Number(event.currentTarget.value), mode: 'manual' })
                }}
              />
              <span className={styles.sliderValue}>{debugState.overrideLatitude.toFixed(2)}</span>
            </label>

            <label className={styles.sliderRow}>
              <span className={styles.sliderLabel}>经度</span>
              <input
                className={styles.slider}
                type="range"
                min={-180}
                max={180}
                step={0.01}
                value={debugState.overrideLongitude}
                onChange={(event) => {
                  patchDebugState({ overrideLongitude: Number(event.currentTarget.value), mode: 'manual' })
                }}
              />
              <span className={styles.sliderValue}>{debugState.overrideLongitude.toFixed(2)}</span>
            </label>

            <button
              type="button"
              className={`${styles.resetButton} ${debugState.forceRefresh ? styles.sourceButtonActive : ''}`}
              onClick={() => {
                patchDebugState({ forceRefresh: !debugState.forceRefresh, mode: 'manual' })
              }}
            >
              强制实时请求：{debugState.forceRefresh ? '开' : '关'}
            </button>

            <button
              type="button"
              className={styles.resetButton}
              onClick={handleForceRefreshNow}
            >
              立即强制刷新
            </button>

            <button
              type="button"
              className={styles.resetButton}
              onClick={handleClearWeatherCache}
            >
              清除天气缓存
            </button>

            <label className={styles.sliderRow}>
              <span className={styles.sliderLabel}>大小</span>
              <input
                className={styles.slider}
                type="range"
                min={70}
                max={150}
                step={1}
                value={debugState.sizePercent}
                onChange={(event) => {
                  patchDebugState({ sizePercent: Number(event.currentTarget.value) })
                }}
              />
              <span className={styles.sliderValue}>{debugState.sizePercent}%</span>
            </label>

            <label className={styles.sliderRow}>
              <span className={styles.sliderLabel}>左右</span>
              <input
                className={styles.slider}
                type="range"
                min={-120}
                max={120}
                step={1}
                value={debugState.offsetX}
                onChange={(event) => {
                  patchDebugState({ offsetX: Number(event.currentTarget.value) })
                }}
              />
              <span className={styles.sliderValue}>{debugState.offsetX}px</span>
            </label>

            <label className={styles.sliderRow}>
              <span className={styles.sliderLabel}>上下</span>
              <input
                className={styles.slider}
                type="range"
                min={-120}
                max={120}
                step={1}
                value={debugState.offsetY}
                onChange={(event) => {
                  patchDebugState({ offsetY: Number(event.currentTarget.value) })
                }}
              />
              <span className={styles.sliderValue}>{debugState.offsetY}px</span>
            </label>

            <button
              type="button"
              className={styles.resetButton}
              onClick={() => {
                setDebugState(DEFAULT_HOME_MASCOT_DEBUG_STATE)
              }}
            >
              重置
            </button>
          </div>
        ) : null}
      </div>

      {showMascot ? (
        <section className={styles.mascotLayer} aria-label="占卜师猫咪动画">
          <div className={styles.mascotFrame}>
            <video
              className={`${styles.mascotVideo} ${isIosNativeRuntime ? styles.mascotVideoIosMatte : ''}`}
              src={activeVideoSrc}
              key={activeVideoSrc}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={videoStyle}
              aria-label={activeVideo.label}
              onError={() => {
                const fallbackId: HomeMascotWeather = 'sunny'
                if (renderedVideoId === fallbackId) {
                  if (IS_DEV) {
                    console.warn('[home-mascot] video-load-failed', {
                      requestedVideoId: renderedVideoId,
                      fallbackId,
                      src: activeVideoSrc,
                      runtime: isIosNativeRuntime ? 'ios-native' : 'web',
                    })
                  }
                  return
                }
                if (IS_DEV) {
                  console.warn('[home-mascot] video-load-failed-fallback', {
                    requestedVideoId: renderedVideoId,
                    fallbackId,
                    src: activeVideoSrc,
                    runtime: isIosNativeRuntime ? 'ios-native' : 'web',
                  })
                }
                setVideoFallbackSource({
                  baseVideoId: renderedVideoId,
                  fallbackVideoId: fallbackId,
                })
              }}
              onCanPlay={() => {
                if (videoFallbackSource) {
                  if (IS_DEV) {
                    console.debug('[home-mascot] video-fallback-recovered', {
                      source: videoFallbackSource.fallbackVideoId,
                      baseVideoId: videoFallbackSource.baseVideoId,
                      runtime: isIosNativeRuntime ? 'ios-native' : 'web',
                    })
                  }
                  setVideoFallbackSource(null)
                }
              }}
            />
          </div>
        </section>
      ) : null}

      <PrimaryBottomNav
        activeTab={activeTab}
        onGoMy={onGoMy}
        onGoHome={onGoHome}
        onGoCircle={onGoCircle}
      />
    </div>
  )
}
