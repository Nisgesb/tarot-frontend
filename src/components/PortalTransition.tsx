import type { CSSProperties } from 'react'

export interface PortalTransitionOrigin {
  x: number
  y: number
  color?: string
  radius?: number
}

interface PortalTransitionProps {
  active: boolean
  origin?: PortalTransitionOrigin | null
}

export function PortalTransition({
  active,
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
    'portal-transition-orb',
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
