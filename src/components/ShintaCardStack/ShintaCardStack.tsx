import { animate, motion, type MotionValue, useMotionValue } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import styles from './ShintaCardStack.module.css'

type StackPhase = 'idle' | 'dragging' | 'settling' | 'reorder'
type SettlePath = 'none' | 'return' | 'reorder'

interface DepthSlot {
  depth: number
  x: number
  y: number
  scale: number
  rotate: number
  zIndex: number
}

interface GhostCardState {
  itemIndex: number
  targetDepth: number
  hiddenDepth: number
}

interface AnimationHandle {
  stop: () => void
  then?: (onResolve: () => void, onReject?: () => void) => Promise<void>
}

export interface ShintaCardRenderContext {
  isFront: boolean
  slot: 'front' | 'middle' | 'back'
  absoluteIndex: number
}

export interface ShintaCardStackItem {
  id: string
  render: (context: ShintaCardRenderContext) => ReactNode
}

export interface ShintaCardStackProps {
  items: ShintaCardStackItem[]
  cardWidth?: number
  cardHeight?: number
  swipeThreshold?: number
  initialIndex?: number
  className?: string
  autoResponsive?: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, ms)
  })
}

function computeDepthSlot(depth: number, total: number): DepthSlot {
  if (depth <= 0) {
    return {
      depth: 0,
      x: 0,
      y: 0,
      scale: 1,
      rotate: 0,
      zIndex: total + 2,
    }
  }

  const denominator = Math.max(1, total - 1)
  const progress = clamp(depth / denominator, 0, 1)
  const eased = Math.pow(progress, 0.86)

  return {
    depth,
    x: -84 * eased,
    y: 24 * eased,
    scale: clamp(1 - 0.105 * eased, 0.86, 1),
    rotate: -6 * eased,
    zIndex: Math.max(1, total - depth + 1),
  }
}

function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('button, a, input, textarea, select, [data-shinta-card-action]'))
}

function StackCard({
  children,
  compactShadow = false,
}: {
  children: ReactNode
  compactShadow?: boolean
}) {
  return (
    <div className={joinClassNames(styles.stackCard, compactShadow && styles.stackCardBack)}>
      {children}
    </div>
  )
}

