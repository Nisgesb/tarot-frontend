import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { ParallaxPoint } from '../hooks/useParallax'

interface StarFieldProps {
  entered: boolean
  reducedMotion: boolean
  parallaxRef: MutableRefObject<ParallaxPoint>
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

function buildStarField(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, () => {
    const radius = Math.random() * 1.7 + 0.35
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius,
      alpha: Math.random() * 0.48 + 0.2,
      twinkleSpeed: Math.random() * 1.2 + 0.35,
      twinklePhase: Math.random() * Math.PI * 2,
      velocityX: (Math.random() - 0.5) * 5,
      velocityY: (Math.random() - 0.5) * 4,
      depth: Math.random() * 0.9 + 0.1,
    }
  })
}

function getStarCount(reducedMotion: boolean) {
  const area = window.innerWidth * window.innerHeight
  const isMobile = window.innerWidth <= 768
  const density = isMobile ? 0.00012 : 0.0002

  let count = Math.floor(area * density)
  count = Math.max(isMobile ? 150 : 220, Math.min(isMobile ? 260 : 500, count))

  if (reducedMotion) {
    count = Math.floor(count * 0.6)
  }

  return count
}

export function StarField({ entered, reducedMotion, parallaxRef }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
        window.innerWidth <= 768 ? 1.5 : 2,
      )

      width = window.innerWidth
      height = window.innerHeight

      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.globalCompositeOperation = 'screen'

      stars = buildStarField(getStarCount(reducedMotion), width, height)
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

      const parallaxX = parallaxRef.current.x * (width <= 768 ? 8 : 16)
      const parallaxY = parallaxRef.current.y * (height <= 768 ? 6 : 12)
      const driftMultiplier = reducedMotion ? 0.28 : 1

      for (const star of stars) {
        star.x += star.velocityX * delta * driftMultiplier
        star.y += star.velocityY * delta * driftMultiplier

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
  }, [parallaxRef, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className={`starfield-layer ${entered ? 'is-entered' : ''}`}
      aria-hidden
    />
  )
}
