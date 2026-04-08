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
    'dream-gallery-scene',
    active ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      {active && dreams.length > 0 ? (
        <OrbFieldCanvas
          className="explore-orb-canvas"
          dreams={dreams}
          active={active}
          reducedMotion={reducedMotion}
          motionRef={motionRef}
          motionProfile={motionProfile}
          performanceTier={performanceTier}
          pointerCoarse={pointerCoarse}
          onSelect={onSelectDream}
        />
      ) : null}
      <div className="explore-scene-scrim" aria-hidden />
      <div className="explore-scene-shell">
        <header className="explore-topbar">
          <button type="button" className="topbar-link explore-nav-link" onClick={onGoHome}>
            首页
          </button>
          <button type="button" className="topbar-link explore-nav-link" onClick={onGoMyDreams}>
            我的
          </button>
        </header>

        <div className="explore-hero">
          <p className="explore-eyebrow">Shared Dreams</p>
          <h1 className="explore-title">Collective</h1>
          <p className="explore-subtitle">
            在共享梦境里浏览别人的象征与能量，沿着漂浮的线索进入另一场叙事。
          </p>
        </div>

        <div className="explore-summary-grid">
          <article className="explore-summary-card">
            <p className="explore-card-label">CURATED</p>
            <p className="explore-card-value">{dreams.length}</p>
            <p className="explore-card-copy">共享梦境</p>
          </article>
          <article className="explore-summary-card explore-summary-card-accent">
            <p className="explore-card-label">FLOW</p>
            <p className="explore-card-value explore-card-value-title">Tap & Drift</p>
            <p className="explore-card-copy">拖拽探索，点击光球聚焦进入</p>
          </article>
        </div>

        <div className="explore-floating-note">
          <p>Tap an orb to focus, tap again to enter another dream</p>
          <p>拖拽浏览整个场域，挑一场最吸引你的梦</p>
        </div>
      </div>
      <button
        type="button"
        className="outline-pill random-dream-button explore-random-button"
        onClick={onRandomDream}
      >
        随机进入一场
      </button>
    </section>
  )
}
