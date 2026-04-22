import { useEffect, useRef } from 'react'
import type { MutableRefObject } from 'react'
import type { MotionProfile, MotionVector } from '../motion/types'

interface DreamPortalProps {
  entered: boolean
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  className?: string
  motionProfile?: MotionProfile
}

export function DreamPortal({
  entered,
  reducedMotion,
  motionRef,
  className,
  motionProfile = { x: 1, y: 1 },
}: DreamPortalProps) {
  const floatingRef = useRef<HTMLDivElement>(null)
  const motionProfileRef = useRef(motionProfile)

  useEffect(() => {
    motionProfileRef.current = motionProfile
  }, [motionProfile])

  useEffect(() => {
    const element = floatingRef.current

    if (!element) {
      return undefined
    }

    if (reducedMotion) {
      element.style.setProperty('--portal-shift-x', '0px')
      element.style.setProperty('--portal-shift-y', '0px')
      return undefined
    }

    let frameId = 0
    let loopActive = false

    const render = () => {
      if (!loopActive) {
        return
      }

      const { x, y } = motionRef.current
      const profile = motionProfileRef.current
      element.style.setProperty('--portal-shift-x', `${(x * profile.x * 14).toFixed(2)}px`)
      element.style.setProperty('--portal-shift-y', `${(y * profile.y * 10).toFixed(2)}px`)
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
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      stopLoop()
    }
  }, [motionRef, reducedMotion])

  return (
    <div
      className={`portal-scene ${entered ? 'is-entered' : ''} ${className ?? ''}`}
      aria-hidden
    >
      <div className="portal-floating" ref={floatingRef}>
        <div className="portal-halo" />
        <div className="portal-shell">
          <div className="portal-mist portal-mist-a" />
          <div className="portal-mist portal-mist-b" />
          <div className="portal-mist portal-mist-c" />
          <div className="portal-silhouette" />
          <div className="portal-inner-glow" />

          <svg className="portal-lines" viewBox="0 0 360 460" fill="none">
            <defs>
              <linearGradient
                id="portalStrokeGradient"
                x1="180"
                y1="74"
                x2="180"
                y2="420"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="rgba(255,255,255,0.86)" />
                <stop offset="0.5" stopColor="rgba(245,219,255,0.86)" />
                <stop offset="1" stopColor="rgba(206,186,245,0.68)" />
              </linearGradient>
              <filter
                id="portalGlow"
                x="48"
                y="48"
                width="264"
                height="390"
                filterUnits="userSpaceOnUse"
              >
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>

            <path
              d="M74 420V214A106 106 0 0 1 286 214V420"
              stroke="url(#portalStrokeGradient)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path d="M74 420H286" stroke="rgba(228, 215, 255, 0.76)" strokeWidth="2.4" />
            <path
              d="M74 420V214A106 106 0 0 1 286 214V420"
              stroke="rgba(250,239,255,0.52)"
              strokeWidth="8"
              opacity="0.22"
              filter="url(#portalGlow)"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
