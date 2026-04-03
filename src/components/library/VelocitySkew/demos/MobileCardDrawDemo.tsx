import { useMemo, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { VelocitySkew, type VelocitySkewDragPayload } from '../VelocitySkew'
import styles from './VelocitySkewDemos.module.css'
import { MOBILE_DRAW_POOL, type DrawCard } from './data'

const EXIT_THRESHOLD = 110
const EXIT_VELOCITY = 900

const getLevelClassName = (level: number) => {
  if (level === 0) {
    return styles.drawLevel0
  }
  if (level === 1) {
    return styles.drawLevel1
  }
  return styles.drawLevel2
}

export function MobileCardDrawDemo() {
  const [frontIndex, setFrontIndex] = useState(0)

  const dragDeltaRef = useRef(0)
  const dragVelocityRef = useRef(0)
  const topMotionRef = useRef<HTMLDivElement | null>(null)
  const secondMotionRef = useRef<HTMLDivElement | null>(null)
  const thirdMotionRef = useRef<HTMLDivElement | null>(null)
  const activeTweensRef = useRef<gsap.core.Tween[]>([])

  const visibleCards = useMemo(
    () => [0, 1, 2].map((offset) => MOBILE_DRAW_POOL[(frontIndex + offset) % MOBILE_DRAW_POOL.length]),
    [frontIndex],
  )

  const rememberTween = (tween: gsap.core.Tween) => {
    activeTweensRef.current.push(tween)
    return tween
  }

  const clearTweens = () => {
    activeTweensRef.current.forEach((tween) => tween.kill())
    activeTweensRef.current = []
  }

  useGSAP(
    () => {
      clearTweens()

      if (topMotionRef.current) {
        gsap.set(topMotionRef.current, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 })
      }
      if (secondMotionRef.current) {
        gsap.set(secondMotionRef.current, { x: 0, y: 10, rotation: 0, scale: 0.95, opacity: 1 })
      }
      if (thirdMotionRef.current) {
        gsap.set(thirdMotionRef.current, { x: 0, y: 20, rotation: 0, scale: 0.9, opacity: 1 })
      }

      return () => {
        clearTweens()
      }
    },
    { dependencies: [frontIndex] },
  )

  const applyStackParallax = (delta: number) => {
    const topTilt = gsap.utils.clamp(-14, 14, delta * 0.05)
    const secondTilt = gsap.utils.clamp(-6, 6, delta * 0.015)
    const thirdTilt = gsap.utils.clamp(-4, 4, delta * 0.01)

    if (topMotionRef.current) {
      gsap.set(topMotionRef.current, {
        x: delta,
        rotation: topTilt,
        scale: 1.02,
      })
    }

    if (secondMotionRef.current) {
      gsap.set(secondMotionRef.current, {
        x: delta * 0.16,
        rotation: secondTilt,
        y: 10,
        scale: 0.95,
      })
    }

    if (thirdMotionRef.current) {
      gsap.set(thirdMotionRef.current, {
        x: delta * 0.1,
        rotation: thirdTilt,
        y: 20,
        scale: 0.9,
      })
    }
  }

  const resetStack = () => {
    if (topMotionRef.current) {
      rememberTween(
        gsap.to(topMotionRef.current, {
          x: 0,
          rotation: 0,
          scale: 1,
          duration: 0.28,
          ease: 'power3.out',
        }),
      )
    }

    if (secondMotionRef.current) {
      rememberTween(
        gsap.to(secondMotionRef.current, {
          x: 0,
          rotation: 0,
          y: 10,
          scale: 0.95,
          duration: 0.3,
          ease: 'power3.out',
        }),
      )
    }

    if (thirdMotionRef.current) {
      rememberTween(
        gsap.to(thirdMotionRef.current, {
          x: 0,
          rotation: 0,
          y: 20,
          scale: 0.9,
          duration: 0.32,
          ease: 'power3.out',
        }),
      )
    }
  }

  const handleDragMove = ({ delta, velocity }: VelocitySkewDragPayload) => {
    dragDeltaRef.current = delta
    dragVelocityRef.current = velocity
    applyStackParallax(delta)
  }

  const handleDragEnd = () => {
    const delta = dragDeltaRef.current
    const velocity = dragVelocityRef.current
    const shouldExit = Math.abs(delta) > EXIT_THRESHOLD || Math.abs(velocity) > EXIT_VELOCITY

    if (!shouldExit || !topMotionRef.current) {
      resetStack()
      return
    }

    const direction = delta !== 0 ? Math.sign(delta) : Math.sign(velocity || 1)
    const throwDistance = typeof window !== 'undefined' ? Math.max(window.innerWidth, 320) : 320

    rememberTween(
      gsap.to(topMotionRef.current, {
        x: throwDistance * direction,
        rotation: 18 * direction,
        opacity: 0,
        duration: 0.24,
        ease: 'power2.out',
        onComplete: () => {
          if (topMotionRef.current) {
            gsap.set(topMotionRef.current, { clearProps: 'all' })
          }
          dragDeltaRef.current = 0
          dragVelocityRef.current = 0
          setFrontIndex((prev) => (prev + 1) % MOBILE_DRAW_POOL.length)
        },
      }),
    )

    if (secondMotionRef.current) {
      rememberTween(
        gsap.to(secondMotionRef.current, {
          x: 0,
          rotation: 0,
          y: 10,
          scale: 0.95,
          duration: 0.24,
          ease: 'power2.out',
        }),
      )
    }

    if (thirdMotionRef.current) {
      rememberTween(
        gsap.to(thirdMotionRef.current, {
          x: 0,
          rotation: 0,
          y: 20,
          scale: 0.9,
          duration: 0.24,
          ease: 'power2.out',
        }),
      )
    }
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>C. MobileCardDrawDemo</p>
        <h2 className={styles.sectionTitle}>Drag velocity drives skew, stack and snap</h2>
      </header>

      <div className={styles.drawDeckFrame}>
        <VelocitySkew<DrawCard>
          items={visibleCards}
          getItemKey={(item, index) => `${item.id}-${index}`}
          mode="drag"
          axis="horizontal"
          skewAxis="y"
          maxSkew={30}
          velocityDivisor={240}
          velocityScale={7}
          releaseDuration={0.55}
          reducedMotion={false}
          className={styles.drawDeckSkew}
          itemClassName={styles.drawDeckSkewItem}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          renderItem={(item, index) => {
            const levelClassName = getLevelClassName(index)

            return (
              <div
                ref={(element) => {
                  if (index === 0) topMotionRef.current = element
                  if (index === 1) secondMotionRef.current = element
                  if (index === 2) thirdMotionRef.current = element
                }}
                className={`${styles.drawCardMotion} ${levelClassName}`}
              >
                <article className={styles.drawCard}>
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    draggable={false}
                    className={styles.drawCardImage}
                  />
                  <p className={styles.drawCardTitle}>{item.title}</p>
                </article>
              </div>
            )
          }}
        />
      </div>
    </section>
  )
}
