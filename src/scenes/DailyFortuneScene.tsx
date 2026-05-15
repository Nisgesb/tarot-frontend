import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  fetchDailyFortune,
  isZodiacSign,
  loadStoredZodiacSign,
  resolveDefaultZodiacSign,
  resolveTodayDateIso,
  saveStoredZodiacSign,
} from '../services/dailyFortuneApi'
import { canUseWindow } from '../platform/runtime'
import {
  ZODIAC_SIGNS,
  ZODIAC_SIGN_LABELS,
  type DailyFortunePayload,
  type ZodiacSign,
} from '../types/dailyFortune'
import { Toast } from '../components/toast'
import styles from './DailyFortuneScene.module.css'

interface DailyFortuneSceneProps {
  active: boolean
  onGoHome: () => void
}

type GuideKey = 'relationship' | 'study' | 'selfCare'

type PracticeId = 'practice-do' | 'practice-pause'

const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  aries: '♈',
  taurus: '♉',
  gemini: '♊',
  cancer: '♋',
  leo: '♌',
  virgo: '♍',
  libra: '♎',
  scorpio: '♏',
  sagittarius: '♐',
  capricorn: '♑',
  aquarius: '♒',
  pisces: '♓',
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

function getPracticeStorageKey(dateIso: string, sign: ZodiacSign) {
  return `daily-fortune:practice:${dateIso}:${sign}`
}

function getReflectionStorageKey(dateIso: string, sign: ZodiacSign) {
  return `daily-fortune:reflection:${dateIso}:${sign}`
}

function readStoredPracticeIds(storageKey: string): PracticeId[] {
  if (!canUseWindow()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(storageKey)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is PracticeId => item === 'practice-do' || item === 'practice-pause')
  } catch {
    return []
  }
}

function readStoredReflection(storageKey: string) {
  if (!canUseWindow()) {
    return ''
  }

  try {
    return window.localStorage.getItem(storageKey) ?? ''
  } catch {
    return ''
  }
}

