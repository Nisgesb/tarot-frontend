import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'

interface StarFieldProps {
  entered: boolean
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  className?: string
  speedMultiplier?: number
  motionProfile?: MotionProfile
  performanceTier?: PerformanceTier
}

interface Star {
  x: number
  y: number
  radius: number
  alpha: number
  twinkleSpeed: number
  twinklePhase: number
  velocityX: number
  velocityY: number
  depth: number
}

function isPhoneViewport(width: number, height: number) {
  const minSide = Math.min(width, height)
  const maxSide = Math.max(width, height)
  return minSide <= 500 && maxSide <= 1040
}

function wrapPosition(value: number, limit: number) {
  if (value < 0) {
    return value + limit
  }

  if (value > limit) {
    return value - limit
  }

  return value
}

function buildStarField(
  count: number,
  width: number,
  height: number,
  phoneViewport: boolean,
): Star[] {
  return Array.from({ length: count }, () => {
    let x = Math.random() * width
    let y = Math.random() * height

    if (phoneViewport && Math.random() < 0.52) {
      const angle = Math.random() * Math.PI * 2
      const radius =
        Math.pow(Math.random(), 0.62) * Math.max(width, height) * 0.66
      x = width * 0.44 + Math.cos(angle) * radius
      y = height * 0.42 + Math.sin(angle) * radius * 0.8
      x = wrapPosition(x, width)
      y = wrapPosition(y, height)
    }

    const radius = Math.random() * 1.7 + 0.35
    const depth = Math.random() * 0.9 + 0.1
    const driftRangeX = phoneViewport ? 4.4 : 5
    const driftRangeY = phoneViewport ? 3.6 : 4
    let velocityX = (Math.random() - 0.5) * driftRangeX
    let velocityY = (Math.random() - 0.5) * driftRangeY

    if (phoneViewport) {
      const dx = x - width * 0.44
      const dy = y - height * 0.42
      const distance = Math.max(1, Math.hypot(dx, dy))
      const tangential = (Math.random() * 0.9 + 0.24) * (Math.random() < 0.5 ? -1 : 1)
      velocityX += (-dy / distance) * tangential * (1 + depth * 0.8)
      velocityY += (dx / distance) * tangential * (1 + depth * 0.7)
    }

    return {
      x,
      y,
      radius,
      alpha: Math.random() * 0.48 + 0.2,
      twinkleSpeed: Math.random() * 1.2 + 0.35,
      twinklePhase: Math.random() * Math.PI * 2,
      velocityX,
      velocityY,
      depth,
    }
  })
}

function getStarCount(
  reducedMotion: boolean,
  performanceTier: PerformanceTier,
  width: number,
  height: number,
) {
  const area = width * height
  const phoneViewport = isPhoneViewport(width, height)
  const compactViewport = !phoneViewport && width <= 768
  const density = phoneViewport ? 0.00011 : compactViewport ? 0.00012 : 0.0002

  let count = Math.floor(area * density)
  count = Math.max(
    phoneViewport ? 140 : compactViewport ? 150 : 220,
    Math.min(phoneViewport ? 232 : compactViewport ? 260 : 500, count),
  )

  if (performanceTier === 'low') {
    count = Math.floor(count * 0.62)
  } else if (performanceTier === 'medium') {
    count = Math.floor(count * 0.82)
  }

  if (reducedMotion) {
    count = Math.floor(count * 0.6)
  }

  return count
}

export function StarField({
  entered,
  reducedMotion,
  motionRef,
  className,
  speedMultiplier = 1,
  motionProfile = { x: 1, y: 1 },
  performanceTier = 'high',
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speedMultiplierRef = useRef(speedMultiplier)
  const motionProfileRef = useRef(motionProfile)

  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier
  }, [speedMultiplier])

  useEffect(() => {
    motionProfileRef.current = motionProfile
  }, [motionProfile])

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return undefined
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return undefined
    }

    let frameId = 0
    let stars: Star[] = []
    let width = 0
    let height = 0
    let lastTime = 0

    const resize = () => {
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        performanceTier === 'low'
          ? 1.2
          : performanceTier === 'medium'
            ? 1.4
            : window.innerWidth <= 768
              ? 1.5
              : 2,
      )

      width = window.innerWidth
      height = window.innerHeight

      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.globalCompositeOperation = 'screen'

      const phoneViewport = isPhoneViewport(width, height)
      stars = buildStarField(
        getStarCount(reducedMotion, performanceTier, width, height),
        width,
        height,
        phoneViewport,
      )
    }

    resize()
    window.addEventListener('resize', resize)

    const render = (time: number) => {
      if (lastTime === 0) {
        lastTime = time
      }

      const delta = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      context.clearRect(0, 0, width, height)

      const phoneViewport = isPhoneViewport(width, height)
      const focusX = phoneViewport ? width * 0.44 : width * 0.5
      const focusY = phoneViewport ? height * 0.42 : height * 0.5
      const profile = motionProfileRef.current
      const parallaxX = motionRef.current.x * profile.x * (phoneViewport ? 13 : width <= 768 ? 8 : 16)
      const parallaxY = motionRef.current.y * profile.y * (phoneViewport ? 10 : height <= 768 ? 6 : 12)
      const driftMultiplier = (reducedMotion ? 0.28 : 1) * speedMultiplierRef.current

      for (const star of stars) {
        star.x += star.velocityX * delta * driftMultiplier
        star.y += star.velocityY * delta * driftMultiplier

        if (phoneViewport && !reducedMotion) {
          const dx = focusX - star.x
          const dy = focusY - star.y
          const distance = Math.max(72, Math.hypot(dx, dy))
          const maxDistance = Math.max(width, height) * 1.08
          const distanceFactor = 1 - Math.min(1, distance / maxDistance)
          const orbitStrength = (0.4 + star.depth * 0.72) * distanceFactor
          const pullStrength = (0.2 + (1 - star.depth) * 0.4) * distanceFactor

          star.x += (-dy / distance) * orbitStrength * delta * 32 * driftMultiplier
          star.y += (dx / distance) * orbitStrength * delta * 32 * driftMultiplier
          star.x += dx * pullStrength * delta * 0.7 * driftMultiplier
          star.y += dy * pullStrength * delta * 0.7 * driftMultiplier
        }

        if (star.x < -8) star.x = width + 8
        if (star.x > width + 8) star.x = -8
        if (star.y < -8) star.y = height + 8
        if (star.y > height + 8) star.y = -8

        const twinkle =
          0.56 + 0.44 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase)
        const opacity = star.alpha * twinkle
        const drawX = star.x + parallaxX * star.depth
        const drawY = star.y + parallaxY * star.depth

        context.beginPath()
        context.fillStyle = `rgba(217, 244, 255, ${opacity})`
        context.arc(drawX, drawY, star.radius, 0, Math.PI * 2)
        context.fill()

        if (star.radius > 1.1) {
          context.beginPath()
          context.fillStyle = `rgba(205, 235, 255, ${opacity * 0.18})`
          context.arc(drawX, drawY, star.radius * 2.6, 0, Math.PI * 2)
          context.fill()
        }
      }

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      window.cancelAnimationFrame(frameId)
    }
  }, [motionRef, performanceTier, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className={`starfield-layer ${entered ? 'is-entered' : ''} ${className ?? ''}`}
      aria-hidden
    />
  )
}
