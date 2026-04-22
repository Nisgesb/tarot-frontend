import type { MutableRefObject } from 'react'
import type { PerformanceTier } from '../hooks/useViewportProfile'
import type { MotionProfile, MotionVector } from '../motion/types'
import type { DreamRecord } from '../types/dream'

interface MyDreamsSceneProps {
  active: boolean
  dreams: DreamRecord[]
  title?: string
  reducedMotion: boolean
  motionRef: MutableRefObject<MotionVector>
  motionProfile?: MotionProfile
  performanceTier: PerformanceTier
  pointerCoarse: boolean
  onGoHome: () => void
  onGoGallery: () => void
  onStartNew: () => void
  onSelectDream: (
    dream: DreamRecord,
    origin: {
      x: number
      y: number
      color: string
      radius: number
    },
  ) => void
}

export function MyDreamsScene({
  active,
}: MyDreamsSceneProps) {
  const className = [
    'scene-panel',
    'my-dreams-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return <section className={className} aria-label="My page background only" />
}
