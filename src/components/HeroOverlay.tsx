import { useCallback, useMemo, useState } from 'react'
import { HeroHeadlineMetaballOverlay } from './HeroHeadlineMetaballOverlay'

interface HeroOverlayProps {
  entered: boolean
  hidden?: boolean
  reducedMotion: boolean
  onEnter: () => void
}

export function HeroOverlay({
  entered,
  hidden = false,
  reducedMotion,
  onEnter,
}: HeroOverlayProps) {
  const [metaballUnsupported, setMetaballUnsupported] = useState(false)
  const showMetaball = entered && !hidden && !reducedMotion && !metaballUnsupported

  const titleClassName = useMemo(() => {
    if (showMetaball) {
      return 'hero-title is-metaball-intro'
    }

    if (reducedMotion) {
      return 'hero-title is-metaball-skip'
    }

    return 'hero-title is-metaball-done'
  }, [reducedMotion, showMetaball])

  const handleMetaballUnsupported = useCallback(() => {
    setMetaballUnsupported(true)
  }, [])

  return (
    <section className={`hero-overlay ${entered ? 'is-entered' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <p className="hero-tag">AETHER TAROT STUDIO</p>
      <h1 className={titleClassName}>
        <span className="hero-title-final">
          <span className="hero-title-line">Whispers of the</span>
          <span className="hero-title-line">universe await</span>
        </span>

        {showMetaball ? (
          <HeroHeadlineMetaballOverlay
            text={'Whispers of the\nuniverse await'}
            onUnsupported={handleMetaballUnsupported}
          />
        ) : null}
      </h1>
      <p className="hero-sigil-row" aria-hidden>
        <span>✦</span>
        <span>☾</span>
        <span>✦</span>
      </p>
      <p className="hero-subtitle">
        Step through the luminous gate, shuffle your question, and let the cards reveal
        the gentle guidance written in your stars.
      </p>
      <button className="hero-enter" type="button" onClick={onEnter}>
        Enter
      </button>
    </section>
  )
}
