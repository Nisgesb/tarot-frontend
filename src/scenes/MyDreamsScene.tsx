import { OrbFieldCanvas } from '../components/OrbFieldCanvas'
import type { DreamRecord } from '../types/dream'

interface MyDreamsSceneProps {
  active: boolean
  dreams: DreamRecord[]
  reducedMotion: boolean
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
  reducedMotion,
  onGoHome,
  onGoGallery,
  onStartNew,
  onSelectDream,
}: MyDreamsSceneProps) {
  const className = ['scene-panel', 'my-dreams-scene', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <header className="gallery-topbar">
        <button type="button" className="topbar-link" onClick={onGoHome}>
          The Dreamkeeper
        </button>
        <p>My Dreams</p>
        <button type="button" className="topbar-link" onClick={onGoGallery}>
          Dream Gallery
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
            onSelect={onSelectDream}
          />
          <div className="gallery-hint">
            <p>{dreams.length} saved dreams</p>
            <p>Drag to browse your personal orbit</p>
          </div>
        </>
      )}
    </section>
  )
}