export function DailyFortuneScene({ active, onGoHome }: DailyFortuneSceneProps) {
  const [selectedSign, setSelectedSign] = useState<ZodiacSign>(resolveDefaultZodiacSign())
  const [signHydrated, setSignHydrated] = useState(false)
  const [fortune, setFortune] = useState<DailyFortunePayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const dateIso = useMemo(() => resolveTodayDateIso(), [])
  const [refreshToken, setRefreshToken] = useState(0)

  const [isZodiacSheetOpen, setIsZodiacSheetOpen] = useState(false)
  const [isCardInsightOpen, setIsCardInsightOpen] = useState(false)
  const [expandedGuideKey, setExpandedGuideKey] = useState<GuideKey | null>('study')
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<PracticeId[]>([])
  const [reflectionText, setReflectionText] = useState('')
  const [isSwitchingZodiac, setIsSwitchingZodiac] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

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
      setLoadFailed(false)
      setInlineError(null)
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
          setLoadFailed(true)
          setInlineError(message)
          Toast.show(message, {
            type: 'error',
            position: 'top',
          })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIsSwitchingZodiac(false)
        }
      }
    }

    void loadFortune()

    return () => {
      cancelled = true
    }
  }, [active, dateIso, refreshToken, selectedSign, signHydrated])

  useEffect(() => {
    if (!signHydrated) {
      return
    }

    const practiceStorageKey = getPracticeStorageKey(dateIso, selectedSign)
    const reflectionStorageKey = getReflectionStorageKey(dateIso, selectedSign)

    setSelectedPracticeIds(readStoredPracticeIds(practiceStorageKey))
    setReflectionText(readStoredReflection(reflectionStorageKey).slice(0, 80))
  }, [dateIso, selectedSign, signHydrated])

  useEffect(() => {
    if (!signHydrated || !canUseWindow()) {
      return
    }

    const practiceStorageKey = getPracticeStorageKey(dateIso, selectedSign)
    window.localStorage.setItem(practiceStorageKey, JSON.stringify(selectedPracticeIds))
  }, [dateIso, selectedPracticeIds, selectedSign, signHydrated])

  useEffect(() => {
    if (!signHydrated || !canUseWindow()) {
      return
    }

    const reflectionStorageKey = getReflectionStorageKey(dateIso, selectedSign)
    window.localStorage.setItem(reflectionStorageKey, reflectionText)
  }, [dateIso, reflectionText, selectedSign, signHydrated])

  const className = [
    'scene-panel',
    'scene-template-form',
    styles.scene,
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const hasFortune = fortune !== null
  const isShowingCachedFortune = Boolean(loading && fortune && fortune.zodiacSign !== selectedSign)
  const statusText = loading
    ? isShowingCachedFortune
      ? `正在同步 ${ZODIAC_SIGN_LABELS[selectedSign]} 的今日提醒...`
      : `正在准备 ${ZODIAC_SIGN_LABELS[selectedSign]} 的今日提醒...`
    : null
  const staleHintText = isShowingCachedFortune
    ? `当前先展示 ${ZODIAC_SIGN_LABELS[fortune!.zodiacSign]} 的已加载内容`
    : null

  const contentSwapKey = fortune
    ? `${fortune.zodiacSign}-${fortune.headline}-${fortune.summary}`
    : `${selectedSign}-pending`

  const headlineText = fortune?.headline?.trim() || '平衡感正在\n帮你看清关系'
  const summaryText =
    fortune?.summary?.trim() || '你会更容易看到双方立场之间的落差，也更能找到中间路径。'
  const cardNameText = fortune?.cardName?.trim() || 'Queen of Swords'
  const keywordText =
    fortune?.keywords && fortune.keywords.length > 0
      ? fortune.keywords.join(' / ')
      : '关系 / 判断 / 协调'

  const relationshipText = fortune?.love?.trim() || '重新对齐预期，不用假装没事。'
  const studyText = fortune?.career?.trim() || '把复杂的问题拆小一点，会更容易开始。'
  const selfCareText = fortune?.self?.trim() || '先照顾好情绪，再决定怎么回应。'

  const doPracticeText = fortune?.do?.trim() || '把标准说清楚'
  const dontRawText = fortune?.dont?.trim()
  const pausePracticeText = dontRawText ? `先暂停：${dontRawText}` : '先暂停，不急着答应'

  const reflectionPromptText =
    fortune?.reflectionPrompt?.trim() || '你今天真正想维护的平衡是什么？'

  const handleSelectSign = (sign: ZodiacSign) => {
    if (sign === selectedSign) {
      setIsZodiacSheetOpen(false)
      return
    }

    setIsSwitchingZodiac(true)
    setSelectedSign(sign)
    setIsZodiacSheetOpen(false)
  }

  const handleCardSectionKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    setIsCardInsightOpen((value) => !value)
  }

  const handleToggleGuide = (guideKey: GuideKey) => {
    setExpandedGuideKey((current) => (current === guideKey ? null : guideKey))
  }

  const handleTogglePractice = (id: PracticeId) => {
    setSelectedPracticeIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handleRetry = () => {
    setInlineError(null)
    setLoadFailed(false)

    if (hasFortune) {
      setIsSwitchingZodiac(true)
    }

    setRefreshToken((value) => value + 1)
  }

  const isPracticeDoChecked = selectedPracticeIds.includes('practice-do')
  const isPracticePauseChecked = selectedPracticeIds.includes('practice-pause')

  return (
    <section className={className}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <button
            type="button"
            className={`topbar-link ${styles.backButton}`}
            onClick={onGoHome}
            aria-label="返回首页"
          >
            ←
          </button>
          <div className={styles.titleBlock}>
            <p className={styles.pageKicker}>DAILY FORTUNE</p>
            <h1 className={styles.pageTitle}>今日运势</h1>
          </div>
          <span className={styles.headerSpacer} aria-hidden />
        </header>

        <section className={`${styles.mirrorCard} ${isSwitchingZodiac ? styles.isSwitching : ''}`}>
          <span className={styles.mirrorPearlDot} aria-hidden />
          <div className={styles.mirrorContent}>
            <div className={styles.mirrorMeta}>
              <span>{formatZhDate(dateIso)}</span>
              <div className={styles.mirrorMetaRight}>
                <span>{ZODIAC_SIGN_LABELS[selectedSign]}</span>
                <span aria-hidden>·</span>
                <button
                  type="button"
                  className={styles.zodiacTrigger}
                  onClick={() => setIsZodiacSheetOpen(true)}
                  disabled={loading}
                >
                  {loading ? '同步中…' : '切换星座'}
                </button>
              </div>
            </div>

            <div key={contentSwapKey} className={styles.mirrorBody}>
              <p className={styles.mirrorTitle}>{headlineText}</p>
              <p className={styles.mirrorSummary}>{summaryText}</p>
            </div>

            <div className={styles.scrollHint}>
              <span>向下滑动展开今日提醒</span>
              <span className={styles.scrollHintArrow} aria-hidden>
                ⌄
              </span>
            </div>
          </div>
        </section>

        {statusText ? (
          <div className={styles.inlineStatus} aria-live="polite">
            <p>{statusText}</p>
            {staleHintText ? <p className={styles.inlineStatusSubtle}>{staleHintText}</p> : null}
          </div>
        ) : null}

        {hasFortune && inlineError ? (
          <div className={styles.inlineError} role="status" aria-live="polite">
            <p>{inlineError}</p>
            <button type="button" className={styles.retryButton} onClick={handleRetry}>
              重新加载
            </button>
          </div>
        ) : null}

        {!hasFortune && loadFailed ? (
          <div className={styles.errorCard} role="status" aria-live="polite">
            <p>{inlineError ?? '今日运势加载失败，请稍后重试。'}</p>
            <button type="button" className={styles.retryButton} onClick={handleRetry}>
              重新加载
            </button>
          </div>
        ) : null}

        <section
          className={styles.cardSection}
          role="button"
          tabIndex={0}
          onClick={() => setIsCardInsightOpen((value) => !value)}
          onKeyDown={handleCardSectionKeyDown}
          aria-expanded={isCardInsightOpen}
          aria-label="查看今日代表牌含义"
        >
          <p className={styles.sectionKicker}>TODAY&apos;S CARD</p>
          <p className={styles.sectionTitle}>今日代表牌</p>
          <div className={styles.cardRow}>
            <span className={styles.cardThumb} aria-hidden>
              ∣∣
            </span>
            <p className={styles.cardName}>{cardNameText}</p>
          </div>
          <p className={styles.cardKeywords}>{keywordText}</p>
          <button type="button" className={styles.cardInsightButton}>
            轻点查看含义 &gt;
          </button>

          {isCardInsightOpen ? (
            <div className={styles.cardInsightPopover} role="dialog" aria-label="代表牌含义">
              <button
                type="button"
                className={styles.cardInsightClose}
                aria-label="关闭"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsCardInsightOpen(false)
                }}
              >
                ×
              </button>
              <p>这张牌提醒你：</p>
              <p>先看清事实，</p>
              <p>再决定要不要回应。</p>
            </div>
          ) : null}
        </section>

        <section className={styles.guidanceCard}>
          <article
            className={`${styles.guidanceItem} ${expandedGuideKey === 'relationship' ? styles.guidanceItemExpanded : ''}`}
          >
            <button
              type="button"
              className={styles.guidanceHeader}
              onClick={() => handleToggleGuide('relationship')}
              aria-expanded={expandedGuideKey === 'relationship'}
            >
              <span className={styles.guidanceIndex}>01</span>
              <span className={styles.guidanceTitle}>关系</span>
              <span className={styles.guidanceArrow} aria-hidden>
                {expandedGuideKey === 'relationship' ? '⌃' : '⌄'}
              </span>
            </button>
            <p className={styles.guidanceText}>{relationshipText}</p>
            <div className={styles.guidanceDetails}>
              <div className={styles.guidanceDetailsInner}>
                <ul>
                  <li>先把你的期待说具体，再进入下一步。</li>
                  <li>保持语气稳定，比急着证明更有帮助。</li>
                </ul>
              </div>
            </div>
          </article>

          <article
            className={`${styles.guidanceItem} ${expandedGuideKey === 'study' ? styles.guidanceItemExpanded : ''}`}
          >
            <button
              type="button"
              className={styles.guidanceHeader}
              onClick={() => handleToggleGuide('study')}
              aria-expanded={expandedGuideKey === 'study'}
            >
              <span className={styles.guidanceIndex}>02</span>
              <span className={styles.guidanceTitle}>学习</span>
              <span className={styles.guidanceArrow} aria-hidden>
                {expandedGuideKey === 'study' ? '⌃' : '⌄'}
              </span>
            </button>
            <p className={styles.guidanceText}>{studyText}</p>
            <div className={styles.guidanceDetails}>
              <div className={styles.guidanceDetailsInner}>
                <ul>
                  <li>先写下核心问题是什么。</li>
                  <li>把它拆成 2-3 个可以马上动手的小步骤。</li>
                  <li>给自己 20 分钟专注时间，先做第一步。</li>
                </ul>
              </div>
            </div>
          </article>

          <article
            className={`${styles.guidanceItem} ${expandedGuideKey === 'selfCare' ? styles.guidanceItemExpanded : ''}`}
          >
            <button
              type="button"
              className={styles.guidanceHeader}
              onClick={() => handleToggleGuide('selfCare')}
              aria-expanded={expandedGuideKey === 'selfCare'}
            >
              <span className={styles.guidanceIndex}>03</span>
              <span className={styles.guidanceTitle}>自我照顾</span>
              <span className={styles.guidanceArrow} aria-hidden>
                {expandedGuideKey === 'selfCare' ? '⌃' : '⌄'}
              </span>
            </button>
            <p className={styles.guidanceText}>{selfCareText}</p>
            <div className={styles.guidanceDetails}>
              <div className={styles.guidanceDetailsInner}>
                <ul>
                  <li>先做一个深呼吸，给情绪一点缓冲时间。</li>
                  <li>把注意力拉回现在，再决定接下来要做什么。</li>
                </ul>
              </div>
            </div>
          </article>
        </section>

        <section className={styles.practiceNote}>
          <p className={styles.sectionKicker}>TODAY&apos;S PRACTICE</p>
          <h2 className={styles.practiceTitle}>今日小练习</h2>

          <button
            type="button"
            className={`${styles.practiceItem} ${isPracticeDoChecked ? styles.practiceItemChecked : ''}`}
            onClick={() => handleTogglePractice('practice-do')}
            aria-pressed={isPracticeDoChecked}
          >
            <span className={styles.practiceCheckbox} aria-hidden>
              {isPracticeDoChecked ? '☑' : '☐'}
            </span>
            <span>{doPracticeText}</span>
          </button>

          <button
            type="button"
            className={`${styles.practiceItem} ${isPracticePauseChecked ? styles.practiceItemChecked : ''}`}
            onClick={() => handleTogglePractice('practice-pause')}
            aria-pressed={isPracticePauseChecked}
          >
            <span className={styles.practiceCheckbox} aria-hidden>
              {isPracticePauseChecked ? '☑' : '☐'}
            </span>
            <span>{pausePracticeText}</span>
          </button>

          {selectedPracticeIds.length > 0 ? (
            <p className={styles.practiceBadge}>已加入今天的小练习</p>
          ) : null}
        </section>

        <section className={styles.reflectionCard}>
          <p className={styles.sectionKicker}>CLOSING REFLECTION</p>
          <h2 className={styles.sectionTitle}>今日反思</h2>
          <p className={styles.reflectionPrompt}>{reflectionPromptText}</p>
          <textarea
            className={styles.reflectionInput}
            placeholder="写一句给自己的提醒"
            maxLength={80}
            value={reflectionText}
            onChange={(event) => setReflectionText(event.target.value.slice(0, 80))}
          />
          <p className={styles.reflectionCounter}>{reflectionText.length}/80</p>
        </section>
      </div>

      {isZodiacSheetOpen ? (
        <div className={styles.sheetOverlay} onClick={() => setIsZodiacSheetOpen(false)}>
          <section
            className={styles.sheetPanel}
            role="dialog"
            aria-label="选择星座"
            onClick={(event) => event.stopPropagation()}
          >
            <span className={styles.sheetHandle} aria-hidden />
            <header className={styles.sheetHeader}>
              <h2>选择星座</h2>
              <button
                type="button"
                className={styles.sheetClose}
                onClick={() => setIsZodiacSheetOpen(false)}
                aria-label="关闭星座选择"
              >
                ×
              </button>
            </header>

            <div className={styles.signGrid}>
              {ZODIAC_SIGNS.map((sign) => (
                <button
                  type="button"
                  key={sign}
                  className={`${styles.signOption} ${selectedSign === sign ? styles.signOptionActive : ''}`}
                  onClick={() => handleSelectSign(sign)}
                  disabled={loading}
                >
                  <span className={styles.signSymbol} aria-hidden>
                    {ZODIAC_SYMBOLS[sign]}
                  </span>
                  <span>{ZODIAC_SIGN_LABELS[sign]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
