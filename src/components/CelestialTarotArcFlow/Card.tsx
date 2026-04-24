import { motion, useTransform, type MotionValue } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { shortestCircularDelta, type ArcLayoutPoint, type ArcSide } from './arcLayout'
import styles from './CelestialTarotArcFlow.module.css'

export interface TarotCardEntity {
  id: string
  label: string
  frontImage?: string
}

interface CardProps {
  card: TarotCardEntity | null
  revealedCard?: TarotCardEntity | null
  tone: 'luna' | 'sol'
  layout: ArcLayoutPoint
  cardWidth: number
  cardBackImage: string
  hoverDistance: number
  selectedDistance: number
  entryDelay: number
  isSelected: boolean
  isGhost?: boolean
  isBlocked?: boolean
  disableInteraction?: boolean
  disableIntroAnimation?: boolean
  continuousMotion?: boolean
  windowMotion?: {
    track: MotionValue<number>
    slotIndex: number
    slotCount: number
    visibleCount: number
    radius: number
    startAngle: number
    endAngle: number
    centerX: number
    centerY: number
    arcSide: ArcSide
    rotationScale?: number
  }
  onToggle?: () => void
}

function buildCardClassName(
  isHovered: boolean,
  isSelected: boolean,
  isRevealed: boolean,
  isGhost: boolean,
  isBlocked: boolean,
  isEmptySlot: boolean,
) {
  return [
    styles.arcCard,
    isHovered && styles.arcCardHovered,
    isSelected && styles.arcCardSelected,
    isRevealed && styles.arcCardRevealed,
    isGhost && styles.arcCardGhost,
    isBlocked && styles.arcCardBlocked,
    isEmptySlot && styles.arcCardEmpty,
  ]
    .filter(Boolean)
    .join(' ')
}

function buildCardStyle(cardWidth: number, cardBackImage: string) {
  return {
    '--ctaf-card-width': `${cardWidth}px`,
    '--ctaf-card-back-image': `url("${cardBackImage}")`,
  } as CSSProperties
}

interface CommonButtonProps {
  card: TarotCardEntity | null
  displayCard: TarotCardEntity | null
  tone: 'luna' | 'sol'
  cardStyle: CSSProperties
  cardClassName: string
  frontImage?: string
  canInteract: boolean
  isFaceUp: boolean
  isSelected: boolean
  isGhost: boolean
  isEmptySlot: boolean
  scale: number
  disableIntroAnimation: boolean
  onHoverStart: () => void
  onHoverEnd: () => void
  onToggle?: () => void
}

const FLIP_SCALE_DELAY_S = 0.18

