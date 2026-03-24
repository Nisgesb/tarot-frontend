import { useEffect, useState } from 'react'
import { DreamPortal } from './components/DreamPortal'
import { HeroOverlay } from './components/HeroOverlay'
import { NebulaBackground } from './components/NebulaBackground'
import { StarField } from './components/StarField'
import { useParallax } from './hooks/useParallax'
import { useReducedMotion } from './hooks/useReducedMotion'

function App() {
  const reducedMotion = useReducedMotion()
  const parallaxRef = useParallax(!reducedMotion)
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      return undefined
    }

    const timer = window.setTimeout(() => {
      setHasAnimatedIn(true)
    }, 24)

    return () => {
      window.clearTimeout(timer)
    }
  }, [reducedMotion])

  const entered = reducedMotion || hasAnimatedIn

  return (
    <main className={`hero-root ${entered ? 'is-entered' : ''}`}>
      <NebulaBackground
        entered={entered}
        reducedMotion={reducedMotion}
        parallaxRef={parallaxRef}
      />
      <StarField
        entered={entered}
        reducedMotion={reducedMotion}
        parallaxRef={parallaxRef}
      />
      <DreamPortal
        entered={entered}
        reducedMotion={reducedMotion}
        parallaxRef={parallaxRef}
      />
      <HeroOverlay entered={entered} />
    </main>
  )
}

export default App
