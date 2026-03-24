import { OrbFieldCanvas } from '../components/OrbFieldCanvas'
import type { DreamRecord } from '../types/dream'

interface DreamGallerySceneProps {
  active: boolean
  dreams: DreamRecord[]
  reducedMotion: boolean
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
  onGoHome,
  onGoMyDreams,
  onSelectDream,
  onRandomDream,
}: DreamGallerySceneProps) {
  const className = ['scene-panel', 'dream-gallery-scene', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <header className="gallery-topbar">
        <button type="button" className="topbar-link" onClick={onGoHome}>
          The Dreamkeeper
        </button>
        <p>Dream Gallery</p>
        <button type="button" className="topbar-link" onClick={onGoMyDreams}>
          My Dreams
        </button>
      </header>
      <OrbFieldCanvas
        className="gallery-orb-canvas"
        dreams={dreams}
        active={active}
        reducedMotion={reducedMotion}
        onSelect={onSelectDream}
      />
      <div className="gallery-hint">
        <p>Click on an orb to look inside another&apos;s dream</p>
        <p>Drag and scroll to navigate</p>
      </div>
      <button type="button" className="outline-pill random-dream-button" onClick={onRandomDream}>
        Random Dream
      </button>
    </section>
  )
}
