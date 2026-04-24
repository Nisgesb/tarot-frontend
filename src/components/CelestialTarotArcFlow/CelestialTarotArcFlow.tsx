import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { ArcFan, type ArcFanConfig } from './ArcFan'
import { createArcLayout } from './arcLayout'
import { TarotCardFace, type TarotCardEntity } from './Card'
import { CARD_FRONT_SOURCES } from './cardFronts'
import styles from './CelestialTarotArcFlow.module.css'

interface TarotCard extends TarotCardEntity {
  family: string
  code: string
}

interface FocusCardState {
  card: TarotCard
  tone: 'luna' | 'sol'
  railId: 'upper' | 'lower'
  origin: {
    x: number
    y: number
    rotation: number
  }
  cardWidth: number
}

interface FanMetrics {
  isMobile: boolean
  cardWidth: number
  hoverDistance: number
  selectedDistance: number
  focusScale: number
  upper: ArcFanConfig
  lower: ArcFanConfig
}

export interface CelestialTarotArcFlowRevealedCard {
  drawnCardId: string
  label: string
  frontImage?: string
}

export interface CelestialTarotArcFlowProps {
  className?: string
  totalCards?: number
  mobileBreakpoint?: number
  autoSpeedCardsPerSecond?: number
  cardBackImage?: string
  mode?: 'explore' | 'draw-sequence'
  drawnCardIds?: string[]
  revealedCards?: CelestialTarotArcFlowRevealedCard[]
  selectionLimit?: number
  eyebrow?: string
  title?: string
  subtitle?: string
  statusLabel?: string
  selectionLabel?: string
  hint?: string
  onCardDraw?: (cardId: string) => void
}

const DEFAULT_TOTAL_CARD_COUNT = 78
const DEFAULT_MOBILE_BREAKPOINT = 768
const DEFAULT_CARD_BACK_IMAGE = '/library/celestial-tarot-arc-flow/cards/card-back.jpg'
const SHUFFLE_INTRO_DURATION_MS = 3120
const DEAL_CARD_STAGGER_S = 0.014
const DEAL_CARD_DURATION_S = 0.66
const DEAL_INTRO_BUFFER_MS = 260
const DRAW_REVEAL_HOLD_MS = 1180

interface ShuffleIntroCardPose {
  id: string
  zIndex: number
  delay: number
  x: number[]
  y: number[]
  rotate: number[]
  scale: number[]
}

