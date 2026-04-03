import { useRef, type Key, type ReactNode } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import styles from './VelocitySkew.module.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export type VelocitySkewMode = 'scroll' | 'wheel' | 'drag'
export type VelocitySkewAxis = 'vertical' | 'horizontal'
export type VelocitySkewTransformAxis = 'x' | 'y'

export type VelocitySkewDragPayload = {
  delta: number
  velocity: number
  event: PointerEvent
}

export type VelocitySkewProps<T> = {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  getItemKey?: (item: T, index: number) => Key
  className?: string
  itemClassName?: string
  mode?: VelocitySkewMode
  axis?: VelocitySkewAxis
  skewAxis?: VelocitySkewTransformAxis
  maxSkew?: number
  velocityDivisor?: number
  velocityScale?: number
  releaseDuration?: number
  ease?: string
  transformOrigin?: string
  scroller?: Window | HTMLElement | null
  reducedMotion?: boolean
  onDragStart?: (event: PointerEvent) => void
  onDragMove?: (payload: VelocitySkewDragPayload) => void
  onDragEnd?: (payload: VelocitySkewDragPayload) => void
}

const DEFAULT_MODE: VelocitySkewMode = 'scroll'
const DEFAULT_AXIS: VelocitySkewAxis = 'vertical'
const DEFAULT_SKEW_AXIS: VelocitySkewTransformAxis = 'y'

const mergeClassNames = (...tokens: Array<string | undefined | false>) =>
  tokens.filter(Boolean).join(' ')