export function TarotCardFace({
  frontImage,
  isFaceUp,
  isEmptySlot,
}: {
  frontImage?: string
  isFaceUp: boolean
  isEmptySlot: boolean
}) {
  const isFrontVisible = Boolean(isFaceUp && frontImage)
  const flipClassName = [styles.cardFlip, isFrontVisible && styles.cardFlipFaceUp]
    .filter(Boolean)
    .join(' ')
  const surfaceClassName = [
    styles.arcCardSurface,
    isFaceUp && isFrontVisible && styles.arcCardSurfaceRevealed,
  ]
    .filter(Boolean)
    .join(' ')
  const flipFlashClassName = [
    styles.cardFlipFlash,
    isFaceUp && isFrontVisible && styles.cardFlipFlashActive,
    isFaceUp && isFrontVisible && styles.cardFlipFlashRevealed,
  ]
    .filter(Boolean)
    .join(' ')
  const magicRingClassName = [
    styles.cardMagicRing,
    isFaceUp && isFrontVisible && styles.cardMagicRingBurst,
    isFaceUp && isFrontVisible && styles.cardMagicRingActive,
  ]
    .filter(Boolean)
    .join(' ')
  const frontFaceClassName = [
    styles.cardFace,
    styles.cardFaceFront,
    isFrontVisible && styles.cardFaceVisible,
    isFaceUp && isFrontVisible && styles.cardFaceFrontShimmer,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={styles.arcCardFrame}>
      <span className={surfaceClassName}>
        <span className={flipClassName}>
          <span
            className={[
              styles.cardFace,
              styles.cardFaceBack,
              isFrontVisible && styles.cardFaceHidden,
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.arcCardArt} aria-hidden="true" />
          </span>
          <span className={frontFaceClassName}>
            {frontImage ? (
              <img
                className={styles.cardFrontImage}
                src={frontImage}
                alt=""
                loading={isFaceUp ? 'eager' : 'lazy'}
                decoding="async"
              />
            ) : null}
          </span>
        </span>
        <span className={flipFlashClassName} />
        <span className={magicRingClassName} />
        {!isEmptySlot ? (
          <>
            <span className={styles.arcCardGlow} />
            <span className={styles.arcCardShine} />
          </>
        ) : (
          <span className={styles.arcCardVoid} />
        )}
      </span>
    </span>
  )
}

interface StaticMotionButtonProps extends CommonButtonProps {
  layout: ArcLayoutPoint
  distance: number
  entryDelay: number
  continuousMotion: boolean
}

function StaticMotionButton({
  card,
  displayCard,
  tone,
  cardStyle,
  cardClassName,
  frontImage,
  canInteract,
  isFaceUp,
  isSelected,
  isGhost,
  isEmptySlot,
  scale,
  disableIntroAnimation,
  onHoverStart,
  onHoverEnd,
  onToggle,
  layout,
  distance,
  entryDelay,
  continuousMotion,
}: StaticMotionButtonProps) {
  const cardLabel = displayCard?.label ?? card?.label ?? 'Empty slot'
  const targetX = layout.x + layout.outward.x * distance
  const targetY = layout.y + layout.outward.y * distance
  const transition = continuousMotion
    ? {
        x: { duration: 0.14, ease: 'linear' },
        y: { duration: 0.14, ease: 'linear' },
        rotate: { duration: 0.14, ease: 'linear' },
        scale: {
          duration: 0.4,
          delay: isSelected ? FLIP_SCALE_DELAY_S + 0.06 : 0,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
        opacity: {
          duration: 0.22,
          ease: 'linear',
        },
      }
    : {
        duration: 0.86,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        delay: entryDelay,
        opacity: {
          duration: 0.34,
          ease: 'easeOut',
          delay: entryDelay,
        },
        scale: {
          duration: 0.46,
          delay: entryDelay + (isSelected ? FLIP_SCALE_DELAY_S + 0.06 : 0),
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
      }

  return (
    <motion.button
      type="button"
      aria-label={cardLabel}
      aria-pressed={Boolean(isFaceUp && !isEmptySlot)}
      className={cardClassName}
      data-tone={tone}
      disabled={!canInteract}
      style={cardStyle}
      initial={disableIntroAnimation ? false : { x: 0, y: 0, rotate: 0, scale: 0.82, opacity: 0 }}
      animate={{
        x: targetX,
        y: targetY,
        rotate: layout.rotation,
        scale,
        opacity: isGhost ? 0.36 : 1,
      }}
      transition={transition}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={() => canInteract && onToggle?.()}
    >
      <TarotCardFace frontImage={frontImage} isFaceUp={isFaceUp} isEmptySlot={isEmptySlot} />
    </motion.button>
  )
}

interface WindowMotionButtonProps extends CommonButtonProps {
  distance: number
  windowMotion: NonNullable<CardProps['windowMotion']>
  railZBase: number
}

function WindowMotionButton({
  card,
  displayCard,
  tone,
  cardStyle,
  cardClassName,
  frontImage,
  canInteract,
  isFaceUp,
  isSelected,
  isGhost,
  isEmptySlot,
  scale,
  disableIntroAnimation,
  onHoverStart,
  onHoverEnd,
  onToggle,
  distance,
  windowMotion,
  railZBase,
}: WindowMotionButtonProps) {
  const cardLabel = displayCard?.label ?? card?.label ?? 'Empty slot'
  const distanceRef = useRef(distance)
  const stepAngle = (windowMotion.endAngle - windowMotion.startAngle) / (windowMotion.visibleCount - 1)
  const middleAngle = (windowMotion.startAngle + windowMotion.endAngle) * 0.5
  const middleReference = windowMotion.arcSide === 'lower' ? 90 : 270
  const rotationScale = windowMotion.rotationScale ?? 1

  useEffect(() => {
    distanceRef.current = distance
  }, [distance])

  const motionPose = useTransform(windowMotion.track, (latest) => {
    const relative = shortestCircularDelta(windowMotion.slotIndex, latest, windowMotion.slotCount)
    const angleDegrees = middleAngle + relative * stepAngle
    const angle = (angleDegrees * Math.PI) / 180
    const normalX = Math.cos(angle)
    const normalY = Math.sin(angle)
    const distanceOffset = distanceRef.current
    const radialDistance = windowMotion.radius + distanceOffset
    let delta = angleDegrees - middleReference

    if (delta > 180) {
      delta -= 360
    }

    if (delta < -180) {
      delta += 360
    }

    const rotation = windowMotion.arcSide === 'lower' ? -delta : delta

    return {
      x: windowMotion.centerX + normalX * radialDistance,
      y: windowMotion.centerY + normalY * radialDistance,
      rotate: rotation * rotationScale,
    }
  })

  const motionX = useTransform(motionPose, (pose) => pose.x)
  const motionY = useTransform(motionPose, (pose) => pose.y)
  const motionRotate = useTransform(motionPose, (pose) => pose.rotate)
  const motionZIndex = useTransform(windowMotion.track, (latest) => {
    const relative = shortestCircularDelta(windowMotion.slotIndex, latest, windowMotion.slotCount)
    const depth = windowMotion.visibleCount - Math.abs(relative)

    return railZBase + depth
  })

  return (
    <motion.button
      type="button"
      aria-label={cardLabel}
      aria-pressed={Boolean(isFaceUp && !isEmptySlot)}
      className={cardClassName}
      data-tone={tone}
      disabled={!canInteract}
      style={{
        ...cardStyle,
        x: motionX,
        y: motionY,
        rotate: motionRotate,
        zIndex: motionZIndex,
      }}
      initial={disableIntroAnimation ? false : { scale: 0.82, opacity: 0 }}
      animate={{
        scale,
        opacity: isGhost ? 0.36 : 1,
      }}
      transition={{
        scale: {
          duration: 0.4,
          delay: isSelected ? FLIP_SCALE_DELAY_S + 0.06 : 0,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
        opacity: {
          duration: 0.22,
          ease: 'linear',
        },
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      onClick={() => canInteract && onToggle?.()}
    >
      <TarotCardFace frontImage={frontImage} isFaceUp={isFaceUp} isEmptySlot={isEmptySlot} />
    </motion.button>
  )
}

export function Card({
  card,
  revealedCard = null,
  tone,
  layout,
  cardWidth,
  cardBackImage,
  hoverDistance,
  selectedDistance,
  entryDelay,
  isSelected,
  isGhost = false,
  isBlocked = false,
  disableInteraction = false,
  disableIntroAnimation = false,
  continuousMotion = false,
  windowMotion,
  onToggle,
}: CardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isEmptySlot = card === null
  if (isEmptySlot) {
    return null
  }

  const displayCard = revealedCard ?? card
  const isRevealed = Boolean(revealedCard?.frontImage)
  const canInteract = !isGhost && !isBlocked && !disableInteraction
  const revealedDistance = Math.max(Math.round(selectedDistance * 0.46), hoverDistance + 6)
  const distance = isGhost
    ? 0
    : isSelected
      ? selectedDistance + (isHovered ? hoverDistance * 0.3 : 0)
      : isRevealed
        ? revealedDistance
      : isHovered
        ? hoverDistance
        : 0
  const scale = isGhost
    ? 1
    : isSelected
      ? isBlocked
        ? isHovered
          ? 1.09
          : 1.06
        : isHovered
          ? 1.72
          : 1.62
      : isRevealed
        ? 1.08
      : isHovered
        ? 1.03
        : 1
  const zIndex = isGhost
    ? 6 + layout.depthBias
    : isSelected
      ? 320 + layout.depthBias
      : isRevealed
        ? 260 + layout.depthBias
      : isHovered
        ? 220 + layout.depthBias
        : 24 + layout.depthBias
  const railZBase = isGhost ? 6 : isSelected ? 320 : isRevealed ? 260 : isHovered ? 220 : 24

  const cardStyle = buildCardStyle(cardWidth, cardBackImage)
  const cardClassName = buildCardClassName(isHovered, isSelected, isRevealed, isGhost, isBlocked, false)
  const handleHoverStart = () => canInteract && setIsHovered(true)
  const handleHoverEnd = () => setIsHovered(false)
  const anchorStyle = windowMotion ? undefined : { zIndex }
  const frontImage = revealedCard?.frontImage ?? (isBlocked ? undefined : card?.frontImage)
  const isFaceUp = isSelected || isRevealed

  return (
    <div className={styles.cardAnchor} style={anchorStyle}>
      {windowMotion ? (
        <WindowMotionButton
          card={card}
          displayCard={displayCard}
          tone={tone}
          cardStyle={cardStyle}
          cardClassName={cardClassName}
          frontImage={frontImage}
          canInteract={canInteract}
          isFaceUp={isFaceUp}
          isSelected={isSelected}
          isGhost={isGhost}
          isEmptySlot={isEmptySlot}
          scale={scale}
          disableIntroAnimation={disableIntroAnimation}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onToggle={() => {
            setIsHovered(false)
            onToggle?.()
          }}
          distance={distance}
          windowMotion={windowMotion}
          railZBase={railZBase}
        />
      ) : (
        <StaticMotionButton
          card={card}
          displayCard={displayCard}
          tone={tone}
          cardStyle={cardStyle}
          cardClassName={cardClassName}
          frontImage={frontImage}
          canInteract={canInteract}
          isFaceUp={isFaceUp}
          isSelected={isSelected}
          isGhost={isGhost}
          isEmptySlot={isEmptySlot}
          scale={scale}
          disableIntroAnimation={disableIntroAnimation}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
          onToggle={() => {
            setIsHovered(false)
            onToggle?.()
          }}
          layout={layout}
          distance={distance}
          entryDelay={entryDelay}
          continuousMotion={continuousMotion}
        />
      )}
    </div>
  )
}
