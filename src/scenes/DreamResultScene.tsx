import { useState } from 'react'
import { DreamVisualCanvas } from '../components/DreamVisualCanvas'
import type { DreamRecord } from '../types/dream'

interface DreamResultSceneProps {
  active: boolean
  mode: 'result' | 'inspect'
  dream: DreamRecord | null
  inspectSource: 'gallery' | 'myDreams' | null
  reducedMotion: boolean
  onGoHome: () => void
  onGoGallery: () => void
  onGoMyDreams: () => void
  onBackFromInspect: () => void
  onDreamAgain: (record: DreamRecord) => void
  onDownload: (record: DreamRecord, canvas: HTMLCanvasElement | null) => void
}

export function DreamResultScene({
  active,
  mode,
  dream,
  inspectSource,
  reducedMotion,
  onGoHome,
  onGoGallery,
  onGoMyDreams,
  onBackFromInspect,
  onDreamAgain,
  onDownload,
}: DreamResultSceneProps) {
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null)

  const className = ['scene-panel', 'dream-result-scene', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')
  const sectionClassName = `${className} ${mode === 'inspect' ? 'is-inspect' : ''}`

  if (!dream) {
    return (
      <section className={sectionClassName}>
        <div className="result-empty">
          <h2>Dream not found</h2>
          <p>This dream is no longer available in the current memory.</p>
          <button type="button" className="primary-pill" onClick={onGoHome}>
            Back to Hero
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className={sectionClassName}>
      <header className="result-topbar">
        <button type="button" className="topbar-link" onClick={mode === 'inspect' ? onBackFromInspect : onGoHome}>
          {mode === 'inspect'
            ? inspectSource === 'myDreams'
              ? 'Back to My Dreams'
              : 'Back to Gallery'
            : 'AETHER STUDIO'}
        </button>
        <p className="result-top-title">The Dreamkeeper</p>
        <nav className="result-nav">
          <button type="button" className="topbar-link" onClick={onGoMyDreams}>
            My Dreams
          </button>
          <button type="button" className="topbar-link" onClick={onGoGallery}>
            Dream Gallery
          </button>
        </nav>
      </header>

      <div className="result-copy">
        <p className="result-copy-eyebrow">Dream Fragment</p>
        <p>{dream.refinedPrompt}</p>
      </div>

      <div className="result-visual-shell">
        <DreamVisualCanvas
          asset={dream.asset}
          active={active}
          reducedMotion={reducedMotion}
          className="result-visual-canvas"
          onCanvasReady={setCanvasNode}
        />
        <div className="result-visual-vignette" aria-hidden />
        <div className="result-visual-sheen" aria-hidden />
      </div>

      <div className="result-actions">
        <button
          type="button"
          className="outline-pill"
          onClick={() => onDownload(dream, canvasNode)}
        >
          Download
        </button>
        <button
          type="button"
          className="outline-pill"
          onClick={() => onDreamAgain(dream)}
        >
          Dream Again
        </button>
        <button type="button" className="outline-pill" onClick={onGoGallery}>
          Explore Gallery
        </button>
      </div>

      <a href="#" className="privacy-link" onClick={(event) => event.preventDefault()}>
        Privacy
      </a>
    </section>
  )
}
