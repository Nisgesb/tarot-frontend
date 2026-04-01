import { useCallback, useMemo, useRef } from 'react'
import gsap from 'gsap'
import { Draggable } from 'gsap/all'
import { useGSAP } from '@gsap/react'
import './InfiniteCardSlider.css'

gsap.registerPlugin(Draggable, useGSAP)

const MIN_RENDERED_CARDS = 12

const INERTIA = {
  scrubDuration: 0.82,
  scrubEase: 'power4.out',
  dragVelocityFactor: 0.28,
  wheelVelocityFactor: 0.00012,
  maxThrowCards: 9,
}

export interface InfiniteCardSliderCard {
  id: string | number
  image: string
  title?: string
}

interface PreparedCard extends InfiniteCardSliderCard {
  _renderKey: string
}

export interface InfiniteCardSliderProps {
  cards: InfiniteCardSliderCard[]
  spacing?: number
  dragFactor?: number
  mobile?: boolean
  className?: string
  ariaLabel?: string
}

const clampThrowBySpacing = (spacing: number, value: number) => {
  const maxThrow = spacing * INERTIA.maxThrowCards
  return gsap.utils.clamp(-maxThrow, maxThrow, value)
}

const createCardAnimation = (item: HTMLElement) => {
  const tl = gsap.timeline()

  tl.fromTo(
    item,
    { xPercent: 400 },
    {
      xPercent: -400,
      duration: 1,
      ease: 'none',
      immediateRender: false,
    },
    0,
  ).fromTo(
    item,
    { scale: 0, opacity: 0, zIndex: 1 },
    {
      scale: 1,
      opacity: 1,
      zIndex: 100,
      yoyo: true,
      repeat: 1,
      duration: 0.5,
      ease: 'sine.inOut',
      immediateRender: false,
    },
    0,
  )

  return tl
}

const buildSeamlessLoop = (
  items: HTMLElement[],
  spacing: number,
  animateFunc: (item: HTMLElement) => gsap.core.Timeline,
) => {
  const rawSequence = gsap.timeline({ paused: true })
  const seamlessLoop = gsap.timeline({
    paused: true,
    repeat: -1,
    onRepeat() {
      if (this._time === this._dur) {
        this._tTime += this._dur - 0.01
      }
    },
    onReverseComplete() {
      this.totalTime(this.rawTime() + this.duration() * 100)
    },
  })

  const overlap = Math.ceil(1 / spacing)
  const startTime = items.length * spacing + 0.5
  const loopTime = (items.length + overlap) * spacing + 1

  gsap.set(items, {
    x: '-50%',
    y: '-50%',
    xPercent: 400,
    opacity: 0,
    scale: 0,
    zIndex: 1,
    transformOrigin: '50% 50%',
    force3D: true,
  })

  for (let i = 0; i < items.length + overlap * 2; i += 1) {
    const index = i % items.length
    const time = i * spacing
    rawSequence.add(animateFunc(items[index]), time)
  }

  rawSequence.time(startTime)

  seamlessLoop
    .to(rawSequence, {
      time: loopTime,
      duration: loopTime - startTime,
      ease: 'none',
    })
    .fromTo(
      rawSequence,
      { time: overlap * spacing + 1 },
      {
        time: startTime,
        duration: startTime - (overlap * spacing + 1),
        immediateRender: false,
        ease: 'none',
      },
    )

  return {
    rawSequence,
    seamlessLoop,
  }
}

