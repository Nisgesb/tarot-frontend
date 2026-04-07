import { OrbFieldCanvas } from '../components/OrbFieldCanvas'
import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'

interface DreamGallerySceneProps {
  active: boolean
  dreams: DreamRecord[]
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  motionProfile?: MotionProfile
  performanceTier: PerformanceTier
  pointerCoarse: boolean
  onGoHome: () => void
  onGoMyDreams: () => void
  onSelectDream: (
    dream: DreamRecord,
    origin: {
      x: number
      y: number
      color: string
      radius: number
    },
  ) => void
  onRandomDream: () => void
}

export function DreamGalleryScene({
  active,
  dreams,
  reducedMotion,
  motionRef,
  motionProfile = { x: 1, y: 1 },
  performanceTier,
  pointerCoarse,
  onGoHome,
  onGoMyDreams,
  onSelectDream,
  onRandomDream,
}: DreamGallerySceneProps) {
  const className = [
    'scene-panel',
    'scene-template-explore',
    'dream-gallery-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <header className="gallery-topbar">
        <button type="button" className="topbar-link" onClick={onGoHome}>
          The Dreamkeeper
        </button>
        <p>圈子</p>
        <button type="button" className="topbar-link" onClick={onGoMyDreams}>
          我的
        </button>
      </header>
      <OrbFieldCanvas
        className="gallery-orb-canvas"
        dreams={dreams}
        active={active}
        reducedMotion={reducedMotion}
        motionRef={motionRef}
        motionProfile={motionProfile}
        performanceTier={performanceTier}
        pointerCoarse={pointerCoarse}
        onSelect={onSelectDream}
      />
      <div className="gallery-hint">
        <p>Tap an orb to focus, tap again to enter another dream</p>
        <p>Drag and scroll to navigate</p>
      </div>
      <button type="button" className="outline-pill random-dream-button" onClick={onRandomDream}>
        Random Dream
      </button>
    </section>
  )
}
