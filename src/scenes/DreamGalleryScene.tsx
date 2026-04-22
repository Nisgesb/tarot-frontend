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
}: DreamGallerySceneProps) {
  const className = [
    'scene-panel',
    'dream-gallery-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return <section className={className} aria-label="Gallery background only" />
}
