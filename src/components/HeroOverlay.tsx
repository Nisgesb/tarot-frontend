interface HeroOverlayProps {
  entered: boolean
  hidden?: boolean
  onEnter: () => void
}

export function HeroOverlay({ entered, hidden = false, onEnter }: HeroOverlayProps) {
  return (
    <section className={`hero-overlay ${entered ? 'is-entered' : ''} ${hidden ? 'is-hidden' : ''}`}>
      <p className="hero-tag">AETHER STUDIO</p>
      <h1 className="hero-title">
        <span>Whispers of the</span>
        <span>universe await</span>
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