interface DealIntroCardPose {
  id: string
  cardId: string
  order: number
  targetX: number
  targetY: number
  targetRotate: number
  midX: number
  midY: number
  midRotate: number
  startX: number
  startY: number
  startRotate: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function buildDeckCards(totalCount: number): TarotCard[] {
  const cardsPerFan = totalCount / 2
  return Array.from({ length: totalCount }, (_, index) => {
    const isUpper = index < cardsPerFan
    const family = isUpper ? 'Aether' : 'Nocturne'
    const prefix = isUpper ? 'aether' : 'nocturne'
    const familyIndex = isUpper ? index : index - cardsPerFan
    const code = String(familyIndex + 1).padStart(2, '0')

    return {
      id: `${prefix}-${code}`,
      family,
      code,
      label: `${family} ${code}`,
      frontImage: CARD_FRONT_SOURCES[index % CARD_FRONT_SOURCES.length],
    }
  })
}

function seededUnit(seed: number) {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function seededRange(seed: number, min: number, max: number) {
  return min + seededUnit(seed) * (max - min)
}

function buildShuffleIntroPile(count: number, isMobile: boolean) {
  const half = (count - 1) / 2
  const orbitRadiusX = isMobile ? 66 : 118
  const orbitRadiusY = isMobile ? 42 : 76
  const cutOffset = isMobile ? 20 : 32
  const swirlLift = isMobile ? 10 : 16

  return Array.from({ length: count }, (_, index) => {
    const fromLeft = index % 2 === 0
    const sideDirection = fromLeft ? -1 : 1
    const centered = index - half
    const ringWeight = 0.78 + (Math.abs(centered) / (half + 1)) * 0.72
    const phase = (index / Math.max(count, 1)) * Math.PI * 2
    const jitterX = seededRange(index + 11, -10, 10)
    const jitterY = seededRange(index + 21, -6, 6)
    const startX = jitterX
    const startY = jitterY + centered * 0.2
    const startRotate = seededRange(index + 31, -8, 8)

    const orbit1X = Math.cos(phase - Math.PI * 0.58) * orbitRadiusX * ringWeight
    const orbit1Y = Math.sin(phase - Math.PI * 0.58) * orbitRadiusY * ringWeight - swirlLift
    const orbit2X = Math.cos(phase + Math.PI * 0.76) * orbitRadiusX * ringWeight * 0.92
    const orbit2Y = Math.sin(phase + Math.PI * 0.76) * orbitRadiusY * ringWeight * 0.9
    const orbit3X = Math.cos(phase + Math.PI * 1.46) * orbitRadiusX * ringWeight * 0.74
    const orbit3Y = Math.sin(phase + Math.PI * 1.46) * orbitRadiusY * ringWeight * 0.72 + swirlLift * 0.2

    const crossX = -orbit1X * 0.38 + seededRange(index + 41, -8, 8)
    const crossY = orbit1Y * 0.24 + seededRange(index + 51, -8, 8)

    const cutX = sideDirection * (cutOffset * (0.42 + Math.abs(centered) / (half + 1))) + seededRange(index + 61, -6, 6)
    const cutY = seededRange(index + 71, -8, 8)

    const stackX = centered * (isMobile ? 0.58 : 0.74)
    const stackY = centered * (isMobile ? 0.96 : 1.3)
    const endX = centered * 0.46
    const endY = centered * 0.68
    const endRotate = centered * 0.16

    const orbit1Rotate = seededRange(index + 81, -28, 28) + centered * 0.22
    const orbit2Rotate = seededRange(index + 91, -24, 24) - centered * 0.16
    const orbit3Rotate = seededRange(index + 101, -16, 16)
    const crossRotate = seededRange(index + 111, -14, 14)
    const cutRotate = sideDirection * seededRange(index + 121, 8, 16)
    const stackRotate = centered * 0.32 + seededRange(index + 131, -4, 4)

    return {
      id: `shuffle-intro-${index}`,
      zIndex: 180 + index,
      delay: index * 0.0038 + (fromLeft ? 0 : 0.0028),
      x: [startX, orbit1X, orbit2X, orbit3X, crossX, cutX, stackX, endX],
      y: [startY, orbit1Y, orbit2Y, orbit3Y, crossY, cutY, stackY, endY],
      rotate: [
        startRotate,
        orbit1Rotate,
        orbit2Rotate,
        orbit3Rotate,
        crossRotate,
        cutRotate,
        stackRotate,
        endRotate,
      ],
      scale: [0.92, 1.02, 1.06, 1.03, 1, 0.98, 1.01, 0.995],
    } satisfies ShuffleIntroCardPose
  })
}

function buildDealIntroCards(
  upperCards: TarotCard[],
  lowerCards: TarotCard[],
  metrics: FanMetrics,
  isMobile: boolean,
) {
  const upperLayout = createArcLayout({
    count: upperCards.length,
    radius: metrics.upper.radius,
    startAngle: metrics.upper.startAngle,
    endAngle: metrics.upper.endAngle,
    centerX: metrics.upper.centerX,
    centerY: metrics.upper.centerY,
    arcSide: metrics.upper.arcSide,
    rotationScale: metrics.upper.rotationScale,
  })
  const lowerLayout = createArcLayout({
    count: lowerCards.length,
    radius: metrics.lower.radius,
    startAngle: metrics.lower.startAngle,
    endAngle: metrics.lower.endAngle,
    centerX: metrics.lower.centerX,
    centerY: metrics.lower.centerY,
    arcSide: metrics.lower.arcSide,
    rotationScale: metrics.lower.rotationScale,
  })

  const poses: DealIntroCardPose[] = []
  for (let index = 0; index < upperCards.length; index += 1) {
    const upperPoint = upperLayout[index]
    const lowerPoint = lowerLayout[index]
    const upperOrder = index * 2
    const lowerOrder = upperOrder + 1
    const upperStartX = seededRange(500 + upperOrder, isMobile ? -16 : -20, isMobile ? 16 : 20)
    const lowerStartX = seededRange(700 + lowerOrder, isMobile ? -16 : -20, isMobile ? 16 : 20)
    const upperStartY = seededRange(900 + upperOrder, isMobile ? -10 : -14, isMobile ? 10 : 14)
    const lowerStartY = seededRange(1100 + lowerOrder, isMobile ? -10 : -14, isMobile ? 10 : 14)

    poses.push({
      id: `deal-upper-${upperCards[index].id}`,
      cardId: upperCards[index].id,
      order: upperOrder,
      targetX: upperPoint.x,
      targetY: upperPoint.y,
      targetRotate: upperPoint.rotation,
      midX: upperPoint.x * 0.64 + upperPoint.outward.x * (isMobile ? -9 : -12) + seededRange(1300 + upperOrder, -6, 6),
      midY: upperPoint.y * 0.64 - (isMobile ? 12 : 16) + seededRange(1500 + upperOrder, -6, 6),
      midRotate: upperPoint.rotation + seededRange(1700 + upperOrder, -7, 7),
      startX: upperStartX,
      startY: upperStartY,
      startRotate: seededRange(1900 + upperOrder, -10, 10),
    })
    poses.push({
      id: `deal-lower-${lowerCards[index].id}`,
      cardId: lowerCards[index].id,
      order: lowerOrder,
      targetX: lowerPoint.x,
      targetY: lowerPoint.y,
      targetRotate: lowerPoint.rotation,
      midX: lowerPoint.x * 0.64 + lowerPoint.outward.x * (isMobile ? -9 : -12) + seededRange(2100 + lowerOrder, -6, 6),
      midY: lowerPoint.y * 0.64 + (isMobile ? 12 : 16) + seededRange(2300 + lowerOrder, -6, 6),
      midRotate: lowerPoint.rotation + seededRange(2500 + lowerOrder, -7, 7),
      startX: lowerStartX,
      startY: lowerStartY,
      startRotate: seededRange(2700 + lowerOrder, -10, 10),
    })
  }

  return poses
}

function useElementSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 1280, height: 860 })

  useEffect(() => {
    if (!ref.current) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [ref])

  return size
}

