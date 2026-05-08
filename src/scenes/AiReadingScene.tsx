import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CelestialTarotArcFlow,
  type CelestialTarotArcFlowRevealedCard,
} from '../components/CelestialTarotArcFlow'
import { resolveAiReadingCardFront } from '../components/CelestialTarotArcFlow/aiReadingCardFronts'
import { GlassPanel } from '../components/GlassPanel'
import {
  createAiReadingSession,
  generateAiReading,
  loadStoredAiReadingAnonymousSessionId,
  saveStoredAiReadingAnonymousSessionId,
} from '../services/aiReadingApi'
import type {
  CreateAiReadingSessionResponse,
  SpreadCardItem,
} from '../types/aiReading'
import styles from './AiReadingScene.module.css'

interface AiReadingSceneProps {
  active: boolean
}

type AiReadingPhase = 'question' | 'draw' | 'reading'
type TitleFontMode = 'serif' | 'sans'

const DRAW_COMPLETION_DELAY_MS = 1600
const AI_READING_TITLE_FONT_KEY = 'ai-reading-title-font-v1'

function asDisplayError(message: string | null) {
  if (!message) {
    return null
  }

  const normalized = message.trim()

  if (normalized.length === 0) {
    return '本次解读暂时失败，请稍后再试。'
  }

  return normalized
}

