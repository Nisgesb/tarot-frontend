import { OrbFieldCanvas } from '../components/OrbFieldCanvas'
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
  dreams,
  title = '我的',
  reducedMotion,
  motionRef,
  motionProfile = { x: 1, y: 1 },
  performanceTier,
  pointerCoarse,
  onGoHome,
  onGoGallery,
  onStartNew,
  onSelectDream,
}: MyDreamsSceneProps) {
  const className = [
    'scene-panel',
    'scene-template-explore',
    'my-dreams-scene',
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
        <p>{title}</p>
        <button type="button" className="topbar-link" onClick={onGoGallery}>
          圈子
        </button>
      </header>

      {dreams.length === 0 ? (
        <div className="my-dreams-empty">
          <h2>Your dream vault is empty</h2>
          <p>Visualize your first dream, and it will appear here.</p>
          <button type="button" className="primary-pill" onClick={onStartNew}>
            Create Dream
          </button>
        </div>
      ) : (
        <>
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
            <p>{dreams.length} saved dreams</p>
            <p>Tap to focus, tap again to reopen</p>
          </div>
        </>
      )}
    </section>
  )
}
