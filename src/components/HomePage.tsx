import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type AnimationEvent as ReactAnimationEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { HOME_MENU_ITEMS, type HomeMenuItem } from '../config/homeMenu'
import {
  fetchDailyFortune,
  loadStoredZodiacSign,
  resolveDefaultZodiacSign,
  resolveTodayDateIso,
  saveStoredZodiacSign,
} from '../services/dailyFortuneApi'
import {
  ZODIAC_SIGN_LABELS,
  type DailyFortunePayload,
  type ZodiacSign,
} from '../types/dailyFortune'
import { GlassPanel } from './GlassPanel'
import styles from './HomePage.module.css'

interface HomePageProps {
  embedded?: boolean
  onOpenAiReading?: () => void
  onOpenLiveReadingDebug?: () => void
  onOpenDailyFortune?: () => void
}

interface HomeEntryCard {
  id: string
  render: () => ReactNode
}

type MenuItemStyle = CSSProperties & {
  '--item-index': number
}

function SettingsIcon() {
  return (
    <svg
      className={styles.menuToggleIcon}
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path d="M4 12L20 12" className={`${styles.menuLine} ${styles.menuLineTop}`} />
      <path d="M4 12H20" className={`${styles.menuLine} ${styles.menuLineMiddle}`} />
      <path d="M4 12H20" className={`${styles.menuLine} ${styles.menuLineBottom}`} />
    </svg>
  )
}

const LIQUID_GLASS_CARD_PRESET = {
  borderRadius: 20,
  distortionScale: -62,
  blur: 0.076,
  displace: 0.23,
  saturation: 1.16,
  redOffset: 0,
  greenOffset: 6,
  blueOffset: 12,
  opacity: 0.92,
  backgroundOpacity: 0.16,
} as const

const NETWORK_ERROR_COPY = '星讯暂时未连接，请稍后再试。'
const SERVICE_ERROR_COPY = '星盘通道正在校准，请稍后刷新。'
const UNKNOWN_ERROR_COPY = '星轨轻微波动，请稍后再试。'
const HOME_LOOP_DEBUG_STORAGE_KEY = 'home-loop-video-debug-v1'

const HOME_LOOP_VIDEO_OPTIONS = [
  {
    id: 'loop',
    label: '小猫视频 A',
    src: '/media/tarot-cat-loop.webm',
  },
  {
    id: 'mascot',
    label: '小猫视频 B',
    src: '/media/tarot-cat-mascot.webm',
  },
] as const

type HomeLoopVideoId = (typeof HOME_LOOP_VIDEO_OPTIONS)[number]['id']

interface HomeLoopDebugState {
  videoId: HomeLoopVideoId
  sizePercent: number
  offsetX: number
  offsetY: number
}

const DEFAULT_HOME_LOOP_DEBUG_STATE: HomeLoopDebugState = {
  videoId: 'loop',
  sizePercent: 100,
  offsetX: 0,
  offsetY: 0,
}

function parseFiniteNumber(value: unknown, fallback: number) {
  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHomeLoopDebugState(input: unknown): HomeLoopDebugState {
  if (!input || typeof input !== 'object') {
    return DEFAULT_HOME_LOOP_DEBUG_STATE
  }

  const state = input as Partial<Record<keyof HomeLoopDebugState, unknown>>
  const videoId: HomeLoopVideoId = state.videoId === 'mascot' ? 'mascot' : 'loop'
  const sizePercent = Math.round(
    clampNumber(
      parseFiniteNumber(state.sizePercent, DEFAULT_HOME_LOOP_DEBUG_STATE.sizePercent),
      70,
      150,
    ),
  )
  const offsetX = Math.round(
    clampNumber(
      parseFiniteNumber(state.offsetX, DEFAULT_HOME_LOOP_DEBUG_STATE.offsetX),
      -120,
      120,
    ),
  )
  const offsetY = Math.round(
    clampNumber(
      parseFiniteNumber(state.offsetY, DEFAULT_HOME_LOOP_DEBUG_STATE.offsetY),
      -120,
      120,
    ),
  )

  return {
    videoId,
    sizePercent,
    offsetX,
    offsetY,
  }
}

function formatZhDate(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map((item) => Number(item))

  if (!year || !month || !day) {
    return dateIso
  }

  return `${year}年${month}月${day}日`
}

function resolveFortuneErrorCopy(error: unknown) {
  if (!(error instanceof Error)) {
    return UNKNOWN_ERROR_COPY
  }

  const message = error.message.trim()

  if (!message) {
    return UNKNOWN_ERROR_COPY
  }

  const normalized = message.toLowerCase()

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('load failed') ||
    normalized.includes('timeout') ||
    normalized.includes('err_network')
  ) {
    return NETWORK_ERROR_COPY
  }

  if (
    normalized.includes('request failed') ||
    normalized.includes('http') ||
    normalized.includes('status')
  ) {
    return SERVICE_ERROR_COPY
  }

  return UNKNOWN_ERROR_COPY
}

