import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'

interface DreamInsightsLoaderProps {
  active: boolean
  reducedMotion: boolean
  onComplete: () => void
}

const GENERATING_STEPS = [
  {
    stage: 'Extracting dream elements',
    copy: 'Gathering symbols, spaces, and emotional anchors from your memory.',
  },
  {
    stage: 'Refining dream prompt',
    copy: 'Balancing mood, characters, and motion into a coherent narrative.',
  },
  {
    stage: 'Generating visual',
    copy: 'Rendering luminous layers and atmospheric depth.',
  },
  {
    stage: 'Preserving dream',
    copy: 'Locking details into your personal dream archive.',
  },
]

const INSIGHT_ROTATION = [
  'Dreams often orbit what matters most to you.',
  'The sleeping mind loosens constraints and remixes memory.',
  'Luminous symbols are being extracted from your fragments.',
  'Atmosphere is settling while the scene takes shape.',
  'Preserving this dream so you can return later.',
]

export function DreamInsightsLoader({
  active,
  reducedMotion,
  onComplete,
}: DreamInsightsLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [insightIndex, setInsightIndex] = useState(0)
  const completedRef = useRef(false)

  const totalDuration = reducedMotion ? 3800 : 7600

  useEffect(() => {
    if (!active) {
      return undefined
    }

    completedRef.current = false
    let frameId = 0
    const startTime = performance.now()

    const tick = (now: number) => {
      const elapsed = now - startTime
      const value = Math.min(1, elapsed / totalDuration)
      const nextStep = Math.min(
        GENERATING_STEPS.length - 1,
        Math.floor(value * GENERATING_STEPS.length),
      )

      setProgress(value)
      setStepIndex(nextStep)

      if (value >= 1) {
        if (!completedRef.current) {
          completedRef.current = true
          onComplete()
        }
        return
      }

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [active, onComplete, totalDuration])

  useEffect(() => {
    if (!active || reducedMotion) {
      return undefined
    }

    const interval = window.setInterval(() => {
      setInsightIndex((previous) => (previous + 1) % INSIGHT_ROTATION.length)
    }, 1850)

    return () => {
      window.clearInterval(interval)
    }
  }, [active, reducedMotion])

  const step = useMemo(() => GENERATING_STEPS[stepIndex], [stepIndex])
  const className = ['scene-panel', 'dream-loader-scene', active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={className}>
      <div className="loader-shell">
        <p className="loader-eyebrow">Dream Insights</p>
        <h2>Dream Insights</h2>
        <div className="loader-ring-wrap" aria-hidden>
          <div
            className="loader-ring loader-ring-core"
            style={{ '--loader-progress': progress } as CSSProperties}
          />
          <div className="loader-ring loader-ring-orbit-a" />
          <div className="loader-ring loader-ring-orbit-b" />
          <div className="loader-ring loader-ring-halo" />
          <span className="loader-orb loader-orb-a" />
          <span className="loader-orb loader-orb-b" />
        </div>
        <div className="loader-stage-track" aria-hidden>
          {GENERATING_STEPS.map((entry, index) => (
            <span
              key={entry.stage}
              className={`loader-stage-dot ${
                index === stepIndex ? 'is-current' : index < stepIndex ? 'is-passed' : ''
              }`}
            />
          ))}
        </div>
        <p className="loader-stage">{step.stage}</p>
        <p className="loader-copy">{step.copy}</p>
        <p className="loader-insight">
          {INSIGHT_ROTATION[insightIndex]}
        </p>
        <div className="loader-progress-track" aria-hidden>
          <div className="loader-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </div>
    </section>
  )
}
