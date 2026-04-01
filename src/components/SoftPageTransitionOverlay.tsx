import type { EnterTransitionPhase } from '../hooks/useEnterTransition'

interface SoftPageTransitionOverlayProps {
  active: boolean
  phase: EnterTransitionPhase
}

export function SoftPageTransitionOverlay({
  active,
  phase,
}: SoftPageTransitionOverlayProps) {
  if (!active) {
    return null
  }

  const className = [
    'soft-page-transition',
    phase !== 'idle' ? `soft-page-transition-phase-${phase}` : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} aria-hidden>
      <div className="soft-page-transition-mist" />
      <div className="soft-page-transition-glow" />
      <div className="soft-page-transition-grain" />
    </div>
  )
}
