import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CelestialTarotArcFlow,
  type CelestialTarotArcFlowRevealedCard,
} from '../components/CelestialTarotArcFlow'
import { resolveAiReadingCardFront } from '../components/CelestialTarotArcFlow/aiReadingCardFronts'
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
  onGoHome: () => void
}

type AiReadingPhase = 'question' | 'draw' | 'reading'
const DRAW_COMPLETION_DELAY_MS = 1600

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

export function AiReadingScene({ active, onGoHome }: AiReadingSceneProps) {
  const [question, setQuestion] = useState('')
  const [phase, setPhase] = useState<AiReadingPhase>('question')
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
    <section className={className}>
      {phase === 'draw' && sessionResult ? (
        <div className={`${styles.shell} ${styles.drawShell}`}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Celestial Tarot Arc Flow</p>
            <h2 className={styles.title}>进入抽卡过程</h2>
            {questionPreview ? <p className={styles.questionQuote}>“{questionPreview}”</p> : null}
          </header>

          <div className={styles.drawStage}>
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
          </div>

          <section className={styles.drawnCardsPanel} aria-label="已抽到的牌">
            {sessionResult.spread.map((card, index) => {
              const revealed = index < drawnCards.length

              return (
                <article
                  key={card.position}
                  className={`${styles.drawnCard} ${revealed ? styles.drawnCardRevealed : ''}`}
                >
                  <p className={styles.cardChipLabel}>{card.positionLabel}</p>
                  <p className={styles.cardChipName}>{revealed ? card.cardName : '等待抽取'}</p>
                </article>
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
            <button
              type="button"
              className="secondary-pill"
              onClick={onGoHome}
              disabled={submitting || generationStartedRef.current}
            >
              返回首页
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.shell}>
          {phase === 'question' ? (
            <>
            <header className={styles.header}>
              <p className={styles.eyebrow}>3 Card Tarot</p>
              <h2 className={styles.title}>Ask One Clear Question</h2>
              <p className={styles.copy}>
                只输入这一次你最想确认的问题，随后进入抽卡过程，三张牌归位后再开始 AI 原文流式解读。
              </p>
            </header>

            <div className={styles.inputPanel}>
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
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className="primary-pill"
                onClick={handleSubmit}
                disabled={!question.trim() || submitting}
              >
                {submitting ? '正在创建抽卡会话…' : '进入抽卡'}
              </button>
              <button type="button" className="secondary-pill" onClick={onGoHome} disabled={submitting}>
                返回首页
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
                <article key={card.position} className={styles.cardChip}>
                  <p className={styles.cardChipLabel}>{card.positionLabel}</p>
                  <p className={styles.cardChipName}>{card.cardName}</p>
                </article>
              ))}
            </section>

            <section className={`${styles.block} ${styles.readingBlock}`}>
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
            </section>

            {error ? <p className={styles.error}>{error}</p> : null}

            <div className={styles.actions}>
              <button type="button" className="primary-pill" onClick={startAnother} disabled={submitting}>
                再问一个问题
              </button>
              <button type="button" className="secondary-pill" onClick={onGoHome} disabled={submitting}>
                返回首页
              </button>
            </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  )
}
