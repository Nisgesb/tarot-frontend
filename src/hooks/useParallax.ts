import { useEffect, useRef } from 'react'

export interface ParallaxPoint {
  x: number
  y: number
}

export function useParallax(enabled: boolean) {
  const valueRef = useRef<ParallaxPoint>({ x: 0, y: 0 })

  useEffect(() => {
    const target = { x: 0, y: 0 }
    let frameId = 0

    if (!enabled) {
      valueRef.current = { x: 0, y: 0 }
      return undefined
    }

    const onPointerMove = (event: PointerEvent) => {
      const normalizedX = event.clientX / window.innerWidth - 0.5
      const normalizedY = event.clientY / window.innerHeight - 0.5

      target.x = Math.max(-1, Math.min(1, normalizedX * 2))
      target.y = Math.max(-1, Math.min(1, normalizedY * 2))
    }

    const reset = () => {
      target.x = 0
      target.y = 0
    }

    const tick = () => {
      valueRef.current.x += (target.x - valueRef.current.x) * 0.08
      valueRef.current.y += (target.y - valueRef.current.y) * 0.08
      frameId = window.requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('blur', reset)
    tick()

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('blur', reset)
      window.cancelAnimationFrame(frameId)
    }
  }, [enabled])

  return valueRef
}