function createFanMetrics(
  size: { width: number; height: number },
  cardsPerFan: number,
  mobileBreakpoint: number,
): FanMetrics {
  const width = size.width || 1280
  const height = size.height || 860
  const isMobile = width <= mobileBreakpoint
  const compact = width < 920

  if (isMobile) {
    const shortViewport = height < 720
    const cardWidth = clamp(width * (shortViewport ? 0.156 : 0.148), shortViewport ? 52 : 54, shortViewport ? 70 : 74)
    const hoverDistance = Math.round(cardWidth * 0.16)
    const selectedDistance = Math.round(cardWidth * 0.34)
    const radius = Math.min(width * (shortViewport ? 1.06 : 1.02), height * (shortViewport ? 0.52 : 0.49))
    const focusOffsetY = clamp(
      height * (shortViewport ? 0.14 : 0.155),
      shortViewport ? 64 : 76,
      shortViewport ? 112 : 140,
    )
    const topCenterY = -(radius + focusOffsetY)
    const bottomCenterY = radius + focusOffsetY

    return {
      isMobile,
      cardWidth,
      hoverDistance,
      selectedDistance,
      focusScale: 2.8,
      upper: {
        id: 'upper',
        label: 'Upper arc spread',
        tone: 'luna',
        radius,
        arcSide: 'lower',
        startAngle: 128,
        endAngle: 52,
        centerX: 0,
        centerY: topCenterY,
        entryDelayBase: 0.04,
        entryDelayStep: 0.012,
        windowed: true,
        windowCount: Math.min(cardsPerFan, shortViewport ? 17 : 19),
        windowOverscan: 1,
      },
      lower: {
        id: 'lower',
        label: 'Lower arc spread',
        tone: 'sol',
        radius,
        arcSide: 'upper',
        startAngle: 232,
        endAngle: 308,
        centerX: 0,
        centerY: bottomCenterY,
        entryDelayBase: 0.1,
        entryDelayStep: 0.012,
        windowed: true,
        windowCount: Math.min(cardsPerFan, shortViewport ? 17 : 19),
        windowOverscan: 1,
      },
    }
  }

  const cardWidth = clamp(width * (compact ? 0.09 : 0.072), 50, compact ? 66 : 106)
  const hoverDistance = Math.round(cardWidth * 0.13)
  const selectedDistance = Math.round(cardWidth * 0.3)
  const radius = compact ? Math.min(width * 0.5, height * 0.3) : Math.min(width * 0.29, height * 0.44)
  const focusOffsetY = compact ? height * 0.14 : height * 0.19
  const topCenterY = -(radius + focusOffsetY)
  const bottomCenterY = radius + focusOffsetY

  return {
    isMobile,
    cardWidth,
    hoverDistance,
    selectedDistance,
    focusScale: 2.35,
    upper: {
      id: 'upper',
      label: 'Upper arc spread',
      tone: 'luna',
      radius,
      arcSide: 'lower',
      startAngle: compact ? 146 : 140,
      endAngle: compact ? 34 : 40,
      centerX: 0,
      centerY: topCenterY,
      entryDelayBase: 0.05,
      entryDelayStep: 0.024,
      windowed: false,
      windowCount: cardsPerFan,
    },
    lower: {
      id: 'lower',
      label: 'Lower arc spread',
      tone: 'sol',
      radius: radius * 0.985,
      arcSide: 'upper',
      startAngle: compact ? 214 : 220,
      endAngle: compact ? 326 : 320,
      centerX: 0,
      centerY: bottomCenterY,
      entryDelayBase: 0.16,
      entryDelayStep: 0.024,
      windowed: false,
      windowCount: cardsPerFan,
    },
  }
}