export function ShintaCardStack({
  items,
  cardWidth = 360,
  cardHeight = 640,
  swipeThreshold = 110,
  initialIndex = 0,
  className,
  autoResponsive = true,
}: ShintaCardStackProps) {
  const total = items.length
  const normalizedInitial = total > 0 ? ((initialIndex % total) + total) % total : 0
  const [activeIndex, setActiveIndex] = useState(normalizedInitial)
  const [phase, setPhase] = useState<StackPhase>('idle')
  const [settlePath, setSettlePath] = useState<SettlePath>('none')
  const [ghostCard, setGhostCard] = useState<GhostCardState | null>(null)

  const phaseRef = useRef<StackPhase>('idle')
  const activeIndexRef = useRef(activeIndex)
  const pointerIdRef = useRef<number | null>(null)
  const dragSessionIdRef = useRef(0)
  const settledSessionIdRef = useRef(0)
  const currentSessionIdRef = useRef(0)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const currentOffsetRef = useRef({ x: 0, y: 0 })
  const runningAnimationsRef = useRef<AnimationHandle[]>([])

  const frontX = useMotionValue(0)
  const frontY = useMotionValue(0)
  const frontRotate = useMotionValue(0)
  const frontScale = useMotionValue(1)
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)
  const ghostRotate = useMotionValue(0)
  const ghostScale = useMotionValue(1)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? cardWidth : window.innerWidth,
    height: typeof window === 'undefined' ? cardHeight : window.innerHeight,
  }))

  const normalizeIndex = useCallback(
    (index: number) => {
      if (total < 1) {
        return 0
      }
      return ((index % total) + total) % total
    },
    [total],
  )

  const displacementThreshold = Math.max(16, swipeThreshold * 0.145)
  const stackSize = useMemo(() => {
    if (!autoResponsive) {
      return { width: cardWidth, height: cardHeight }
    }

    const shouldAdapt = viewport.width <= 1024 || viewport.height < cardHeight + 140
    if (!shouldAdapt) {
      return { width: cardWidth, height: cardHeight }
    }

    const horizontalPadding = viewport.width <= 820 ? 24 : 40
    const verticalPadding = viewport.width <= 820 ? 72 : 96
    const maxWidth = Math.max(180, viewport.width - horizontalPadding)
    const maxHeight = Math.max(300, viewport.height - verticalPadding)
    const widthByHeight = (maxHeight * cardWidth) / cardHeight
    const width = Math.min(cardWidth, maxWidth, widthByHeight)
    const height = (width * cardHeight) / cardWidth

    return {
      width: Math.round(width),
      height: Math.round(height),
    }
  }, [autoResponsive, cardHeight, cardWidth, viewport.height, viewport.width])

  const orderedIndices = useMemo(() => {
    if (total < 1) {
      return []
    }
    return Array.from({ length: total }, (_, depth) => normalizeIndex(activeIndex + depth))
  }, [activeIndex, normalizeIndex, total])

  const stackLayers = useMemo(() => {
    return orderedIndices.slice(1).map((itemIndex, depthOffset) => {
      const depth = depthOffset + 1
      return {
        depth,
        itemIndex,
        transform: computeDepthSlot(depth, total),
      }
    })
  }, [orderedIndices, total])

  const setPhaseSafe = useCallback((next: StackPhase) => {
    phaseRef.current = next
    setPhase(next)
  }, [])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    setActiveIndex((previous) => normalizeIndex(previous))
  }, [normalizeIndex])

  useEffect(() => {
    if (!autoResponsive) {
      return
    }

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    updateViewport()
    window.addEventListener('resize', updateViewport)
    window.addEventListener('orientationchange', updateViewport)

    return () => {
      window.removeEventListener('resize', updateViewport)
      window.removeEventListener('orientationchange', updateViewport)
    }
  }, [autoResponsive])

  const stopRunningAnimations = useCallback(() => {
    for (const animation of runningAnimationsRef.current) {
      animation.stop()
    }
    runningAnimationsRef.current = []
  }, [])

  const waitForControls = useCallback(async (controls: AnimationHandle[], fallbackMs: number) => {
    const completions = controls
      .filter((control) => typeof control.then === 'function')
      .map(
        (control) =>
          new Promise<void>((resolve) => {
            const onDone = () => resolve()
            void control.then?.(onDone, onDone)
          }),
      )

    if (completions.length === 0) {
      await sleep(fallbackMs)
      return
    }

    await Promise.race([Promise.all(completions), sleep(fallbackMs)])
  }, [])

  const playAnimation = useCallback(
    (value: MotionValue<number>, target: number, options: Record<string, unknown>) => {
      const controls = animate(value, target, options) as AnimationHandle
      runningAnimationsRef.current.push(controls)
      return controls
    },
    [],
  )

  const applyFrontMotion = useCallback(
    (x: number, y: number, rotate: number) => {
      frontX.set(x)
      frontY.set(y)
      frontRotate.set(rotate)
    },
    [frontRotate, frontX, frontY],
  )

  const resetFrontInstant = useCallback(() => {
    stopRunningAnimations()
    applyFrontMotion(0, 0, 0)
    frontScale.set(1)
    currentOffsetRef.current = { x: 0, y: 0 }
  }, [applyFrontMotion, frontScale, stopRunningAnimations])

  const animateReturnToOrigin = useCallback(async () => {
    stopRunningAnimations()
    const controls = [
      playAnimation(frontX, 0, {
        type: 'spring',
        stiffness: 520,
        damping: 34,
        mass: 0.62,
      }),
      playAnimation(frontY, 0, {
        type: 'spring',
        stiffness: 520,
        damping: 34,
        mass: 0.62,
      }),
      playAnimation(frontRotate, 0, {
        type: 'spring',
        stiffness: 480,
        damping: 30,
        mass: 0.56,
      }),
      playAnimation(frontScale, 1, {
        duration: 0.16,
        ease: [0.22, 1, 0.36, 1],
      }),
    ]

    await waitForControls(controls, 320)
  }, [frontRotate, frontScale, frontX, frontY, playAnimation, stopRunningAnimations, waitForControls])

  const animateGhostIntoBottom = useCallback(
    async (releaseX: number, releaseY: number, target: DepthSlot) => {
      const vectorX = target.x - releaseX
      const vectorY = target.y - releaseY
      const length = Math.hypot(vectorX, vectorY) || 1
      const impactDistance = 16
      const impactX = target.x + (vectorX / length) * impactDistance
      const impactY = target.y + (vectorY / length) * impactDistance

      stopRunningAnimations()
      const flightControls = [
        playAnimation(ghostX, impactX, {
          duration: 0.11,
          ease: [0.22, 1, 0.36, 1],
        }),
        playAnimation(ghostY, impactY, {
          duration: 0.11,
          ease: [0.22, 1, 0.36, 1],
        }),
        playAnimation(ghostRotate, target.rotate - 1.4, {
          duration: 0.11,
          ease: [0.22, 1, 0.36, 1],
        }),
        playAnimation(ghostScale, clamp(target.scale * 0.985, 0.84, 1), {
          duration: 0.11,
          ease: [0.22, 1, 0.36, 1],
        }),
      ]
      await waitForControls(flightControls, 180)

      stopRunningAnimations()
      const settleControls = [
        playAnimation(ghostX, target.x, {
          type: 'spring',
          stiffness: 640,
          damping: 34,
          mass: 0.56,
        }),
        playAnimation(ghostY, target.y, {
          type: 'spring',
          stiffness: 640,
          damping: 34,
          mass: 0.56,
        }),
        playAnimation(ghostRotate, target.rotate, {
          type: 'spring',
          stiffness: 580,
          damping: 33,
          mass: 0.52,
        }),
        playAnimation(ghostScale, target.scale, {
          type: 'spring',
          stiffness: 560,
          damping: 32,
          mass: 0.54,
        }),
      ]
      await waitForControls(settleControls, 300)
    },
    [ghostRotate, ghostScale, ghostX, ghostY, playAnimation, stopRunningAnimations, waitForControls],
  )

  const finalizeSession = useCallback(
    async (sessionId: number) => {
      if (sessionId !== currentSessionIdRef.current) {
        return
      }
      if (phaseRef.current !== 'dragging') {
        return
      }

      let isCleaned = false
      const cleanup = () => {
        if (isCleaned) {
          return
        }
        isCleaned = true
        resetFrontInstant()
        setGhostCard(null)
        setSettlePath('none')
        pointerIdRef.current = null
        setPhaseSafe('idle')
      }
      const watchdog = globalThis.setTimeout(cleanup, 1400)

      try {
        const offsetX = currentOffsetRef.current.x
        const offsetY = currentOffsetRef.current.y
        const displacement = Math.hypot(offsetX, offsetY)

        if (displacement >= displacementThreshold) {
          setPhaseSafe('reorder')
          setSettlePath('reorder')
          const releaseX = frontX.get()
          const releaseY = frontY.get()
          const releaseRotate = frontRotate.get()
          const releaseScale = frontScale.get()
          const currentFrontIndex = normalizeIndex(activeIndexRef.current)
          const targetDepth = total - 1
          const targetSlot = computeDepthSlot(targetDepth, total)

          ghostX.set(releaseX)
          ghostY.set(releaseY)
          ghostRotate.set(releaseRotate)
          ghostScale.set(releaseScale)

          resetFrontInstant()
          setActiveIndex((previous) => normalizeIndex(previous + 1))
          setGhostCard({
            itemIndex: currentFrontIndex,
            targetDepth,
            hiddenDepth: targetDepth,
          })
          await animateGhostIntoBottom(releaseX, releaseY, targetSlot)
        } else {
          setPhaseSafe('settling')
          setSettlePath('return')
          await animateReturnToOrigin()
        }
      } finally {
        globalThis.clearTimeout(watchdog)
        cleanup()
      }
    },
    [
      animateGhostIntoBottom,
      animateReturnToOrigin,
      displacementThreshold,
      frontRotate,
      frontScale,
      frontX,
      frontY,
      ghostRotate,
      ghostScale,
      ghostX,
      ghostY,
      normalizeIndex,
      resetFrontInstant,
      setPhaseSafe,
      total,
    ],
  )

  const settleSession = useCallback(
    (sessionId: number) => {
      if (settledSessionIdRef.current === sessionId) {
        return
      }
      settledSessionIdRef.current = sessionId
      void finalizeSession(sessionId)
    },
    [finalizeSession],
  )

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (phaseRef.current !== 'idle') {
        return
      }
      if (event.button !== 0) {
        return
      }
      if (isInteractiveTarget(event.target)) {
        return
      }

      const nextSession = dragSessionIdRef.current + 1
      dragSessionIdRef.current = nextSession
      currentSessionIdRef.current = nextSession
      settledSessionIdRef.current = 0
      pointerIdRef.current = event.pointerId
      dragStartRef.current = { x: event.clientX, y: event.clientY }
      currentOffsetRef.current = { x: 0, y: 0 }

      setSettlePath('none')
      setGhostCard(null)
      stopRunningAnimations()
      setPhaseSafe('dragging')

      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
    },
    [setPhaseSafe, stopRunningAnimations],
  )

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (phaseRef.current !== 'dragging') {
        return
      }
      if (pointerIdRef.current !== event.pointerId) {
        return
      }

      const offsetX = event.clientX - dragStartRef.current.x
      const offsetY = event.clientY - dragStartRef.current.y
      currentOffsetRef.current = { x: offsetX, y: offsetY }

      applyFrontMotion(offsetX, offsetY, clamp((offsetX / 230) * 13, -13, 13))
    },
    [applyFrontMotion],
  )

  const handlePointerRelease = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) {
        return
      }
      settleSession(currentSessionIdRef.current)
    },
    [settleSession],
  )

  useEffect(() => {
    const handleGlobalRelease = () => {
      if (phaseRef.current !== 'dragging') {
        return
      }
      settleSession(currentSessionIdRef.current)
    }

    window.addEventListener('pointerup', handleGlobalRelease, true)
    window.addEventListener('pointercancel', handleGlobalRelease, true)
    window.addEventListener('mouseup', handleGlobalRelease, true)
    window.addEventListener('touchend', handleGlobalRelease, true)
    window.addEventListener('touchcancel', handleGlobalRelease, true)
    window.addEventListener('blur', handleGlobalRelease)

    return () => {
      window.removeEventListener('pointerup', handleGlobalRelease, true)
      window.removeEventListener('pointercancel', handleGlobalRelease, true)
      window.removeEventListener('mouseup', handleGlobalRelease, true)
      window.removeEventListener('touchend', handleGlobalRelease, true)
      window.removeEventListener('touchcancel', handleGlobalRelease, true)
      window.removeEventListener('blur', handleGlobalRelease)
      stopRunningAnimations()
    }
  }, [settleSession, stopRunningAnimations])

  if (total < 3) {
    return <div className={styles.empty}>Need at least three cards to render the stack.</div>
  }

  return (
    <div
      className={joinClassNames(styles.cardStack, className)}
      data-settle-path={settlePath}
      style={{
        width: stackSize.width,
        height: stackSize.height,
      }}
    >
      {[...stackLayers].reverse().map((entry) => {
        const slot = entry.depth === 1 ? 'middle' : 'back'
        const shouldHide =
          ghostCard !== null &&
          entry.depth === ghostCard.hiddenDepth &&
          entry.itemIndex === ghostCard.itemIndex

        return (
          <motion.div
            key={`layer-${entry.depth}-${items[entry.itemIndex].id}`}
            className={styles.stackLayer}
            initial={false}
            animate={{
              x: entry.transform.x,
              y: entry.transform.y,
              scale: entry.transform.scale,
              rotate: entry.transform.rotate,
            }}
            transition={{
              duration: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              zIndex: entry.transform.zIndex,
              pointerEvents: 'none',
              visibility: shouldHide ? 'hidden' : 'visible',
            }}
          >
            <StackCard compactShadow>{items[entry.itemIndex].render({
              isFront: false,
              slot,
              absoluteIndex: entry.itemIndex,
            })}</StackCard>
          </motion.div>
        )
      })}

      {ghostCard && (
        <motion.div
          className={joinClassNames(styles.stackLayer, styles.ghost)}
          style={{
            x: ghostX,
            y: ghostY,
            rotate: ghostRotate,
            scale: ghostScale,
            zIndex: Math.max(1.9, total - ghostCard.targetDepth + 0.95),
            pointerEvents: 'none',
          }}
        >
          <StackCard compactShadow>{items[ghostCard.itemIndex].render({
            isFront: false,
            slot: 'back',
            absoluteIndex: ghostCard.itemIndex,
          })}</StackCard>
        </motion.div>
      )}

      <motion.div
        key={`front-${items[orderedIndices[0]].id}`}
        className={joinClassNames(styles.stackLayer, styles.front)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerRelease}
        onPointerCancel={handlePointerRelease}
        onLostPointerCapture={handlePointerRelease}
        style={{
          x: frontX,
          y: frontY,
          rotate: frontRotate,
          scale: frontScale,
          zIndex: total + 2,
          cursor: phase === 'dragging' ? 'grabbing' : 'grab',
        }}
      >
        <StackCard>{items[orderedIndices[0]].render({
          isFront: true,
          slot: 'front',
          absoluteIndex: orderedIndices[0],
        })}</StackCard>
      </motion.div>

      <motion.div
        className={styles.swipeHint}
        initial={false}
        animate={{
          opacity: phase === 'dragging' ? 0.22 : 1,
          y: phase === 'dragging' ? 8 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        <span aria-hidden="true">←</span>
        <span>Swipe</span>
        <span aria-hidden="true">→</span>
      </motion.div>
    </div>
  )
}
