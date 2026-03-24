import { useEffect, useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'
import { clamp } from '../utils/seeded'

interface OrbFieldCanvasProps {
  dreams: DreamRecord[]
  active: boolean
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  motionProfile?: MotionProfile
  performanceTier?: PerformanceTier
  pointerCoarse: boolean
  className?: string
  onSelect: (
    record: DreamRecord,
    origin: {
      x: number
      y: number
      color: string
      radius: number
    },
  ) => void
}

interface OrbNode {
  dream: DreamRecord
  x: number
  y: number
  radius: number
  depth: number
  phase: number
}

interface ScreenOrb {
  dream: DreamRecord
  x: number
  y: number
  radius: number
  depth: number
}

function buildOrbNodes(dreams: DreamRecord[], performanceTier: PerformanceTier) {
  const densityScale = performanceTier === 'low' ? 0.72 : performanceTier === 'medium' ? 0.88 : 1

  return dreams
    .slice(0, Math.max(8, Math.floor(dreams.length * densityScale)))
    .map((dream, index): OrbNode => {
      const seed = dream.asset.seed
      const angle = ((seed % 360) / 180) * Math.PI + index * 0.67
      const radiusBand = 260 + (seed % 900)
      const x = Math.cos(angle) * radiusBand * 0.9 + ((seed % 101) - 50) * 3
      const y = Math.sin(angle * 1.23) * radiusBand * 0.55 + (((seed >> 3) % 81) - 40) * 4
      const depth = 0.56 + (((seed >> 6) % 100) / 100) * 0.95
      const radius = 42 + ((seed >> 9) % 58)
      const phase = ((seed >> 14) % 360) / 57.3

      return {
        dream,
        x,
        y,
        radius,
        depth,
        phase,
      }
    })
}

export function OrbFieldCanvas({
  dreams,
  active,
  reducedMotion,
  motionRef,
  motionProfile = { x: 1, y: 1 },
  performanceTier = 'high',
  pointerCoarse,
  className,
  onSelect,
}: OrbFieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef({
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    zoom: 1,
  })
  const pointerRef = useRef({
    x: 0,
    y: 0,
    down: false,
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pointerType: 'mouse' as string,
  })
  const focusedDreamIdRef = useRef<string | null>(null)
  const lastTapRef = useRef<{ id: string | null; time: number }>({ id: null, time: 0 })
  const renderedOrbsRef = useRef<ScreenOrb[]>([])
  const motionProfileRef = useRef(motionProfile)

  const orbNodes = useMemo(
    () => buildOrbNodes(dreams, performanceTier),
    [dreams, performanceTier],
  )

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
    let width = 0
    let height = 0

    const resize = () => {
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        performanceTier === 'low' ? 1.15 : performanceTier === 'medium' ? 1.3 : window.innerWidth <= 768 ? 1.4 : 2,
      )
      width = Math.floor(window.innerWidth)
      height = Math.floor(window.innerHeight)
      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }

    const findHit = (x: number, y: number) => {
      for (let index = renderedOrbsRef.current.length - 1; index >= 0; index -= 1) {
        const orb = renderedOrbsRef.current[index]
        const dx = x - orb.x
        const dy = y - orb.y
        if (dx * dx + dy * dy <= orb.radius * orb.radius) {
          return orb
        }
      }
      return null
    }

    const onPointerDown = (event: PointerEvent) => {
      pointerRef.current.down = true
      pointerRef.current.moved = false
      pointerRef.current.startX = event.clientX
      pointerRef.current.startY = event.clientY
      pointerRef.current.lastX = event.clientX
      pointerRef.current.lastY = event.clientY
      pointerRef.current.pointerType = event.pointerType
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX
      pointerRef.current.y = event.clientY

      if (!pointerRef.current.down) {
        return
      }

      const dx = event.clientX - pointerRef.current.lastX
      const dy = event.clientY - pointerRef.current.lastY

      pointerRef.current.lastX = event.clientX
      pointerRef.current.lastY = event.clientY

      if (
        Math.abs(event.clientX - pointerRef.current.startX) > 5 ||
        Math.abs(event.clientY - pointerRef.current.startY) > 5
      ) {
        pointerRef.current.moved = true
      }

      const camera = cameraRef.current
      camera.x += (dx * 1.2) / camera.zoom
      camera.y += (dy * 1.2) / camera.zoom
      camera.velocityX = dx
      camera.velocityY = dy
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!pointerRef.current.moved) {
        const hit = findHit(event.clientX, event.clientY)

        if (hit) {
          const now = performance.now()
          const secondTap =
            pointerCoarse &&
            lastTapRef.current.id === hit.dream.id &&
            now - lastTapRef.current.time < 760

          focusedDreamIdRef.current = hit.dream.id
          lastTapRef.current = {
            id: hit.dream.id,
            time: now,
          }

          if (!pointerCoarse || secondTap) {
            onSelect(hit.dream, {
              x: event.clientX,
              y: event.clientY,
              color: hit.dream.asset.orbAccent,
              radius: hit.radius,
            })
          }
        }
      }

      pointerRef.current.down = false
      canvas.releasePointerCapture(event.pointerId)
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const camera = cameraRef.current
      const zoomShift = event.deltaY > 0 ? -0.06 : 0.06
      camera.zoom = clamp(camera.zoom + zoomShift, 0.72, 1.5)
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    const render = (time: number) => {
      const elapsed = time * 0.001
      const camera = cameraRef.current
      const pointer = pointerRef.current
      const motion = motionRef.current
      const profile = motionProfileRef.current

      if (!pointer.down) {
        camera.x += camera.velocityX * 0.8
        camera.y += camera.velocityY * 0.8
        camera.velocityX *= 0.92
        camera.velocityY *= 0.92
      }

      context.clearRect(0, 0, width, height)
      renderedOrbsRef.current = []

      const sorted = [...orbNodes].sort((a, b) => a.depth - b.depth)

      const motionOffsetX = reducedMotion ? 0 : motion.x * profile.x * 34
      const motionOffsetY = reducedMotion ? 0 : motion.y * profile.y * 28

      for (const orb of sorted) {
        const drift = reducedMotion ? 0 : Math.sin(elapsed * 0.2 + orb.phase) * 18
        const screenX =
          width * 0.5 +
          (orb.x + camera.x * orb.depth + drift + motionOffsetX * (0.38 + orb.depth * 0.3)) *
            camera.zoom
        const screenY =
          height * 0.5 +
          (orb.y +
            camera.y * orb.depth +
            Math.cos(elapsed * 0.27 + orb.phase) * 10 +
            motionOffsetY * (0.32 + orb.depth * 0.28)) *
            camera.zoom
        const pulse = reducedMotion ? 1 : 0.96 + Math.sin(elapsed * 0.7 + orb.phase) * 0.06
        const radius = orb.radius * (0.46 + orb.depth * 0.74) * pulse * camera.zoom

        if (screenX < -radius * 2 || screenX > width + radius * 2) continue
        if (screenY < -radius * 2 || screenY > height + radius * 2) continue

        renderedOrbsRef.current.push({
          dream: orb.dream,
          x: screenX,
          y: screenY,
          radius,
          depth: orb.depth,
        })

        const isFocused = focusedDreamIdRef.current === orb.dream.id
        const focusedBoost = isFocused ? 1.16 : 1
        const depthOpacity = clamp((orb.depth - 0.45) / 1.35, 0.18, 1)

        const glow = context.createRadialGradient(
          screenX,
          screenY,
          radius * 0.3,
          screenX,
          screenY,
          radius * 2.3,
        )
        glow.addColorStop(0, `${orb.dream.asset.orbAccent}A8`)
        glow.addColorStop(1, 'rgba(43, 71, 183, 0)')
        context.globalCompositeOperation = 'screen'
        context.globalAlpha = depthOpacity
        context.fillStyle = glow
        context.beginPath()
        context.arc(screenX, screenY, radius * 2.5 * focusedBoost, 0, Math.PI * 2)
        context.fill()

        context.save()
        context.beginPath()
        context.arc(screenX, screenY, radius, 0, Math.PI * 2)
        context.clip()
        context.filter = `blur(${clamp((1.05 - orb.depth) * 2.4, 0, 2.2)}px)`
        const inner = context.createLinearGradient(
          screenX - radius * 1.15,
          screenY - radius,
          screenX + radius * 1.1,
          screenY + radius * 1.15,
        )
        inner.addColorStop(0, `${orb.dream.asset.palette[0]}D6`)
        inner.addColorStop(0.38, `${orb.dream.asset.palette[2]}B3`)
        inner.addColorStop(0.7, `${orb.dream.asset.palette[3]}92`)
        inner.addColorStop(1, `${orb.dream.asset.palette[4]}B8`)
        context.globalCompositeOperation = 'source-over'
        context.globalAlpha = clamp(depthOpacity + 0.1, 0.32, 1)
        context.fillStyle = inner
        context.fillRect(screenX - radius, screenY - radius, radius * 2, radius * 2)

        for (let layerIndex = 0; layerIndex < 3; layerIndex += 1) {
          const layer = orb.dream.asset.layers[layerIndex]
          const lx =
            screenX +
            (layer.x - 0.5) * radius * 1.8 +
            Math.sin(elapsed * (0.7 + layerIndex * 0.3) + orb.phase) * radius * 0.14
          const ly =
            screenY +
            (layer.y - 0.5) * radius * 1.8 +
            Math.cos(elapsed * (0.55 + layerIndex * 0.2) + orb.phase) * radius * 0.1
          const lr = radius * (0.3 + layer.size * 0.35)
          const layerGradient = context.createRadialGradient(lx, ly, lr * 0.1, lx, ly, lr)
          layerGradient.addColorStop(
            0,
            `${orb.dream.asset.palette[(layerIndex + 1) % orb.dream.asset.palette.length]}AA`,
          )
          layerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
          context.globalCompositeOperation = 'screen'
          context.globalAlpha = 0.34
          context.fillStyle = layerGradient
          context.beginPath()
          context.arc(lx, ly, lr, 0, Math.PI * 2)
          context.fill()
        }

        for (let stripe = 0; stripe < 3; stripe += 1) {
          const stripeOffset =
            (elapsed * (10 + stripe * 4) + orb.phase * 20 + stripe * 32) % (radius * 2.4)
          context.fillStyle = `rgba(255, 255, 255, ${0.06 + stripe * 0.026})`
          context.fillRect(
            screenX - radius * 1.2 + stripeOffset,
            screenY - radius * 1.2,
            radius * 0.2,
            radius * 2.4,
          )
        }

        const crescent = context.createRadialGradient(
          screenX - radius * 0.28,
          screenY - radius * 0.34,
          radius * 0.05,
          screenX - radius * 0.16,
          screenY - radius * 0.18,
          radius * 0.9,
        )
        crescent.addColorStop(0, 'rgba(255, 255, 255, 0.5)')
        crescent.addColorStop(0.45, 'rgba(255, 255, 255, 0.12)')
        crescent.addColorStop(1, 'rgba(255, 255, 255, 0)')
        context.globalCompositeOperation = 'lighter'
        context.globalAlpha = 0.9
        context.fillStyle = crescent
        context.beginPath()
        context.arc(screenX - radius * 0.04, screenY - radius * 0.08, radius * 0.9, 0, Math.PI * 2)
        context.fill()

        context.restore()
        context.filter = 'none'
        context.globalAlpha = 1

        const ring = context.createRadialGradient(
          screenX - radius * 0.3,
          screenY - radius * 0.36,
          radius * 0.15,
          screenX,
          screenY,
          radius,
        )
        ring.addColorStop(0, 'rgba(246, 250, 255, 0.5)')
        ring.addColorStop(1, 'rgba(199, 221, 255, 0.26)')
        context.strokeStyle = ring
        context.lineWidth = isFocused ? 2.2 : 1.2
        context.beginPath()
        context.arc(screenX, screenY, radius, 0, Math.PI * 2)
        context.stroke()
      }

      if (!pointer.down && !pointerCoarse) {
        const safeWidth = Math.max(width, 1)
        const safeHeight = Math.max(height, 1)
        const pointerOffsetX = (pointer.x / safeWidth - 0.5) * 4
        const pointerOffsetY = (pointer.y / safeHeight - 0.5) * 3
        camera.velocityX += pointerOffsetX * 0.004
        camera.velocityY += pointerOffsetY * 0.004
      }

      canvas.style.cursor = pointer.down ? 'grabbing' : pointerCoarse ? 'default' : 'grab'

      if (!active) {
        context.fillStyle = 'rgba(0, 8, 34, 0.46)'
        context.fillRect(0, 0, width, height)
      }

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
      window.cancelAnimationFrame(frameId)
    }
  }, [
    active,
    motionRef,
    onSelect,
    orbNodes,
    performanceTier,
    pointerCoarse,
    reducedMotion,
  ])

  return <canvas ref={canvasRef} className={className} aria-label="Dream orb field" />
}