interface FocusCardProps {
  focusCard: FocusCardState
  focusScale: number
  cardBackImage: string
  onClear: () => void
  allowClear?: boolean
}

function FocusCard({
  focusCard,
  focusScale,
  cardBackImage,
  onClear,
  allowClear = true,
}: FocusCardProps) {
  const style = {
    '--ctaf-card-width': `${Math.round(focusCard.cardWidth * focusScale)}px`,
    '--ctaf-card-back-image': `url("${cardBackImage}")`,
  } as CSSProperties

  return (
    <motion.button
      type="button"
      className={styles.focusCard}
      onClick={allowClear ? onClear : undefined}
      disabled={!allowClear}
      initial={{
        x: focusCard.origin.x,
        y: focusCard.origin.y,
        rotate: focusCard.origin.rotation,
        scale: 1,
        opacity: 0.94,
      }}
      animate={{
        x: 0,
        y: 0,
        rotate: 0,
        scale: [0.62, 1.16, 1],
        opacity: 1,
      }}
      exit={{
        x: focusCard.origin.x,
        y: focusCard.origin.y,
        rotate: focusCard.origin.rotation,
        scale: 0.86,
        opacity: 0,
      }}
      transition={{
        type: 'spring',
        stiffness: 240,
        damping: 26,
        mass: 0.8,
        scale: {
          duration: 0.72,
          delay: 0.18,
          ease: [0.22, 1, 0.36, 1],
        },
      }}
      style={style}
      aria-label={`Focus ${focusCard.card.label}`}
    >
      <TarotCardFace frontImage={focusCard.card.frontImage} isFaceUp isEmptySlot={false} />
    </motion.button>
  )
}

