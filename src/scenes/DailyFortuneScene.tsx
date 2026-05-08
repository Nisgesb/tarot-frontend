import { useEffect, useMemo, useState } from 'react'
import {
  fetchDailyFortune,
  isZodiacSign,
  loadStoredZodiacSign,
  resolveDefaultZodiacSign,
  resolveTodayDateIso,
  saveStoredZodiacSign,
} from '../services/dailyFortuneApi'
import { canUseWindow } from '../platform/runtime'
import { GlassPanel } from '../components/GlassPanel'
import {
  ZODIAC_SIGNS,
  ZODIAC_SIGN_LABELS,
  type DailyFortunePayload,
  type ZodiacSign,
} from '../types/dailyFortune'
import styles from './DailyFortuneScene.module.css'

interface DailyFortuneSceneProps {
  active: boolean
  onGoHome: () => void
}

function formatZhDate(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map((item) => Number(item))

  if (!year || !month || !day) {
    return dateIso
  }

  return `${year}年${month}月${day}日`
}

function readSignFromQuery() {
  if (!canUseWindow()) {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const sign = params.get('zodiacSign')

  if (!sign || !isZodiacSign(sign)) {
    return null
  }

  return sign
}

function syncSignToQuery(sign: ZodiacSign) {
  if (!canUseWindow()) {
    return
  }

  const url = new URL(window.location.href)
  url.searchParams.set('zodiacSign', sign)
  window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`)
}

export function DailyFortuneScene({ active, onGoHome }: DailyFortuneSceneProps) {
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(resolveDefaultZodiacSign())
  const [signHydrated, setSignHydrated] = useState(false)
  const [fortune, setFortune] = useState<DailyFortunePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dateIso = useMemo(() => resolveTodayDateIso(), [])
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    const hydrateSign = async () => {
      const querySign = readSignFromQuery()

      if (querySign) {
        if (!cancelled) {
          setSelectedSign(querySign)
        }
        await saveStoredZodiacSign(querySign)
        if (!cancelled) {
          setSignHydrated(true)
        }
        return
      }

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
    if (!active || !signHydrated) {
      return
    }

    let cancelled = false

    const loadFortune = async () => {
      setLoading(true)
      setError(null)
      syncSignToQuery(selectedSign)
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
        const message =
          exception instanceof Error && exception.message.trim().length > 0
            ? exception.message
            : '今日运势加载失败，请稍后重试。'

        if (!cancelled) {
          setError(message)
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
  }, [active, dateIso, refreshToken, selectedSign, signHydrated])

  const className = [
    'scene-panel',
    'scene-template-form',
    styles.dailyFortuneScene,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <button
            type="button"
            className={`topbar-link ${styles.backIconButton}`}
            onClick={onGoHome}
            aria-label="返回首页"
          >
            ←
          </button>
          <div className={styles.titleWrap}>
            <p className={styles.eyebrow}>Daily Fortune</p>
            <h1 className={styles.title}>今日运势</h1>
          </div>
          <span className={styles.spacer} aria-hidden />
        </header>

        <GlassPanel
          borderRadius={28}
          backgroundOpacity={0.15}
          saturation={1.3}
          className={styles.surfaceGlass}
          contentClassName={`${styles.surface} ${styles.hero}`}
        >
          <div className={styles.heroMeta}>
            <span className={styles.metaPill}>{formatZhDate(dateIso)}</span>
            <span className={styles.metaPill}>{ZODIAC_SIGN_LABELS[selectedSign]}</span>
          </div>
          <div>
            <p className={styles.headline}>{fortune?.headline ?? '正在读取今日运势...'}</p>
            <p className={styles.summary}>
              {fortune?.summary ?? '请稍候，我们正在准备属于你的今日提示。'}
            </p>
          </div>

          <div className={styles.selectorWrap}>
            <p className={styles.selectorTitle}>选择星座</p>
            <div className={styles.selectorList}>
              {ZODIAC_SIGNS.map((sign) => (
                <button
                  type="button"
                  key={sign}
                  className={`${styles.selectorButton} ${
                    selectedSign === sign ? styles.selectorButtonActive : ''
                  }`}
                  onClick={() => setSelectedSign(sign)}
                >
                  {ZODIAC_SIGN_LABELS[sign]}
                </button>
              ))}
            </div>
          </div>
        </GlassPanel>

        <section className={styles.grid}>
          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={styles.surfaceGlass}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>代表牌</p>
            <p className={styles.cardName}>{fortune?.cardName ?? '等待载入'}</p>
            <div className={styles.keywords}>
              {(fortune?.keywords ?? []).map((keyword) => (
                <span key={keyword} className={styles.keyword}>
                  {keyword}
                </span>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={styles.surfaceGlass}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>爱情</p>
            <p className={styles.cardCopy}>{fortune?.love ?? '正在加载...'}</p>
          </GlassPanel>

          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={styles.surfaceGlass}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>事业</p>
            <p className={styles.cardCopy}>{fortune?.career ?? '正在加载...'}</p>
          </GlassPanel>

          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={styles.surfaceGlass}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>自我成长</p>
            <p className={styles.cardCopy}>{fortune?.self ?? '正在加载...'}</p>
          </GlassPanel>

          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={`${styles.surfaceGlass} ${styles.wide}`}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>今日宜 / 忌</p>
            <div className={styles.hintRow}>
              <p className={styles.hintPill}>
                <strong>宜：</strong>
                {fortune?.do ?? '正在加载...'}
              </p>
              <p className={styles.hintPill}>
                <strong>忌：</strong>
                {fortune?.dont ?? '正在加载...'}
              </p>
            </div>
          </GlassPanel>

          <GlassPanel
            borderRadius={28}
            backgroundOpacity={0.14}
            saturation={1.28}
            className={styles.surfaceGlass}
            contentClassName={`${styles.surface} ${styles.card}`}
          >
            <p className={styles.cardTitle}>今日反思</p>
            <p className={styles.reflection}>
              {fortune?.reflectionPrompt ?? '正在加载今日反思问题...'}
            </p>
          </GlassPanel>
        </section>

        {loading ? <p className={styles.status}>正在同步 {ZODIAC_SIGN_LABELS[selectedSign]} 的今日运势...</p> : null}
        {error ? (
          <>
            <p className={styles.error}>{error}</p>
            <button
              type="button"
              className={`secondary-pill ${styles.retry}`}
              onClick={() => setRefreshToken((value) => value + 1)}
            >
              重新加载
            </button>
          </>
        ) : null}
      </div>
    </section>
  )
}