export function InfiniteCardSlider({
  cards,
  spacing = 0.1,
  dragFactor = 0.001,
  mobile = false,
  className,
  ariaLabel = 'Infinite card stage',
}: InfiniteCardSliderProps) {
  const galleryRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const dragProxyRef = useRef<HTMLDivElement | null>(null)
  const playheadRef = useRef({ offset: 0 })
  const currentOffsetRef = useRef(0)
  const jumpToOffsetRef = useRef<(offset: number) => void>(() => {})

  const preparedCards = useMemo<PreparedCard[]>(() => {
    if (!Array.isArray(cards) || cards.length === 0) {
      return []
    }

    const validCards = cards.filter((card) => card && card.id != null && card.image)
    if (validCards.length === 0) {
      return []
    }

    const targetCount = Math.max(MIN_RENDERED_CARDS, validCards.length)

    return Array.from({ length: targetCount }, (_, index) => {
      const baseCard = validCards[index % validCards.length]
      const cycle = Math.floor(index / validCards.length)

      return {
        ...baseCard,
        _renderKey: `${baseCard.id}-${cycle}-${index}`,
      }
    })
  }, [cards])

  useGSAP(
    () => {
      const stage = stageRef.current
      const dragProxy = dragProxyRef.current
      const gallery = galleryRef.current
      const items = gsap.utils.toArray<HTMLElement>(
        '.infinite-card-slider__card',
        galleryRef.current,
      )

      if (!stage || !dragProxy || !gallery || !items.length) {
        jumpToOffsetRef.current = () => {}
        return undefined
      }

      const safeSpacing = Math.max(0.001, spacing)
      const safeDragFactor = Number.isFinite(dragFactor) ? dragFactor : 0.001
      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const { rawSequence, seamlessLoop } = buildSeamlessLoop(
        items,
        safeSpacing,
        createCardAnimation,
      )

      const playhead = playheadRef.current
      playhead.offset = 0
      currentOffsetRef.current = 0

      const snap = gsap.utils.snap(safeSpacing)
      const wrapTime = gsap.utils.wrap(0, seamlessLoop.duration())

      const scrub = gsap.to(playhead, {
        offset: 0,
        duration: reducedMotion ? 0.26 : INERTIA.scrubDuration,
        ease: INERTIA.scrubEase,
        paused: true,
        onUpdate: () => {
          seamlessLoop.time(wrapTime(playhead.offset))
          currentOffsetRef.current = playhead.offset
        },
      })

      const scrubTo = (offset: number) => {
        const safeScrub = scrub as gsap.core.Tween & {
          resetTo?: (property: string, value: number) => void
        }

        if (safeScrub.resetTo) {
          safeScrub.resetTo('offset', offset)
          return
        }
        safeScrub.vars.offset = offset
        safeScrub.invalidate().restart()
      }

      const jumpToOffset = (offset: number) => {
        const snappedOffset = snap(offset)
        scrubTo(snappedOffset)
      }

      jumpToOffsetRef.current = jumpToOffset

      let dragStartOffset = 0
      let dragLastX = 0
      let dragLastTime = 0
      let dragVelocity = 0

      let draggableInstance: Draggable | null = null

      const draggable = Draggable.create(dragProxy, {
        type: 'x',
        trigger: stage,
        onPress() {
          if (!draggableInstance) {
            return
          }

          dragStartOffset = currentOffsetRef.current
          dragLastX = draggableInstance.x
          dragLastTime = performance.now()
          dragVelocity = 0
        },
        onDrag() {
          if (!draggableInstance) {
            return
          }

          const now = performance.now()
          const dt = Math.max(1, now - dragLastTime)
          const dx = draggableInstance.x - dragLastX
          dragVelocity = (dx / dt) * 1000
          dragLastX = draggableInstance.x
          dragLastTime = now

          const nextOffset =
            dragStartOffset + (draggableInstance.startX - draggableInstance.x) * safeDragFactor
          scrubTo(nextOffset)
        },
        onDragEnd() {
          if (reducedMotion) {
            jumpToOffset(currentOffsetRef.current)
            return
          }

          const releaseVelocity = Number.isFinite(dragVelocity) ? dragVelocity : 0
          const projectedThrow = clampThrowBySpacing(
            safeSpacing,
            -releaseVelocity * safeDragFactor * INERTIA.dragVelocityFactor,
          )
          jumpToOffset(currentOffsetRef.current + projectedThrow)
        },
      })[0]
      draggableInstance = draggable

      let wheelStopTimer: number | null = null
      let lastWheelTime = 0
      let wheelVelocity = 0

      const onWheel = (event: WheelEvent) => {
        const wheelDelta =
          Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

        if (Math.abs(wheelDelta) < 0.2) {
          return
        }

        event.preventDefault()

        const now = performance.now()
        if (lastWheelTime > 0) {
          const dt = Math.max(1, now - lastWheelTime)
          wheelVelocity = (wheelDelta / dt) * 1000
        }
        lastWheelTime = now

        scrubTo(currentOffsetRef.current + wheelDelta * safeDragFactor * 0.48)

        if (wheelStopTimer) {
          window.clearTimeout(wheelStopTimer)
        }

        wheelStopTimer = window.setTimeout(() => {
          if (reducedMotion) {
            jumpToOffset(currentOffsetRef.current)
            return
          }

          const wheelThrow = clampThrowBySpacing(
            safeSpacing,
            wheelVelocity * INERTIA.wheelVelocityFactor,
          )
          jumpToOffset(currentOffsetRef.current + wheelThrow)
          wheelVelocity = 0
          wheelStopTimer = null
        }, 86)
      }

      stage.addEventListener('wheel', onWheel, { passive: false })

      jumpToOffset(0)

      return () => {
        stage.removeEventListener('wheel', onWheel)
        if (wheelStopTimer) {
          window.clearTimeout(wheelStopTimer)
        }
        draggable.kill()
        scrub.kill()
        seamlessLoop.kill()
        rawSequence.kill()
        jumpToOffsetRef.current = () => {}
      }
    },
    {
      scope: galleryRef,
      dependencies: [preparedCards, spacing, dragFactor, mobile],
      revertOnUpdate: true,
    },
  )

  const handleNext = useCallback(() => {
    jumpToOffsetRef.current(currentOffsetRef.current + spacing)
  }, [spacing])

  const handlePrev = useCallback(() => {
    jumpToOffsetRef.current(currentOffsetRef.current - spacing)
  }, [spacing])

  const galleryClassName = [
    'infinite-card-slider__gallery',
    mobile ? 'infinite-card-slider--mobile' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section ref={galleryRef} className={galleryClassName}>
      <div ref={stageRef} className="infinite-card-slider__cards" aria-label={ariaLabel}>
        {preparedCards.length === 0 ? (
          <p className="infinite-card-slider__empty">No cards available.</p>
        ) : (
          preparedCards.map((card) => (
            <article
              key={card._renderKey}
              className="infinite-card-slider__card"
              style={{ backgroundImage: `url(${card.image})` }}
              aria-label={card.title ?? `Card ${card.id}`}
            >
              {card.title ? (
                <span className="infinite-card-slider__title">{card.title}</span>
              ) : null}
            </article>
          ))
        )}
      </div>

      <div ref={dragProxyRef} className="infinite-card-slider__drag-proxy" aria-hidden />

      <div className="infinite-card-slider__controls">
        <button type="button" className="infinite-card-slider__button" onClick={handlePrev}>
          Prev
        </button>
        <button type="button" className="infinite-card-slider__button" onClick={handleNext}>
          Next
        </button>
      </div>
    </section>
  )
}
