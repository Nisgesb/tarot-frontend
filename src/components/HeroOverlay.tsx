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
      <p className="hero-tag">AETHER STUDIO</p>
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
      <p className="hero-subtitle">
        A speculative collaboration where imagination and intelligent systems
        converge to turn impossible visions into luminous moments.
      </p>
      <button className="hero-enter" type="button" onClick={onEnter}>
        Enter
      </button>
    </section>
  )
}
