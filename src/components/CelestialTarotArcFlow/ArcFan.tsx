import { useAnimationFrame, useMotionValue } from 'framer-motion'
import { useMemo, useRef, useState } from 'react'
import type { TarotCardEntity } from './Card'
import { Card } from './Card'
import {
  createArcLayout,
  getWindowTrackSlotLayout,
  wrapIndex,
  type ArcLayoutConfig,
  type ArcLayoutPoint,
} from './arcLayout'
import styles from './CelestialTarotArcFlow.module.css'

export interface ArcFanConfig extends Omit<ArcLayoutConfig, 'count'> {
  id: 'upper' | 'lower'
  label: string
  tone: 'luna' | 'sol'
  entryDelayBase: number
  entryDelayStep: number
  windowed: boolean
  windowCount: number
  windowOverscan?: number
}

interface ArcFanProps {
  cards: TarotCardEntity[]
  config: ArcFanConfig
  selectedId: string | null
  ghostId: string | null
  blockedIds?: string[]
  revealedCardMap?: ReadonlyMap<string, TarotCardEntity>
  cardBackImage: string
  disableInteraction?: boolean
  onCardActivate?: (payload: {
    card: TarotCardEntity
    tone: 'luna' | 'sol'
    railId: 'upper' | 'lower'
    layout: ArcLayoutPoint
  }) => void
  hoverDistance: number
  selectedDistance: number
  cardWidth: number
  initialTrackIndex?: number
  autoFlow?: boolean
  autoFlowSpeed?: number
  autoFlowDirection?: 1 | -1
  enableSwipe?: boolean
}

function buildWindowSlots(visibleCount: number, overscan: number) {
  const safeVisibleCount = Math.max(3, visibleCount | 0)
  const safeOverscan = Math.max(0, overscan | 0)
  const baseRenderCount = safeVisibleCount + safeOverscan * 2
  const renderCount = baseRenderCount % 2 === 0 ? baseRenderCount + 1 : baseRenderCount
  const halfWindow = (renderCount - 1) / 2

  return {
    safeVisibleCount,
    slots: Array.from({ length: renderCount }, (_, slotIndex) => {
      const offset = slotIndex - halfWindow
      return {
        slotIndex,
        offset,
        depthBias: renderCount - Math.abs(offset),
      }
    }),
  }
}