export function CelestialTarotArcFlow({
  className,
  totalCards = DEFAULT_TOTAL_CARD_COUNT,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  autoSpeedCardsPerSecond = 0.76,
  cardBackImage = DEFAULT_CARD_BACK_IMAGE,
  mode = 'explore',
  drawnCardIds = [],
  revealedCards = [],
  selectionLimit = 3,
  eyebrow = 'Celestial Spread',
  title = 'Choose the Cards',
  subtitle = 'Tarot Tableau',
  statusLabel,
  selectionLabel,
  hint,
  onCardDraw,
}: CelestialTarotArcFlowProps) {
  const normalizedTotalCards = Math.max(2, Math.floor(totalCards / 2) * 2)
  const cardsPerFan = normalizedTotalCards / 2
  const allCards = useMemo(() => buildDeckCards(normalizedTotalCards), [normalizedTotalCards])
  const upperCards = useMemo(() => allCards.slice(0, cardsPerFan), [allCards, cardsPerFan])
  const lowerCards = useMemo(() => allCards.slice(cardsPerFan), [allCards, cardsPerFan])

  const stageRef = useRef<HTMLElement | null>(null)
  const stageSize = useElementSize(stageRef)
  const metrics = useMemo(
    () => createFanMetrics(stageSize, cardsPerFan, mobileBreakpoint),
    [cardsPerFan, mobileBreakpoint, stageSize],
  )
  const isMobile = metrics.isMobile
  const isDrawSequenceMode = mode === 'draw-sequence'
  const revealedCardMap = useMemo(
    () =>
      new Map(
        revealedCards.map((item) => [
          item.drawnCardId,
          {
            id: item.drawnCardId,
            label: item.label,
            frontImage: item.frontImage,
          } satisfies TarotCardEntity,
        ]),
      ),
    [revealedCards],
  )

  const [desktopSelectedId, setDesktopSelectedId] = useState<string | null>(null)
  const [focusCard, setFocusCard] = useState<FocusCardState | null>(null)
  const [showShuffleIntro, setShowShuffleIntro] = useState(true)
  const [showDealIntro, setShowDealIntro] = useState(false)
  const initialUpperTrack = cardsPerFan * 0.15
  const initialLowerTrack = cardsPerFan * 0.61
  const drawRevealTimerRef = useRef<number | null>(null)
  const pendingDrawRef = useRef<{
    drawnCardId: string
    tone: 'luna' | 'sol'
    railId: 'upper' | 'lower'
    layout: { x: number; y: number; rotation: number }
  } | null>(null)
  const revealedCountRef = useRef(revealedCards.length)
  const shuffleIntroPile = useMemo(
    () => buildShuffleIntroPile(Math.min(normalizedTotalCards, 78), isMobile),
    [isMobile, normalizedTotalCards],
  )
  const dealIntroCards = useMemo(
    () => buildDealIntroCards(upperCards, lowerCards, metrics, isMobile),
    [isMobile, lowerCards, metrics, upperCards],
  )
  const shuffleCardWidth = Math.round(
    clamp(metrics.cardWidth * (isMobile ? 1.1 : 1.06), isMobile ? 54 : 70, isMobile ? 88 : 122),
  )
  const dealCardWidth = Math.round(
    clamp(metrics.cardWidth * (isMobile ? 1.04 : 1), isMobile ? 52 : 66, isMobile ? 84 : 112),
  )
  const dealIntroDurationMs = useMemo(
    () =>
      Math.round(
        (normalizedTotalCards - 1) * DEAL_CARD_STAGGER_S * 1000 + DEAL_CARD_DURATION_S * 1000 + DEAL_INTRO_BUFFER_MS,
      ),
    [normalizedTotalCards],
  )

  useEffect(() => {
    const shuffleTimer = window.setTimeout(() => {
      setShowShuffleIntro(false)
      setShowDealIntro(true)
    }, SHUFFLE_INTRO_DURATION_MS)
    const dealTimer = window.setTimeout(() => {
      setShowDealIntro(false)
    }, SHUFFLE_INTRO_DURATION_MS + dealIntroDurationMs)

    return () => {
      window.clearTimeout(shuffleTimer)
      window.clearTimeout(dealTimer)
    }
  }, [dealIntroDurationMs])

  useEffect(() => {
    return () => {
      if (drawRevealTimerRef.current !== null) {
        window.clearTimeout(drawRevealTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isDrawSequenceMode) {
      revealedCountRef.current = revealedCards.length
      pendingDrawRef.current = null
      return
    }

    if (revealedCards.length === 0) {
      revealedCountRef.current = 0
      pendingDrawRef.current = null
      return
    }

    if (revealedCards.length <= revealedCountRef.current) {
      revealedCountRef.current = revealedCards.length
      return
    }

    revealedCountRef.current = revealedCards.length
    const latestReveal = revealedCards[revealedCards.length - 1]
    const pendingDraw = pendingDrawRef.current

    if (!latestReveal || !pendingDraw || pendingDraw.drawnCardId !== latestReveal.drawnCardId) {
      return
    }

    const sourceCard = allCards.find((item) => item.id === latestReveal.drawnCardId)
    if (!sourceCard) {
      return
    }

    if (drawRevealTimerRef.current !== null) {
      window.clearTimeout(drawRevealTimerRef.current)
    }

    setFocusCard({
      card: {
        ...sourceCard,
        label: latestReveal.label,
        frontImage: latestReveal.frontImage,
      },
      tone: pendingDraw.tone,
      railId: pendingDraw.railId,
      origin: {
        x: pendingDraw.layout.x,
        y: pendingDraw.layout.y,
        rotation: pendingDraw.layout.rotation,
      },
      cardWidth: metrics.cardWidth,
    })

    drawRevealTimerRef.current = window.setTimeout(() => {
      setFocusCard((current) => (current?.card.id === latestReveal.drawnCardId ? null : current))
      pendingDrawRef.current = null
    }, DRAW_REVEAL_HOLD_MS)
  }, [allCards, isDrawSequenceMode, metrics.cardWidth, revealedCards])

  const activeFocusCard = isDrawSequenceMode ? focusCard : isMobile ? focusCard : null

  const selectedCard = useMemo(() => {
    if (isDrawSequenceMode) {
      return activeFocusCard?.card ?? null
    }

    const activeId = isMobile ? activeFocusCard?.card.id : desktopSelectedId

    if (!activeId) {
      return null
    }

    return allCards.find((card) => card.id === activeId) ?? null
  }, [activeFocusCard, allCards, desktopSelectedId, isDrawSequenceMode, isMobile])

  const ghostId = isDrawSequenceMode ? activeFocusCard?.card.id ?? null : isMobile ? activeFocusCard?.card.id ?? null : null
  const selectedId = isDrawSequenceMode ? null : isMobile ? null : desktopSelectedId
  const isInteractionLocked = showShuffleIntro || showDealIntro || (isDrawSequenceMode && Boolean(activeFocusCard))
  const showMobileFocusZone = isMobile && !isDrawSequenceMode
  const showDrawFocusZone = isDrawSequenceMode && !showShuffleIntro && !showDealIntro
  const drawFocusScale = isMobile ? metrics.focusScale : Math.max(metrics.focusScale * 0.82, 1.92)

  const handleCardActivate = (payload: {
    card: TarotCardEntity
    tone: 'luna' | 'sol'
    railId: 'upper' | 'lower'
    layout: { x: number; y: number; rotation: number }
  }) => {
    const { card, tone, railId, layout } = payload

    if (isDrawSequenceMode) {
      if (
        isInteractionLocked ||
        drawnCardIds.includes(card.id) ||
        drawnCardIds.length >= selectionLimit
      ) {
        return
      }

      pendingDrawRef.current = {
        drawnCardId: card.id,
        tone,
        railId,
        layout,
      }
      onCardDraw?.(card.id)
      return
    }

    if (isMobile) {
      setFocusCard((previous) => {
        if (previous?.card.id === card.id) {
          return null
        }

        const nextCard = allCards.find((item) => item.id === card.id)
        if (!nextCard) {
          return previous
        }

        return {
          card: nextCard,
          tone,
          railId,
          origin: {
            x: layout.x,
            y: layout.y,
            rotation: layout.rotation,
          },
          cardWidth: metrics.cardWidth,
        }
      })
      return
    }

    setDesktopSelectedId((previous) => (previous === card.id ? null : card.id))
  }

  const rootClassName = [styles.root, className].filter(Boolean).join(' ')
  const effectiveStatusLabel = statusLabel ?? (selectedCard ? 'Held sigil' : 'Ritual motion')
  const effectiveSelectionLabel = selectionLabel ?? (selectedCard ? selectedCard.label : 'Select one card')
  const effectiveHint =
    hint ??
    (selectedCard
      ? 'Tap the focus card to return it, or pick another card from either rail.'
      : isMobile
        ? 'Both rails auto-flow continuously. Tap a card to pull it into the focus zone.'
        : 'Hover lifts outward along the arc. Click to keep one card suspended.')

  return (
    <div className={rootClassName}>
      <main className={styles.stage} ref={stageRef}>
        <div className={`${styles.stageAurora} ${styles.stageAuroraViolet}`} aria-hidden="true" />
        <div className={`${styles.stageAurora} ${styles.stageAuroraIndigo}`} aria-hidden="true" />

        <svg className={styles.stageDiagram} viewBox="0 0 1000 800" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <radialGradient id="ctafCoreGlow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(159, 117, 255, 0.45)" />
              <stop offset="58%" stopColor="rgba(24, 14, 62, 0.08)" />
              <stop offset="100%" stopColor="rgba(6, 3, 20, 0)" />
            </radialGradient>
          </defs>
          <rect width="1000" height="800" fill="none" />
          <circle cx="500" cy="400" r="166" fill="url(#ctafCoreGlow)" />
          <ellipse cx="500" cy="400" rx="420" ry="274" className={styles.stageLineFaint} />
          <ellipse cx="500" cy="400" rx="348" ry="228" className={styles.stageLineSoft} />
          <ellipse cx="500" cy="400" rx="275" ry="178" className={styles.stageLineSoft} />
          <circle cx="500" cy="400" r="124" className={styles.stageLineSoft} />
          <circle cx="500" cy="400" r="78" className={styles.stageLineFaint} />
          <path d="M170 238A350 220 0 0 1 830 238" className={styles.stageLineSoft} />
          <path d="M170 562A350 220 0 0 0 830 562" className={styles.stageLineSoft} />
          <path d="M255 198A285 178 0 0 1 745 198" className={styles.stageLineFaint} />
          <path d="M255 602A285 178 0 0 0 745 602" className={styles.stageLineFaint} />
          <path d="M500 142V658M242 400H758" className={styles.stageLineFaint} />
          <path
            d="M500 244L536 332L626 332L554 388L582 476L500 426L418 476L446 388L374 332L464 332Z"
            className={styles.stageLineSoft}
          />
          <circle cx="500" cy="176" r="5" className={styles.stageStar} />
          <circle cx="310" cy="236" r="4.5" className={styles.stageStar} />
          <circle cx="690" cy="236" r="4.5" className={styles.stageStar} />
          <circle cx="242" cy="400" r="3.6" className={styles.stageStar} />
          <circle cx="758" cy="400" r="3.6" className={styles.stageStar} />
          <circle cx="310" cy="564" r="4.5" className={styles.stageStar} />
          <circle cx="690" cy="564" r="4.5" className={styles.stageStar} />
          <circle cx="500" cy="624" r="5" className={styles.stageStar} />
        </svg>

        <div className={styles.stageDivider} aria-hidden="true" />
        <div className={styles.stageChamber} aria-hidden="true" />

        <div className={styles.stageCopy}>
          <p className={styles.stageEyebrow}>{eyebrow}</p>
          <h2 className={styles.stageTitle}>{title}</h2>
          <p className={styles.stageSubtitle}>{subtitle}</p>
        </div>

        <div className={styles.stageSigil} aria-hidden="true">
          <span className={styles.stageSigilCore} />
        </div>

        <div className={styles.stageStatusbar}>
          <p className={styles.stageStatus}>{effectiveStatusLabel}</p>
          <h3 className={styles.stageSelection}>{effectiveSelectionLabel}</h3>
          <p className={styles.stageHint}>{effectiveHint}</p>
        </div>

        <div className={styles.stageScene}>
          <div className={`${styles.railMask} ${styles.railMaskTop}`} aria-hidden="true" />
          <div className={`${styles.railMask} ${styles.railMaskBottom}`} aria-hidden="true" />
          <div
            className={`${styles.stageSceneContent} ${
              showShuffleIntro || showDealIntro ? styles.stageSceneContentHidden : ''
            }`}
          >
            <ArcFan
              cards={upperCards}
              config={metrics.upper}
              selectedId={selectedId}
              ghostId={ghostId}
              blockedIds={drawnCardIds}
              revealedCardMap={revealedCardMap}
              cardBackImage={cardBackImage}
              disableInteraction={isInteractionLocked}
              onCardActivate={handleCardActivate}
              hoverDistance={metrics.hoverDistance}
              selectedDistance={metrics.selectedDistance}
              cardWidth={metrics.cardWidth}
              initialTrackIndex={initialUpperTrack}
              autoFlow={isMobile}
              autoFlowSpeed={autoSpeedCardsPerSecond}
              autoFlowDirection={1}
              enableSwipe={!isMobile}
            />
            <ArcFan
              cards={lowerCards}
              config={metrics.lower}
              selectedId={selectedId}
              ghostId={ghostId}
              blockedIds={drawnCardIds}
              revealedCardMap={revealedCardMap}
              cardBackImage={cardBackImage}
              disableInteraction={isInteractionLocked}
              onCardActivate={handleCardActivate}
              hoverDistance={metrics.hoverDistance}
              selectedDistance={metrics.selectedDistance}
              cardWidth={metrics.cardWidth}
              initialTrackIndex={initialLowerTrack}
              autoFlow={isMobile}
              autoFlowSpeed={autoSpeedCardsPerSecond}
              autoFlowDirection={-1}
              enableSwipe={!isMobile}
            />

            <div className={styles.mobileFocusZone} aria-hidden={!showMobileFocusZone}>
              <div className={styles.mobileFocusZoneHalo} />
              <div className={styles.mobileFocusZoneGlyph} />
            </div>

            <div className={styles.drawFocusZone} aria-hidden={!showDrawFocusZone}>
              <div className={styles.drawFocusZoneHalo} />
              <div className={styles.drawFocusZoneGlyph} />
            </div>

            <div className={styles.mobileFocusLayer}>
              <div className={styles.mobileFocusLayerOrigin}>
                <AnimatePresence>
                  {showMobileFocusZone && activeFocusCard ? (
                    <FocusCard
                      key={activeFocusCard.card.id}
                      focusCard={activeFocusCard}
                      focusScale={metrics.focusScale}
                      cardBackImage={cardBackImage}
                      onClear={() => setFocusCard(null)}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className={styles.drawFocusLayer}>
              <div className={styles.drawFocusLayerOrigin}>
                <AnimatePresence>
                  {showDrawFocusZone && activeFocusCard ? (
                    <FocusCard
                      key={activeFocusCard.card.id}
                      focusCard={activeFocusCard}
                      focusScale={drawFocusScale}
                      cardBackImage={cardBackImage}
                      onClear={() => setFocusCard(null)}
                      allowClear={false}
                    />
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {showShuffleIntro ? (
              <motion.div
                className={styles.shuffleIntroLayer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.34, ease: 'easeOut' } }}
                aria-hidden="true"
              >
                <motion.div
                  className={styles.shuffleIntroPile}
                  animate={{
                    y: [0, -8, -3, -10, -2, 0],
                    rotate: [0, 1.8, -1.4, 1.1, 0],
                    scale: [0.96, 1.02, 1.03, 1, 1],
                  }}
                  transition={{
                    duration: 2.62,
                    ease: [0.22, 0.92, 0.38, 1],
                    times: [0, 0.24, 0.46, 0.72, 1],
                  }}
                >
                  <motion.div
                    className={styles.shuffleIntroGlyph}
                    animate={{
                      rotate: [0, 12, 24],
                      scale: [0.96, 1.02, 1],
                      opacity: [0.42, 0.66, 0.5],
                    }}
                    transition={{ duration: 2.62, ease: 'easeInOut', times: [0, 0.56, 1] }}
                  />
                  {shuffleIntroPile.map((pose) => (
                    <motion.div
                      key={pose.id}
                      className={styles.shuffleIntroCard}
                      initial={{ x: 0, y: 0, rotate: 0, scale: 0.84, opacity: 0 }}
                      animate={{
                        x: pose.x,
                        y: pose.y,
                        rotate: pose.rotate,
                        scale: pose.scale,
                        opacity: [0, 1, 1, 1, 1, 1, 1, 1],
                      }}
                      transition={{
                        duration: 2.6,
                        delay: pose.delay,
                        ease: [0.22, 0.92, 0.38, 1],
                        times: [0, 0.12, 0.26, 0.4, 0.54, 0.7, 0.84, 1],
                      }}
                      style={
                        {
                          zIndex: pose.zIndex,
                          '--ctaf-card-width': `${shuffleCardWidth}px`,
                          '--ctaf-card-back-image': `url("${cardBackImage}")`,
                        } as CSSProperties
                      }
                    >
                      <span className={styles.arcCardFrame}>
                        <span className={styles.arcCardSurface}>
                          <span className={styles.arcCardArt} aria-hidden="true" />
                          <span className={styles.arcCardGlow} />
                          <span className={styles.arcCardShine} />
                        </span>
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {showDealIntro ? (
              <motion.div
                className={styles.dealIntroLayer}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.24, ease: 'easeOut' } }}
                aria-hidden="true"
              >
                <div className={styles.dealIntroDeckAura} />
                {dealIntroCards.map((pose) => (
                  <motion.div
                    key={pose.id}
                    className={styles.dealIntroCard}
                    initial={{
                      x: pose.startX,
                      y: pose.startY,
                      rotate: pose.startRotate,
                      scale: 0.88,
                      opacity: 0,
                    }}
                    animate={{
                      x: [pose.startX, pose.midX, pose.targetX],
                      y: [pose.startY, pose.midY, pose.targetY],
                      rotate: [pose.startRotate, pose.midRotate, pose.targetRotate],
                      scale: [0.88, 1.03, 1],
                      opacity: [0, 1, 1],
                    }}
                    transition={{
                      duration: DEAL_CARD_DURATION_S,
                      delay: pose.order * DEAL_CARD_STAGGER_S,
                      ease: [0.16, 0.84, 0.34, 1],
                      times: [0, 0.54, 1],
                    }}
                    style={
                      {
                        zIndex: 320 + pose.order,
                        '--ctaf-card-width': `${dealCardWidth}px`,
                        '--ctaf-card-back-image': `url("${cardBackImage}")`,
                      } as CSSProperties
                    }
                  >
                    <span className={styles.arcCardFrame}>
                      <span className={styles.arcCardSurface}>
                        <span className={styles.arcCardArt} aria-hidden="true" />
                        <span className={styles.arcCardGlow} />
                        <span className={styles.arcCardShine} />
                      </span>
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