export function HomePage({
  embedded = false,
  onOpenAiReading,
  onOpenLiveReadingDebug,
  onOpenDailyFortune,
}: HomePageProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [homeLoopDebugOpen, setHomeLoopDebugOpen] = useState(false)
  const [homeLoopDebugState, setHomeLoopDebugState] = useState<HomeLoopDebugState>(
    DEFAULT_HOME_LOOP_DEBUG_STATE,
  )
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(resolveDefaultZodiacSign())
  const [signHydrated, setSignHydrated] = useState(false)
  const [fortune, setFortune] = useState<DailyFortunePayload | null>(null)
  const [, setLoading] = useState(false)
  const [, setError] = useState<string | null>(null)
  const dateIso = useMemo(() => resolveTodayDateIso(), [])
  const activeHomeLoopVideo = useMemo(
    () =>
      HOME_LOOP_VIDEO_OPTIONS.find((item) => item.id === homeLoopDebugState.videoId) ??
      HOME_LOOP_VIDEO_OPTIONS[0],
    [homeLoopDebugState.videoId],
  )
  const homeLoopVideoStyle = useMemo(
    () =>
      ({
        '--home-loop-scale': String(homeLoopDebugState.sizePercent / 100),
        '--home-loop-offset-x': `${homeLoopDebugState.offsetX}px`,
        '--home-loop-offset-y': `${homeLoopDebugState.offsetY}px`,
      }) as CSSProperties,
    [homeLoopDebugState.offsetX, homeLoopDebugState.offsetY, homeLoopDebugState.sizePercent],
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const raw = window.localStorage.getItem(HOME_LOOP_DEBUG_STORAGE_KEY)

      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw)
      setHomeLoopDebugState(normalizeHomeLoopDebugState(parsed))
    } catch {
      // 忽略视频调试状态读取失败。
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(HOME_LOOP_DEBUG_STORAGE_KEY, JSON.stringify(homeLoopDebugState))
    } catch {
      // 忽略视频调试状态写入失败。
    }
  }, [homeLoopDebugState])

  useEffect(() => {
    let cancelled = false

    const hydrateSign = async () => {
      const storedSign = await loadStoredZodiacSign()

      if (!cancelled && storedSign) {
        setSelectedSign(storedSign)
      }

      if (!cancelled) {
        setSignHydrated(true)
      }
    }

    void hydrateSign()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!signHydrated) {
      return
    }

    let cancelled = false

    const loadFortune = async () => {
      setLoading(true)
      setError(null)
      await saveStoredZodiacSign(selectedSign)

      try {
        const payload = await fetchDailyFortune({
          zodiacSign: selectedSign,
          date: dateIso,
        })

        if (!cancelled) {
          setFortune(payload)
        }
      } catch (exception) {
        if (!cancelled) {
          setError(resolveFortuneErrorCopy(exception))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadFortune()

    return () => {
      cancelled = true
    }
  }, [dateIso, selectedSign, signHydrated])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const pageClassName = ['shared-home-surface', styles.page, embedded ? styles.pageEmbedded : '']
    .filter(Boolean)
    .join(' ')
  const luckyFallbackNumber = (() => {
    const day = Number(dateIso.split('-')[2] ?? '0')
    const mod = day % 9
    return String(mod === 0 ? 9 : mod)
  })()
  const luckyGridItems = useMemo(
    () => [
      {
        id: 'lucky-color',
        label: '幸运色',
        value: fortune?.luckyColor ?? '雾蓝紫',
      },
      {
        id: 'lucky-accessory',
        label: '幸运配饰',
        value: fortune?.luckyAccessory ?? '银色耳饰',
      },
      {
        id: 'lucky-number',
        label: '幸运数字',
        value:
          typeof fortune?.luckyNumber === 'number'
            ? String(fortune.luckyNumber)
            : fortune?.luckyNumber || luckyFallbackNumber,
      },
      {
        id: 'lucky-food',
        label: '幸运食物',
        value: fortune?.luckyFood ?? '莓果酸奶',
      },
    ],
    [
      fortune?.luckyAccessory,
      fortune?.luckyColor,
      fortune?.luckyFood,
      fortune?.luckyNumber,
      luckyFallbackNumber,
    ],
  )
  const handleCardPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    const target = event.currentTarget
    const rect = target.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    target.style.setProperty('--ripple-x', `${x}px`)
    target.style.setProperty('--ripple-y', `${y}px`)
    target.classList.remove(styles.rippleActive)
    void target.offsetWidth
    target.classList.add(styles.rippleActive)
  }, [])
  const handleCardRippleEnd = useCallback((event: ReactAnimationEvent<HTMLButtonElement>) => {
    if (event.animationName !== 'cardRippleWave') {
      return
    }

    event.currentTarget.classList.remove(styles.rippleActive)
  }, [])
  const handleMenuSelect = useCallback(
    (item: HomeMenuItem) => {
      setMenuOpen(false)

      if (item.destinationKind === 'ai-flow') {
        onOpenAiReading?.()
        return
      }

      if (item.slug === 'daily-fortune') {
        onOpenDailyFortune?.()
        return
      }

      onOpenLiveReadingDebug?.()
    },
    [onOpenAiReading, onOpenDailyFortune, onOpenLiveReadingDebug],
  )
  const isMenuItemDisabled = useCallback(
    (item: HomeMenuItem) => {
      if (item.destinationKind === 'ai-flow') {
        return !onOpenAiReading
      }

      if (item.slug === 'daily-fortune') {
        return !onOpenDailyFortune
      }

      return !onOpenLiveReadingDebug
    },
    [onOpenAiReading, onOpenDailyFortune, onOpenLiveReadingDebug],
  )
  const patchHomeLoopDebugState = useCallback((patch: Partial<HomeLoopDebugState>) => {
    setHomeLoopDebugState((previous) => normalizeHomeLoopDebugState({ ...previous, ...patch }))
  }, [])
  const dailyFortuneCard = useMemo(
    () => (
      <button
        type="button"
        className={`${styles.dailyCardButton} ${styles.rippleButton} ${styles.rippleLight}`}
        onClick={onOpenDailyFortune}
        onPointerDown={handleCardPointerDown}
        onAnimationEnd={handleCardRippleEnd}
        disabled={!onOpenDailyFortune}
        aria-label="进入今日运势详情"
      >
        <GlassPanel
          fill
          {...LIQUID_GLASS_CARD_PRESET}
          className={`${styles.dailyShowcaseSurface} ${styles.glassCardSurface}`}
          contentClassName={`${styles.dailyShowcaseCard} ${styles.dailyStackCard}`}
        >
            <div className={styles.dailyShowcaseVisual} aria-hidden="true">
              <div className={styles.dailyShowcaseVisualOrb} />
              <div className={styles.dailyShowcaseVisualArc} />
              <div className={styles.dailyShowcaseVisualSpark} />
            </div>

            <div className={styles.dailyShowcaseBody}>
              <div className={styles.dailyShowcaseLead}>
                <p className={styles.dailyShowcaseEyebrow}>Today Fortune</p>
                <div className={styles.moduleMeta}>
                  <span className={styles.metaPill}>{formatZhDate(dateIso)}</span>
                  <span className={styles.metaPill}>{ZODIAC_SIGN_LABELS[selectedSign]}</span>
                </div>
              </div>

              <h2 className={styles.dailyShowcaseTitle}>今日运势</h2>
              <p className={styles.dailyShowcaseHook}>四格先看今天的幸运线索</p>

              <div className={`${styles.luckyGrid} ${styles.dailyShowcaseGrid}`}>
                {luckyGridItems.map((item) => (
                  <div key={item.id} className={styles.luckyCardSurface}>
                    <div className={`${styles.luckyCard} ${styles.dailyShowcaseLuckyCard}`}>
                      <p className={styles.luckyLabel}>{item.label}</p>
                      <p className={styles.luckyValue}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
        </GlassPanel>
      </button>
    ),
    [
      dateIso,
      handleCardPointerDown,
      handleCardRippleEnd,
      luckyGridItems,
      onOpenDailyFortune,
      selectedSign,
    ],
  )
  const entryCards = useMemo<HomeEntryCard[]>(
    () => [
      {
        id: 'ai-reading',
        render: () => (
          <button
            type="button"
            className={`${styles.entryCardButton} ${styles.rippleButton} ${styles.rippleDark}`}
            onClick={onOpenAiReading}
            onPointerDown={handleCardPointerDown}
            onAnimationEnd={handleCardRippleEnd}
            disabled={!onOpenAiReading}
            aria-label="进入 AI 占卜"
          >
            <GlassPanel
              fill
              {...LIQUID_GLASS_CARD_PRESET}
              className={`${styles.entryFeatureCardSurface} ${styles.glassCardSurface} ${styles.actionStackCardSurface}`}
              contentClassName={`${styles.entryFeatureCard} ${styles.actionStackCard}`}
            >
                <p className={styles.entryFeatureBadge}>AI Tarot</p>
                <h3 className={styles.entryFeatureTitle}>问一个问题，抽三张牌</h3>
                <p className={styles.entryFeatureCopy}>
                  输入你最想确认的问题，进入星弧抽卡过程，再由 AI 原文流式解读牌面。
                </p>
            </GlassPanel>
          </button>
        ),
      },
      {
        id: 'live-reading',
        render: () => (
          <button
            type="button"
            className={`${styles.entryCardButton} ${styles.rippleButton} ${styles.rippleDark}`}
            onClick={onOpenLiveReadingDebug}
            onPointerDown={handleCardPointerDown}
            onAnimationEnd={handleCardRippleEnd}
            disabled={!onOpenLiveReadingDebug}
            aria-label="进入真人连线"
          >
            <GlassPanel
              fill
              {...LIQUID_GLASS_CARD_PRESET}
              className={`${styles.entryFeatureCardSurface} ${styles.glassCardSurface} ${styles.liveStackCardSurface}`}
              contentClassName={`${styles.entryFeatureCard} ${styles.liveStackCard}`}
            >
                <p className={styles.entryFeatureBadge}>Live Reading</p>
                <h3 className={styles.entryFeatureTitle}>真人连线</h3>
                <p className={styles.entryFeatureCopy}>
                  保留 1v1 即时通话入口，适合需要实时互动、抽牌同步与解释陪伴的场景。
                </p>
            </GlassPanel>
          </button>
        ),
      },
    ],
    [
      handleCardPointerDown,
      handleCardRippleEnd,
      onOpenAiReading,
      onOpenLiveReadingDebug,
    ],
  )

  return (
    <main className={pageClassName} aria-label="Dream entry home">
      <div className={styles.shell}>
        <header className={styles.dailyTopBar}>
          <button
            type="button"
            className={styles.menuToggleButton}
            onClick={() => {
              setMenuOpen((prevState) => !prevState)
            }}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? '关闭设置栏' : '打开设置栏'}
          >
            <SettingsIcon />
          </button>
        </header>

        <div
          className={styles.settingsLayer}
          data-open={menuOpen ? 'true' : 'false'}
          aria-hidden={!menuOpen}
        >
          <button
            type="button"
            className={styles.settingsScrim}
            onClick={() => {
              setMenuOpen(false)
            }}
            tabIndex={menuOpen ? 0 : -1}
            aria-label="关闭设置栏"
          />

          <aside className={styles.settingsPanel} aria-label="设置栏">
            <div className={styles.settingsPanelHeader}>
              <p className={styles.settingsEyebrow}>Settings</p>
              <h2 className={styles.settingsTitle}>设置</h2>
            </div>

            <div className={styles.settingsMenuList}>
              {HOME_MENU_ITEMS.map((item, index) => {
                const disabled = isMenuItemDisabled(item)

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.settingsMenuItem}
                    onClick={() => {
                      handleMenuSelect(item)
                    }}
                    disabled={disabled}
                    tabIndex={menuOpen ? 0 : -1}
                    style={{ '--item-index': index } as MenuItemStyle}
                  >
                    <span className={styles.settingsMenuText}>
                      <span className={styles.settingsMenuTitle}>{item.label}</span>
                      <span className={styles.settingsMenuSubtitle}>{item.subtitle}</span>
                    </span>
                    <span className={styles.settingsMenuArrow} aria-hidden>
                      ↗
                    </span>
                  </button>
                )
              })}
            </div>
          </aside>
        </div>

        <div className={styles.homeLoopDebugDock}>
          <button
            type="button"
            className={styles.homeLoopDebugToggle}
            onClick={() => {
              setHomeLoopDebugOpen((previous) => !previous)
            }}
            aria-expanded={homeLoopDebugOpen}
            aria-controls="home-loop-debug-panel"
          >
            {homeLoopDebugOpen ? '收起视频调试' : '视频调试'}
          </button>

          {homeLoopDebugOpen ? (
            <div id="home-loop-debug-panel" className={styles.homeLoopDebugPanel}>
              <div className={styles.homeLoopSourceSwitch} role="tablist" aria-label="视频切换">
                {HOME_LOOP_VIDEO_OPTIONS.map((item) => {
                  const active = item.id === homeLoopDebugState.videoId

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.homeLoopSourceButton} ${active ? styles.homeLoopSourceButtonActive : ''}`}
                      onClick={() => {
                        patchHomeLoopDebugState({ videoId: item.id })
                      }}
                      aria-pressed={active}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <label className={styles.homeLoopSliderRow}>
                <span className={styles.homeLoopSliderLabel}>大小</span>
                <input
                  className={styles.homeLoopSlider}
                  type="range"
                  min={70}
                  max={150}
                  step={1}
                  value={homeLoopDebugState.sizePercent}
                  onChange={(event) => {
                    patchHomeLoopDebugState({ sizePercent: Number(event.currentTarget.value) })
                  }}
                />
                <span className={styles.homeLoopSliderValue}>{homeLoopDebugState.sizePercent}%</span>
              </label>

              <label className={styles.homeLoopSliderRow}>
                <span className={styles.homeLoopSliderLabel}>左右</span>
                <input
                  className={styles.homeLoopSlider}
                  type="range"
                  min={-120}
                  max={120}
                  step={1}
                  value={homeLoopDebugState.offsetX}
                  onChange={(event) => {
                    patchHomeLoopDebugState({ offsetX: Number(event.currentTarget.value) })
                  }}
                />
                <span className={styles.homeLoopSliderValue}>{homeLoopDebugState.offsetX}px</span>
              </label>

              <label className={styles.homeLoopSliderRow}>
                <span className={styles.homeLoopSliderLabel}>上下</span>
                <input
                  className={styles.homeLoopSlider}
                  type="range"
                  min={-120}
                  max={120}
                  step={1}
                  value={homeLoopDebugState.offsetY}
                  onChange={(event) => {
                    patchHomeLoopDebugState({ offsetY: Number(event.currentTarget.value) })
                  }}
                />
                <span className={styles.homeLoopSliderValue}>{homeLoopDebugState.offsetY}px</span>
              </label>

              <button
                type="button"
                className={styles.homeLoopResetButton}
                onClick={() => {
                  setHomeLoopDebugState(DEFAULT_HOME_LOOP_DEBUG_STATE)
                }}
              >
                重置
              </button>
            </div>
          ) : null}
        </div>

        <section className={styles.dailyShowcaseSection} aria-label="首页今日运势">
          {dailyFortuneCard}
        </section>

        <section className={styles.entrySectionHeader} aria-label="占卜服务入口">
          <div className={styles.entrySectionLine} aria-hidden />
          <h2 className={styles.entrySectionTitle}>探索你的答案</h2>
          <div className={styles.entrySectionLine} aria-hidden />
        </section>

        <section className={styles.entryGridSection} aria-label="首页功能卡片入口">
          <div className={styles.entryGrid}>
            {entryCards.map((item) => (
              <div key={item.id}>{item.render()}</div>
            ))}
          </div>
        </section>

        <section className={styles.homeLoopSection} aria-label="占卜师猫咪动画">
          <div className={styles.homeLoopFrame}>
            <video
              className={styles.homeLoopVideo}
              src={activeHomeLoopVideo.src}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              style={homeLoopVideoStyle}
              aria-label={activeHomeLoopVideo.label}
            />
          </div>
        </section>
      </div>
    </main>
  )
}

export default HomePage
