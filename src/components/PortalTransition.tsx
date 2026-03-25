import type { CSSProperties } from 'react'
import type { EnterTransitionPhase } from '../hooks/useEnterTransition'

export interface PortalTransitionOrigin {
  x: number
  y: number
  color?: string
  radius?: number
}

interface PortalTransitionProps {
  mode: 'enter' | 'orb'
  active: boolean
  phase?: EnterTransitionPhase
  reducedMotion?: boolean
  origin?: PortalTransitionOrigin | null
}

export function PortalTransition({
  mode,
  active,
  phase = 'idle',
  reducedMotion = false,
  origin,
}: PortalTransitionProps) {
  if (!active) {
    return null
  }

  const style: CSSProperties = {
    '--transition-origin-x': `${origin?.x ?? window.innerWidth / 2}px`,
    '--transition-origin-y': `${origin?.y ?? window.innerHeight / 2}px`,
    '--transition-color': origin?.color ?? 'rgba(209, 184, 255, 0.8)',
    '--transition-origin-radius': `${origin?.radius ?? 64}px`,
  } as CSSProperties

  const className = [
    'portal-transition',
    `portal-transition-${mode}`,
    mode === 'enter' ? `portal-transition-phase-${phase}` : '',
    reducedMotion ? 'is-reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} style={style} aria-hidden>
      <div className="portal-transition-bloom" />
      <div className="portal-transition-ring" />
      <div className="portal-transition-aperture" />
      <div className="portal-transition-depth" />
      <div className="portal-transition-flare" />
      <div className="portal-transition-fog portal-transition-fog-a" />
      <div className="portal-transition-fog portal-transition-fog-b" />
      <div className="portal-transition-noise" />
      <div className="portal-transition-vignette" />
    </div>
  )
}