export function AiReadingScene({ active }: AiReadingSceneProps) {
  const [question, setQuestion] = useState('')
  const [phase, setPhase] = useState<AiReadingPhase>('question')
  const [titleFontMode, setTitleFontMode] = useState<TitleFontMode>('serif')
  const [anonymousSessionId, setAnonymousSessionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionResult, setSessionResult] = useState<CreateAiReadingSessionResponse | null>(null)
  const [readingText, setReadingText] = useState('')
  const [drawnCardIds, setDrawnCardIds] = useState<string[]>([])
  const generationStartedRef = useRef(false)
  const drawCompletionTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const hydrateSessionId = async () => {
      const stored = await loadStoredAiReadingAnonymousSessionId()

      if (!cancelled) {
        setAnonymousSessionId(stored)
      }
    }

    void hydrateSessionId()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(AI_READING_TITLE_FONT_KEY)
      if (stored === 'serif' || stored === 'sans') {
        setTitleFontMode(stored)
      }
    } catch {
      // 忽略读取本地调试偏好失败
    }
  }, [])

  useEffect(() => {
    return () => {
      if (drawCompletionTimerRef.current !== null) {
        window.clearTimeout(drawCompletionTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async () => {
    const normalizedQuestion = question.trim()

    if (!normalizedQuestion || submitting) {
      return
    }

    setSubmitting(true)
    setStreaming(false)
    setError(null)
    setReadingText('')
    setDrawnCardIds([])
    generationStartedRef.current = false

    try {
      const session = await createAiReadingSession({
        mode: 'three-card',
        question: normalizedQuestion,
        anonymousSessionId: anonymousSessionId ?? undefined,
      })
      setSessionResult(session)

      if (session.anonymousSessionId !== anonymousSessionId) {
        setAnonymousSessionId(session.anonymousSessionId)
        await saveStoredAiReadingAnonymousSessionId(session.anonymousSessionId)
      }

      setPhase('draw')
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : '本次解读暂时失败，请稍后再试。'

      setError(asDisplayError(message))
      setPhase('question')
    } finally {
      setSubmitting(false)
    }
  }

  const startReading = async (session: CreateAiReadingSessionResponse) => {
    setPhase('reading')
    setSubmitting(true)
    setStreaming(true)
    setError(null)
    setReadingText('')

    try {
      await generateAiReading(
        session.readingId,
        {
          anonymousSessionId: session.anonymousSessionId,
        },
        (chunk) => {
          setReadingText((current) => current + chunk)
        },
      )
    } catch (exception) {
      const message =
        exception instanceof Error ? exception.message : '本次解读暂时失败，请稍后再试。'

      setError(asDisplayError(message))
    } finally {
      setSubmitting(false)
      setStreaming(false)
    }
  }

  const handleDrawCard = (cardId: string) => {
    if (!sessionResult || generationStartedRef.current) {
      return
    }

    setDrawnCardIds((current) => {
      if (current.includes(cardId) || current.length >= sessionResult.spread.length) {
        return current
      }

      const next = [...current, cardId]

      if (next.length >= sessionResult.spread.length) {
        generationStartedRef.current = true
        drawCompletionTimerRef.current = window.setTimeout(() => {
          void startReading(sessionResult)
        }, DRAW_COMPLETION_DELAY_MS)
      }

      return next
    })
  }

  const startAnother = () => {
    setSessionResult(null)
    setReadingText('')
    setError(null)
    setQuestion('')
    setStreaming(false)
    setSubmitting(false)
    setDrawnCardIds([])
    setPhase('question')
    generationStartedRef.current = false
    if (drawCompletionTimerRef.current !== null) {
      window.clearTimeout(drawCompletionTimerRef.current)
      drawCompletionTimerRef.current = null
    }
  }

  const className = ['scene-panel', 'scene-template-form', styles.scene, active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  const toggleTitleFont = () => {
    setTitleFontMode((previous) => {
      const next: TitleFontMode = previous === 'serif' ? 'sans' : 'serif'

      try {
        window.localStorage.setItem(AI_READING_TITLE_FONT_KEY, next)
      } catch {
        // 忽略写入本地调试偏好失败
      }

      return next
    })
  }

  const questionPreview = sessionResult?.question?.trim() || question.trim()
  const requiredDrawCount = sessionResult?.spread.length ?? 3
  const currentDrawIndex = Math.min(drawnCardIds.length, requiredDrawCount)
  const nextCard = sessionResult?.spread[currentDrawIndex]
  const drawnCards = sessionResult?.spread.slice(0, currentDrawIndex) ?? []
  const revealedCards = useMemo<CelestialTarotArcFlowRevealedCard[]>(() => {
    if (!sessionResult) {
      return []
    }

    return drawnCardIds.flatMap((drawnCardId, index) => {
      const card = sessionResult.spread[index]
      if (!card) {
        return []
      }

      return [{
        drawnCardId,
        label: card.cardName,
        frontImage: resolveAiReadingCardFront(card),
      }]
    })
  }, [drawnCardIds, sessionResult])
  const drawSelectionLabel =
    currentDrawIndex >= requiredDrawCount
      ? '三张牌已归位'
      : nextCard
        ? `点击卡背抽取 ${nextCard.positionLabel}`
        : '点击卡背抽取下一张牌'

  return (
    <section className={className} data-title-font={titleFontMode}>
      {phase === 'draw' && sessionResult ? (
        <GlassPanel
          width="min(100%, 1120px)"
          borderRadius={24}
          backgroundOpacity={0.15}
          saturation={1.3}
          className={styles.shellGlass}
          contentClassName={`${styles.shell} ${styles.drawShell}`}
        >
          <header className={styles.header}>
            <p className={styles.eyebrow}>Celestial Tarot Arc Flow</p>
            <h2 className={styles.title}>进入抽卡过程</h2>
            {questionPreview ? <p className={styles.questionQuote}>“{questionPreview}”</p> : null}
          </header>

          <GlassPanel
            fill
            borderRadius={22}
            backgroundOpacity={0.1}
            saturation={1.22}
            className={styles.drawStageGlass}
            contentClassName={styles.drawStage}
          >
            <CelestialTarotArcFlow
              className={styles.arcFlow}
              mode="draw-sequence"
              drawnCardIds={drawnCardIds}
              revealedCards={revealedCards}
              selectionLimit={requiredDrawCount}
              eyebrow="AI Tarot"
              title="抽取三张牌"
              subtitle="Celestial Arc"
              statusLabel={`${currentDrawIndex} / ${requiredDrawCount}`}
              selectionLabel={drawSelectionLabel}
              hint={
                currentDrawIndex >= requiredDrawCount
                  ? '抽卡完成，正在进入 AI 解读。'
                  : '从上下两道星弧中点击任意卡背，每次点击对应本次牌阵中的下一张牌。'
              }
              onCardDraw={handleDrawCard}
            />
          </GlassPanel>

          <section className={styles.drawnCardsPanel} aria-label="已抽到的牌">
            {sessionResult.spread.map((card, index) => {
              const revealed = index < drawnCards.length

              return (
                <GlassPanel
                  key={card.position}
                  borderRadius={14}
                  backgroundOpacity={revealed ? 0.14 : 0.08}
                  saturation={revealed ? 1.28 : 1.18}
                  className={styles.drawnCardGlass}
                  contentClassName={`${styles.drawnCard} ${revealed ? styles.drawnCardRevealed : ''}`}
                >
                  <p className={styles.cardChipLabel}>{card.positionLabel}</p>
                  <p className={styles.cardChipName}>{revealed ? card.cardName : '等待抽取'}</p>
                </GlassPanel>
              )
            })}
          </section>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className="primary-pill"
              onClick={startAnother}
              disabled={submitting || generationStartedRef.current}
            >
              重新提问
            </button>
          </div>
        </GlassPanel>
      ) : (
        <GlassPanel
          width="min(100%, 460px)"
          borderRadius={24}
          backgroundOpacity={0.15}
          saturation={1.3}
          className={styles.shellGlass}
          contentClassName={
            phase === 'question' ? `${styles.shell} ${styles.questionShell}` : styles.shell
          }
        >
          {phase === 'question' ? (
            <>
              <header className={`${styles.header} ${styles.questionHeader}`}>
                <div className={styles.questionHeaderTop}>
                  <p className={styles.eyebrow}>3 Card Tarot</p>
                  <button
                    type="button"
                    className={styles.fontSwitchButton}
                    onClick={toggleTitleFont}
                    aria-label={titleFontMode === 'serif' ? '切换为无衬线标题' : '切换为衬线标题'}
                  >
                    {titleFontMode === 'serif' ? 'A↔a 衬线' : 'A↔a 无衬线'}
                  </button>
                </div>
                <h2 className={styles.title}>Ask One Clear Question</h2>
                <p className={styles.ritualGlyphs} aria-hidden>
                  ✶ ⟡ ✶
                </p>
                <p className={styles.copy}>
                  只输入这一次你最想确认的问题，随后进入抽卡过程，三张牌归位后再开始 AI 原文流式解读。
                </p>
              </header>

              <GlassPanel
                borderRadius={18}
                backgroundOpacity={0.12}
                saturation={1.24}
                className={styles.inputPanelGlass}
                contentClassName={styles.inputPanel}
              >
                <label htmlFor="ai-reading-question" className={styles.label}>
                  你的问题
                </label>
                <textarea
                  id="ai-reading-question"
                  className={styles.questionInput}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="例如：我该继续这段关系，还是先把重心拉回自己？"
                  rows={6}
                  maxLength={280}
                />
                <p className={styles.counter}>{question.trim().length} / 280</p>
              </GlassPanel>

              <div className={styles.actions}>
                <button
                  type="button"
                  className="primary-pill"
                  onClick={handleSubmit}
                  disabled={!question.trim() || submitting}
                >
                  {submitting ? '正在创建抽卡会话…' : '进入抽卡'}
                </button>
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}
            </>
          ) : sessionResult ? (
            <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>3 Card Tarot Result</p>
              <h2 className={styles.title}>Three Cards & Reading</h2>
              {questionPreview ? (
                <p className={styles.questionQuote}>“{questionPreview}”</p>
              ) : null}
            </header>

            <section className={styles.cardsGrid}>
              {sessionResult.spread.map((card: SpreadCardItem) => (
                <GlassPanel
                  key={card.position}
                  borderRadius={14}
                  backgroundOpacity={0.12}
                  saturation={1.24}
                  className={styles.cardChipGlass}
                  contentClassName={styles.cardChip}
                >
                  <p className={styles.cardChipLabel}>{card.positionLabel}</p>
                  <p className={styles.cardChipName}>{card.cardName}</p>
                </GlassPanel>
              ))}
            </section>

            <GlassPanel
              borderRadius={14}
              backgroundOpacity={0.12}
              saturation={1.24}
              className={styles.blockGlass}
              contentClassName={`${styles.block} ${styles.readingBlock}`}
            >
              <div className={styles.readingHeader}>
                <p className={styles.blockLabel}>{streaming ? '正在流式生成' : '牌面解读'}</p>
                {streaming ? (
                  <p className={styles.streamHint}>
                    <span className={styles.streamDot} />
                    AI 正在输出原文
                  </p>
                ) : null}
              </div>
              <p className={styles.readingText}>
                {readingText || (streaming ? 'AI 正在整理这组三张牌…' : '暂无解读文本')}
              </p>
            </GlassPanel>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="button" className="primary-pill" onClick={startAnother} disabled={submitting}>
                再问一个问题
              </button>
            </div>
            </>
          ) : null}
        </GlassPanel>
      )}
    </section>
  )
}
