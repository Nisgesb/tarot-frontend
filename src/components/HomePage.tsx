import { useEffect, useMemo, useState } from 'react'
import {
  ShintaCardStack,
  type ShintaCardStackItem,
} from './ShintaCardStack'
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
import styles from './HomePage.module.css'

interface HomePageProps {
  embedded?: boolean
  onOpenAiReading?: () => void
  onOpenLiveReadingDebug?: () => void
  onOpenDailyFortune?: () => void
}

function formatZhDate(dateIso: string) {
  const [year, month, day] = dateIso.split('-').map((item) => Number(item))

  if (!year || !month || !day) {
    return dateIso
  }

  return `${year}年${month}月${day}日`
}

export function HomePage({
  embedded = false,
  onOpenAiReading,
  onOpenLiveReadingDebug,
  onOpenDailyFortune,
}: HomePageProps) {
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(resolveDefaultZodiacSign())
  const [signHydrated, setSignHydrated] = useState(false)
  const [fortune, setFortune] = useState<DailyFortunePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dateIso = useMemo(() => resolveTodayDateIso(), [])

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
  }, [dateIso, selectedSign, signHydrated])

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
  const detailHint = fortune?.cardName
    ? `代表牌「${fortune.cardName}」与完整解读已收进详情页。`
    : '四格先看今日幸运线索，完整解读收进详情页。'
  const stackItems = useMemo<ShintaCardStackItem[]>(
    () => [
      {
        id: 'daily-fortune',
        render: () => (
          <section className={`${styles.stackCardContent} ${styles.dailyStackCard}`}>
            <div className={styles.moduleHeader}>
              <p className={styles.moduleTitle}>今日运势</p>
              <div className={styles.moduleMeta}>
                <span className={styles.metaPill}>{formatZhDate(dateIso)}</span>
                <span className={styles.metaPill}>{ZODIAC_SIGN_LABELS[selectedSign]}</span>
              </div>
            </div>

            <p className={styles.moduleHook}>四格先看今天的幸运线索</p>

            <div className={styles.luckyGrid}>
              {luckyGridItems.map((item) => (
                <article key={item.id} className={styles.luckyCard}>
                  <p className={styles.luckyLabel}>{item.label}</p>
                  <p className={styles.luckyValue}>{item.value}</p>
                </article>
              ))}
            </div>

            <div className={styles.moduleFooter}>
              <div className={styles.footerCopy}>
                <p className={styles.footerLabel}>详情页承接</p>
                <p className={styles.footerHint}>{detailHint}</p>
              </div>
              <button
                type="button"
                className="primary-pill"
                onClick={onOpenDailyFortune}
                disabled={!onOpenDailyFortune}
              >
                查看完整今日运势
              </button>
            </div>

            {loading || !signHydrated ? (
              <p className={styles.status}>正在同步 {ZODIAC_SIGN_LABELS[selectedSign]} 的结果...</p>
            ) : null}
            {error ? <p className={styles.error}>{error}</p> : null}
          </section>
        ),
      },
      {
        id: 'ai-reading',
        render: () => (
          <section className={`${styles.stackCardContent} ${styles.actionStackCard}`}>
            <p className={styles.stackEyebrow}>AI Tarot</p>
            <h3 className={styles.stackTitle}>问一个问题，抽三张牌</h3>
            <p className={styles.stackCopy}>
              输入你最想确认的问题，进入星弧抽卡过程，再由 AI 原文流式解读牌面。
            </p>
            <button
              type="button"
              className="primary-pill"
              onClick={onOpenAiReading}
              disabled={!onOpenAiReading}
            >
              开始 AI 占卜
            </button>
          </section>
        ),
      },
      {
        id: 'live-reading',
        render: () => (
          <section className={`${styles.stackCardContent} ${styles.liveStackCard}`}>
            <p className={styles.stackEyebrow}>Live Reading</p>
            <h3 className={styles.stackTitle}>真人连线</h3>
            <p className={styles.stackCopy}>
              保留 1v1 即时通话入口，适合需要实时互动、抽牌同步与解释陪伴的场景。
            </p>
            <button
              type="button"
              className="secondary-pill"
              onClick={onOpenLiveReadingDebug}
              disabled={!onOpenLiveReadingDebug}
            >
              进入真人连线
            </button>
          </section>
        ),
      },
    ],
    [
      dateIso,
      detailHint,
      error,
      loading,
      luckyGridItems,
      onOpenAiReading,
      onOpenDailyFortune,
      onOpenLiveReadingDebug,
      selectedSign,
      signHydrated,
    ],
  )

  return (
    <main className={pageClassName} aria-label="Dream entry home">
      <div className={styles.shell}>
        <header className={styles.dailyTopBar}>
          <p className={styles.eyebrow}>Dreamkeeper Home</p>
          <div className={styles.topActions}>
            {onOpenAiReading ? (
              <button
                type="button"
                className={`${styles.topPill} ${styles.topPillPrimary}`}
                onClick={onOpenAiReading}
              >
                AI占卜
              </button>
            ) : null}
            {onOpenLiveReadingDebug ? (
              <button
                type="button"
                className={styles.topPill}
                onClick={onOpenLiveReadingDebug}
              >
                真人连线
              </button>
            ) : null}
          </div>
        </header>

        <section className={styles.cardStackSection} aria-label="首页功能卡片">
          <ShintaCardStack
            className={styles.homeCardStack}
            items={stackItems}
            cardWidth={420}
            cardHeight={560}
            swipeThreshold={88}
          />
        </section>
      </div>
    </main>
  )
}

export default HomePage