export function ArcFan({
  cards,
  config,
  selectedId,
  ghostId,
  blockedIds = [],
  revealedCardMap,
  cardBackImage,
  disableInteraction = false,
  onCardActivate,
  hoverDistance,
  selectedDistance,
  cardWidth,
  initialTrackIndex = 0,
  autoFlow = false,
  autoFlowSpeed = 0.5,
  autoFlowDirection = 1,
  enableSwipe = true,
}: ArcFanProps) {
  const isWindowed = Boolean(config.windowed)
  const windowCount = config.windowCount ?? 9
  const windowOverscan = config.windowOverscan ?? 0
  const swipeStep = Math.max(24, cardWidth * 0.9)
  const canSwipe = isWindowed && enableSwipe
  const normalizedInitialTrack = wrapIndex(initialTrackIndex, cards.length)
  const [suppressClick, setSuppressClick] = useState(false)
  const [anchor, setAnchor] = useState(Math.floor(normalizedInitialTrack))
  const trackMotion = useMotionValue(normalizedInitialTrack)
  const trackRef = useRef(normalizedInitialTrack)
  const anchorRef = useRef(Math.floor(normalizedInitialTrack))
  const swipeRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startIndex: 0,
  })

  const blockedIdSet = useMemo(() => new Set(blockedIds), [blockedIds])
  const windowSlots = useMemo(
    () => buildWindowSlots(windowCount, windowOverscan),
    [windowCount, windowOverscan],
  )
  const slotCards = useMemo(
    () => cards.map((card) => (ghostId === card.id ? null : card)),
    [cards, ghostId],
  )

  const updateTrack = (nextIndex: number) => {
    const normalized = wrapIndex(nextIndex, cards.length)
    trackRef.current = normalized
    trackMotion.set(normalized)
    const nextAnchor = Math.floor(normalized)

    if (nextAnchor !== anchorRef.current) {
      anchorRef.current = nextAnchor
      setAnchor(nextAnchor)
    }
  }

  useAnimationFrame((_, delta) => {
    if (!isWindowed || !autoFlow || swipeRef.current.active) {
      return
    }

    const next = trackRef.current + autoFlowDirection * autoFlowSpeed * (delta / 1000)
    updateTrack(next)
  })

  const renderItems = useMemo(() => {
    if (!isWindowed) {
      return createArcLayout({ ...config, count: cards.length }).map((layout) => ({
        key: `slot-${layout.index}-${slotCards[layout.index]?.id ?? 'empty'}`,
        card: slotCards[layout.index],
        layout,
        slotIndex: layout.index,
      }))
    }

    return windowSlots.slots.map((slot) => {
      const slotIndex = wrapIndex(anchor + slot.offset, cards.length)
      const layout = getWindowTrackSlotLayout({
        trackIndex: anchor,
        slotCount: cards.length,
        slotIndex,
        visibleCount: windowSlots.safeVisibleCount,
        radius: config.radius,
        startAngle: config.startAngle,
        endAngle: config.endAngle,
        centerX: config.centerX,
        centerY: config.centerY,
        arcSide: config.arcSide,
        rotationScale: config.rotationScale,
        depthBias: slot.depthBias,
      })

      return {
        key: `slot-${slotIndex}-${slotCards[slotIndex]?.id ?? 'empty'}`,
        card: slotCards[slotIndex],
        layout,
        slotIndex,
      }
    })
  }, [anchor, cards.length, config, isWindowed, slotCards, windowSlots])

  const beginSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe) {
      return
    }

    swipeRef.current.active = true
    swipeRef.current.moved = false
    swipeRef.current.pointerId = event.pointerId
    swipeRef.current.startX = event.clientX
    swipeRef.current.startIndex = trackRef.current
    setSuppressClick(false)

    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const updateSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || !swipeRef.current.active || swipeRef.current.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - swipeRef.current.startX
    if (Math.abs(dx) > 4) {
      swipeRef.current.moved = true
      setSuppressClick(true)
    }

    updateTrack(swipeRef.current.startIndex - dx / swipeStep)
  }

  const endSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSwipe || !swipeRef.current.active || swipeRef.current.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId)
    swipeRef.current.active = false
    swipeRef.current.pointerId = -1

    if (swipeRef.current.moved) {
      updateTrack(Math.round(trackRef.current))
      window.setTimeout(() => {
        setSuppressClick(false)
      }, 120)
      return
    }

    setSuppressClick(false)
  }

  const fanClassName = [
    styles.arcFan,
    isWindowed && styles.arcFanWindowed,
    config.id === 'upper' && styles.arcFanUpper,
    config.id === 'lower' && styles.arcFanLower,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={fanClassName}
      aria-label={config.label}
      onPointerDown={canSwipe ? beginSwipe : undefined}
      onPointerMove={canSwipe ? updateSwipe : undefined}
      onPointerUp={canSwipe ? endSwipe : undefined}
      onPointerCancel={canSwipe ? endSwipe : undefined}
      onPointerLeave={canSwipe ? endSwipe : undefined}
    >
      {renderItems.map(({ key, card, layout, slotIndex }) => {
        if (!card) {
          return null
        }

        const isGhost = Boolean(card && ghostId === card.id)
        const isSelected = Boolean(card && selectedId === card.id && !isGhost)
        const isBlocked = blockedIdSet.has(card.id)
        const revealedCard = revealedCardMap?.get(card.id) ?? null

        return (
          <Card
            key={key}
            card={card}
            revealedCard={revealedCard}
            tone={config.tone}
            layout={layout}
            cardWidth={cardWidth}
            cardBackImage={cardBackImage}
            hoverDistance={hoverDistance}
            selectedDistance={selectedDistance}
            entryDelay={
              isWindowed
                ? 0
                : config.entryDelayBase + Math.max(layout.depthBias, 0) * config.entryDelayStep
            }
            isSelected={isSelected}
            isGhost={isGhost}
            isBlocked={isBlocked}
            disableInteraction={disableInteraction || (canSwipe ? suppressClick : false)}
            disableIntroAnimation={isWindowed}
            continuousMotion={isWindowed}
            windowMotion={
              isWindowed
                ? {
                    track: trackMotion,
                    slotIndex,
                    slotCount: cards.length,
                    visibleCount: windowSlots.safeVisibleCount,
                    radius: config.radius,
                    startAngle: config.startAngle,
                    endAngle: config.endAngle,
                    centerX: config.centerX,
                    centerY: config.centerY,
                    arcSide: config.arcSide,
                    rotationScale: config.rotationScale,
                  }
                : undefined
            }
            onToggle={
              card
                ? () => {
                    const liveLayout = isWindowed
                      ? getWindowTrackSlotLayout({
                          trackIndex: trackRef.current,
                          slotCount: cards.length,
                          slotIndex,
                          visibleCount: windowSlots.safeVisibleCount,
                          radius: config.radius,
                          startAngle: config.startAngle,
                          endAngle: config.endAngle,
                          centerX: config.centerX,
                          centerY: config.centerY,
                          arcSide: config.arcSide,
                          rotationScale: config.rotationScale,
                          depthBias: layout.depthBias,
                        })
                      : layout

                    onCardActivate?.({
                      card,
                      tone: config.tone,
                      railId: config.id,
                      layout: {
                        ...liveLayout,
                        index: slotIndex,
                      },
                    })
                  }
                : undefined
            }
          />
        )
      })}
    </div>
  )
}