export function VelocitySkew<T>({
  items,
  renderItem,
  getItemKey,
  className,
  itemClassName,
  mode = DEFAULT_MODE,
  axis = DEFAULT_AXIS,
  skewAxis = DEFAULT_SKEW_AXIS,
  maxSkew = 20,
  velocityDivisor = 300,
  velocityScale,
  releaseDuration = 0.8,
  ease = 'power3.out',
  transformOrigin = 'right center',
  scroller,
  reducedMotion,
  onDragStart,
  onDragMove,
  onDragEnd,
}: VelocitySkewProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) {
        return undefined
      }

      const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-velocity-skew-item]'))
      if (!targets.length) {
        return undefined
      }

      const prefersReduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const shouldReduce = reducedMotion ?? prefersReduced

      const proxy = { skew: 0 }
      const clamp = gsap.utils.clamp(-maxSkew, maxSkew)
      const property = skewAxis === 'x' ? 'skewX' : 'skewY'
      const safeDivisor = Math.max(1, Math.abs(velocityDivisor))
      const safeScale = velocityScale ?? (mode === 'drag' ? 6 : 1)
      const skewSetter = gsap.quickSetter(targets, property, 'deg')

      gsap.set(targets, {
        transformOrigin,
        force3D: true,
      })
      skewSetter(0)

      let releaseTween: gsap.core.Tween | null = null
      const cleanups: Array<() => void> = []

      const applyVelocity = (velocity: number) => {
        // Keep high-frequency values out of React state to avoid render thrashing.
        if (shouldReduce) {
          return
        }

        const nextSkew = clamp((velocity * safeScale) / -safeDivisor)

        // Only accept a stronger impulse; weaker updates shouldn't cancel a stronger throw.
        if (Math.abs(nextSkew) > Math.abs(proxy.skew)) {
          proxy.skew = nextSkew
          skewSetter(proxy.skew)
          releaseTween?.kill()

          releaseTween = gsap.to(proxy, {
            skew: 0,
            duration: releaseDuration,
            ease,
            overwrite: true,
            onUpdate: () => {
              skewSetter(proxy.skew)
            },
          })
        }
      }

      const resolvedScroller: Window | HTMLElement | null =
        scroller === undefined
          ? typeof window !== 'undefined'
            ? window
            : null
          : scroller

      if (mode === 'scroll') {
        const triggerVars: ScrollTrigger.Vars = {
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: (self) => {
            applyVelocity(self.getVelocity())
          },
        }

        if (resolvedScroller && typeof window !== 'undefined' && resolvedScroller !== window) {
          triggerVars.scroller = resolvedScroller
        }

        const trigger = ScrollTrigger.create(triggerVars)
        cleanups.push(() => trigger.kill())
      }

      if (mode === 'wheel') {
        const wheelTarget: Window | HTMLElement | null =
          resolvedScroller && typeof window !== 'undefined' && resolvedScroller !== window
            ? resolvedScroller
            : typeof window !== 'undefined'
              ? window
              : null

        if (wheelTarget) {
          let lastTime = performance.now()

          const onWheel: EventListener = (event) => {
            if (!(event instanceof WheelEvent)) {
              return
            }

            const now = performance.now()
            const deltaTime = Math.max(1, now - lastTime)
            lastTime = now

            const delta = axis === 'vertical' ? event.deltaY : event.deltaX
            const velocity = (delta / deltaTime) * 1000
            applyVelocity(velocity)
          }

          wheelTarget.addEventListener('wheel', onWheel, { passive: true })
          cleanups.push(() => wheelTarget.removeEventListener('wheel', onWheel))
        }
      }

      if (mode === 'drag') {
        let dragging = false
        let pointerId = -1
        let startPos = 0
        let lastPos = 0
        let lastTime = 0
        let lastVelocity = 0

        const getPointerPos = (event: PointerEvent) =>
          axis === 'vertical' ? event.clientY : event.clientX

        const onPointerDown = (event: PointerEvent) => {
          dragging = true
          pointerId = event.pointerId
          startPos = getPointerPos(event)
          lastPos = startPos
          lastTime = performance.now()
          lastVelocity = 0

          if (root.setPointerCapture) {
            root.setPointerCapture(pointerId)
          }

          releaseTween?.kill()
          onDragStart?.(event)
        }

        const onPointerMove = (event: PointerEvent) => {
          if (!dragging || event.pointerId !== pointerId) {
            return
          }

          const now = performance.now()
          const position = getPointerPos(event)
          const deltaTime = Math.max(1, now - lastTime)
          const delta = position - startPos
          const velocity = ((position - lastPos) / deltaTime) * 1000

          lastPos = position
          lastTime = now
          lastVelocity = velocity

          applyVelocity(velocity)
          onDragMove?.({ delta, velocity, event })
        }

        const onPointerEnd = (event: PointerEvent) => {
          if (!dragging || event.pointerId !== pointerId) {
            return
          }

          dragging = false
          const delta = lastPos - startPos

          if (root.releasePointerCapture && root.hasPointerCapture(pointerId)) {
            root.releasePointerCapture(pointerId)
          }

          onDragEnd?.({
            delta,
            velocity: lastVelocity,
            event,
          })
        }

        root.addEventListener('pointerdown', onPointerDown)
        root.addEventListener('pointermove', onPointerMove)
        root.addEventListener('pointerup', onPointerEnd)
        root.addEventListener('pointercancel', onPointerEnd)

        cleanups.push(() => root.removeEventListener('pointerdown', onPointerDown))
        cleanups.push(() => root.removeEventListener('pointermove', onPointerMove))
        cleanups.push(() => root.removeEventListener('pointerup', onPointerEnd))
        cleanups.push(() => root.removeEventListener('pointercancel', onPointerEnd))
      }

      return () => {
        releaseTween?.kill()
        cleanups.forEach((cleanup) => cleanup())
      }
    },
    {
      scope: rootRef,
      dependencies: [
        items,
        mode,
        axis,
        skewAxis,
        maxSkew,
        velocityDivisor,
        velocityScale,
        releaseDuration,
        ease,
        transformOrigin,
        scroller,
        reducedMotion,
        onDragStart,
        onDragMove,
        onDragEnd,
      ],
      revertOnUpdate: true,
    },
  )

  return (
    <div
      ref={rootRef}
      className={mergeClassNames(
        styles.root,
        mode === 'drag' && styles.dragMode,
        axis === 'horizontal' && styles.horizontal,
        axis === 'vertical' && styles.vertical,
        className,
      )}
    >
      {items.map((item, index) => (
        <div
          key={getItemKey ? getItemKey(item, index) : index}
          data-velocity-skew-item
          className={mergeClassNames(styles.item, itemClassName)}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}
