import { useEffect, useRef } from 'react'
import type { DreamAsset } from '../types/dream'

interface DreamVisualCanvasProps {
  asset: DreamAsset
  active: boolean
  reducedMotion: boolean
  className?: string
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void
}

export function DreamVisualCanvas({
  asset,
  active,
  reducedMotion,
  className,
  onCanvasReady,
}: DreamVisualCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    onCanvasReady?.(canvasRef.current)

    return () => {
      onCanvasReady?.(null)
    }
  }, [onCanvasReady])

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
    let lastTime = 0

    const resize = () => {
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        window.innerWidth <= 768 ? 1.4 : 2,
      )
      const bounds = canvas.getBoundingClientRect()

      width = Math.max(1, Math.floor(bounds.width))
      height = Math.max(1, Math.floor(bounds.height))

      canvas.width = Math.floor(width * pixelRatio)
      canvas.height = Math.floor(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.globalCompositeOperation = 'source-over'
    }

    resize()
    window.addEventListener('resize', resize)

    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current.x = event.clientX / window.innerWidth - 0.5
      pointerRef.current.y = event.clientY / window.innerHeight - 0.5
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })

    const render = (time: number) => {
      if (!active) {
        frameId = window.requestAnimationFrame(render)
        return
      }

      if (lastTime === 0) {
        lastTime = time
      }

      const elapsed = time * 0.001
      const pointer = pointerRef.current
      const parallaxX = reducedMotion ? 0 : pointer.x * width * 0.035
      const parallaxY = reducedMotion ? 0 : pointer.y * height * 0.03
      lastTime = time

      context.clearRect(0, 0, width, height)

      const base = context.createLinearGradient(
        parallaxX * 0.35,
        parallaxY * 0.25,
        width + parallaxX * 0.6,
        height + parallaxY * 0.6,
      )
      base.addColorStop(0, asset.palette[0])
      base.addColorStop(0.5, asset.palette[1])
      base.addColorStop(1, asset.palette[2])
      context.fillStyle = base
      context.fillRect(0, 0, width, height)

      for (let index = 0; index < asset.layers.length; index += 1) {
        const layer = asset.layers[index]
        const pulse = reducedMotion
          ? 1
          : 0.92 + 0.08 * Math.sin(elapsed * asset.pulseSpeed + index * 0.93)
        const depthShift = 0.18 + index / asset.layers.length
        const x =
          (layer.x + Math.sin(elapsed * layer.driftX) * 0.06) * width +
          parallaxX * depthShift
        const y =
          (layer.y + Math.cos(elapsed * layer.driftY) * 0.07) * height +
          parallaxY * depthShift
        const radius = Math.max(width, height) * layer.size * pulse

        const gradient = context.createRadialGradient(x, y, radius * 0.02, x, y, radius)
        gradient.addColorStop(0, `${asset.palette[index % asset.palette.length]}CC`)
        gradient.addColorStop(0.6, `${asset.palette[(index + 1) % asset.palette.length]}66`)
        gradient.addColorStop(1, 'rgba(6, 10, 42, 0)')

        context.globalCompositeOperation = 'screen'
        context.filter = `blur(${layer.blur}px) saturate(1.1)`
        context.globalAlpha = layer.alpha
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, radius, 0, Math.PI * 2)
        context.fill()
      }

      for (let band = 0; band < 6; band += 1) {
        const progress = band / 6
        const waveY =
          height * (0.1 + progress * 0.82) +
          Math.sin(elapsed * (0.4 + band * 0.09) + band * 1.8 + pointer.x * 3) * 24
        context.globalCompositeOperation = 'soft-light'
        context.globalAlpha = 0.08 + progress * 0.06
        context.strokeStyle = asset.palette[(band + 2) % asset.palette.length]
        context.lineWidth = 10 + progress * 8
        context.beginPath()
        context.moveTo(-width * 0.1, waveY)
        context.bezierCurveTo(
          width * 0.2,
          waveY - 24 + Math.cos(elapsed * 0.35 + band) * 20,
          width * 0.7,
          waveY + 30 + Math.sin(elapsed * 0.4 + band) * 16,
          width * 1.2,
          waveY - 6,
        )
        context.stroke()
      }

      context.filter = 'none'
      context.globalCompositeOperation = 'overlay'
      context.globalAlpha = 0.28
      const highlight = context.createLinearGradient(0, 0, width, 0)
      highlight.addColorStop(0, 'rgba(255,255,255,0)')
      highlight.addColorStop(0.5, 'rgba(245,226,255,0.55)')
      highlight.addColorStop(1, 'rgba(255,255,255,0)')
      context.fillStyle = highlight
      context.fillRect(0, 0, width, height)

      context.globalCompositeOperation = 'soft-light'
      context.globalAlpha = asset.grain
      const noiseWidth = 36
      const noiseHeight = 36
      for (let nx = 0; nx < width; nx += noiseWidth) {
        for (let ny = 0; ny < height; ny += noiseHeight) {
          const noise = (Math.sin((nx + ny + elapsed * 200) * 0.018) + 1) / 2
          context.fillStyle = `rgba(255,255,255,${noise * 0.08})`
          context.fillRect(nx, ny, noiseWidth, noiseHeight)
        }
      }

      context.globalCompositeOperation = 'multiply'
      context.globalAlpha = 0.88
      const vignette = context.createRadialGradient(
        width * 0.5 + parallaxX * 0.3,
        height * 0.46 + parallaxY * 0.22,
        Math.min(width, height) * 0.2,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.8,
      )
      vignette.addColorStop(0, 'rgba(0, 16, 48, 0)')
      vignette.addColorStop(1, 'rgba(1, 9, 34, 0.62)')
      context.fillStyle = vignette
      context.fillRect(0, 0, width, height)

      context.globalCompositeOperation = 'screen'
      context.globalAlpha = 0.22
      const edgeGlow = context.createLinearGradient(0, height * 0.02, 0, height * 0.98)
      edgeGlow.addColorStop(0, 'rgba(238, 241, 255, 0.5)')
      edgeGlow.addColorStop(0.2, 'rgba(255,255,255,0)')
      edgeGlow.addColorStop(0.78, 'rgba(255,255,255,0)')
      edgeGlow.addColorStop(1, 'rgba(183, 217, 255, 0.36)')
      context.fillStyle = edgeGlow
      context.fillRect(0, 0, width, height)

      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1

      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.cancelAnimationFrame(frameId)
    }
  }, [active, asset, reducedMotion])

  return <canvas ref={canvasRef} className={className} />
}
