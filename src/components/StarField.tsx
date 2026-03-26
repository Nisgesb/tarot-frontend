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

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function seedPhoneVelocity(
  star: Star,
  focusX: number,
  focusY: number,
  driftRangeX: number,
  driftRangeY: number,
) {
  const dx = star.x - focusX
  const dy = star.y - focusY
  const distance = Math.max(1, Math.hypot(dx, dy))
  const tangentialDirection = Math.random() < 0.5 ? -1 : 1
  const tangential = randomBetween(0.26, 1.12) * tangentialDirection
  const inwardPull = randomBetween(0.24, 0.62)

  star.velocityX =
    (Math.random() - 0.5) * driftRangeX +
    (-dy / distance) * tangential * (1 + star.depth * 0.86) +
    (-dx / distance) * inwardPull * (0.74 + star.depth * 0.34)
  star.velocityY =
    (Math.random() - 0.5) * driftRangeY +
    (dx / distance) * tangential * (1 + star.depth * 0.8) +
    (-dy / distance) * inwardPull * (0.74 + star.depth * 0.3)
}

function respawnStar(
  star: Star,
  width: number,
  height: number,
  phoneViewport: boolean,
  options?: { focusX?: number; focusY?: number; outerRing?: boolean },
) {
  const focusX = options?.focusX ?? width * 0.44
  const focusY = options?.focusY ?? height * 0.42
  const spawnOuterRing = phoneViewport && Boolean(options?.outerRing)

  if (spawnOuterRing) {
    const angle = randomBetween(0, Math.PI * 2)
    const radius = randomBetween(
      Math.max(width, height) * 0.56,
      Math.max(width, height) * 0.94,
    )
    star.x = wrapPosition(focusX + Math.cos(angle) * radius, width)
    star.y = wrapPosition(focusY + Math.sin(angle) * radius * 0.82, height)
  } else if (phoneViewport && Math.random() < 0.52) {
    const angle = randomBetween(0, Math.PI * 2)
    const radius = Math.pow(Math.random(), 0.62) * Math.max(width, height) * 0.66
    star.x = wrapPosition(focusX + Math.cos(angle) * radius, width)
    star.y = wrapPosition(focusY + Math.sin(angle) * radius * 0.8, height)
  } else {
    star.x = Math.random() * width
    star.y = Math.random() * height
  }

  star.radius = Math.random() * 1.7 + 0.35
  star.depth = Math.random() * 0.9 + 0.1
  star.alpha = Math.random() * 0.48 + 0.2
  star.twinkleSpeed = Math.random() * 1.2 + 0.35
  star.twinklePhase = Math.random() * Math.PI * 2

  if (phoneViewport) {
    seedPhoneVelocity(star, focusX, focusY, 4.4, 3.6)
    return
  }

  star.velocityX = (Math.random() - 0.5) * 5
  star.velocityY = (Math.random() - 0.5) * 4
}

function buildStarField(
  count: number,
  width: number,
  height: number,
  phoneViewport: boolean,
): Star[] {
  return Array.from({ length: count }, () => {
    const star: Star = {
      x: 0,
      y: 0,
      radius: 0,
      alpha: 0,
      twinkleSpeed: 0,
      twinklePhase: 0,
      velocityX: 0,
      velocityY: 0,
      depth: 0,
    }

    respawnStar(star, width, height, phoneViewport)
    return star
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
    let loopActive = false

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
      if (!loopActive) {
        return
      }

      if (lastTime === 0) {
        lastTime = time
      }

      const delta = Math.min(0.05, (time - lastTime) / 1000)
      lastTime = time

      context.clearRect(0, 0, width, height)

      const phoneViewport = isPhoneViewport(width, height)
      const focusX = phoneViewport ? width * 0.44 : width * 0.5
      const focusY = phoneViewport ? height * 0.42 : height * 0.5
      const absorbRadius = phoneViewport ? Math.max(26, Math.min(width, height) * 0.07) : 0
      const absorbRadiusSquared = absorbRadius * absorbRadius
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

          const dxFromFocus = star.x - focusX
          const dyFromFocus = star.y - focusY

          if (dxFromFocus * dxFromFocus + dyFromFocus * dyFromFocus <= absorbRadiusSquared) {
            respawnStar(star, width, height, true, {
              focusX,
              focusY,
              outerRing: true,
            })
            continue
          }
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

    const stopLoop = () => {
      if (!loopActive) {
        return
      }

      loopActive = false
      if (frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }

    const startLoop = () => {
      if (loopActive || document.hidden) {
        return
      }

      lastTime = 0
      loopActive = true
      frameId = window.requestAnimationFrame(render)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
        return
      }

      startLoop()
    }

    startLoop()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopLoop()
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
