import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type EnterTransitionPhase =
  | 'idle'
  | 'fadeOut'
  | 'glow'
  | 'settle'

interface EnterTransitionState {
  active: boolean
  phase: EnterTransitionPhase
}

interface EnterTransitionStep {
  phase: Exclude<EnterTransitionPhase, 'idle'>
  durationMs: number
  triggerSwap?: boolean
}

interface UseEnterTransitionOptions {
  reducedMotion: boolean
}

interface EnterTransitionStartOptions {
  onSwap?: () => void
  onComplete?: () => void
}

export const ENTER_SOFT_TIMING = Object.freeze({
  fadeOutMs: 280,
  glowMs: 360,
  settleMs: 320,
})

export const ENTER_SOFT_TIMING_REDUCED = Object.freeze({
  fadeOutMs: 140,
  glowMs: 180,
  settleMs: 200,
})

const SOFT_STEPS: EnterTransitionStep[] = [
  { phase: 'fadeOut', durationMs: ENTER_SOFT_TIMING.fadeOutMs, triggerSwap: true },
  { phase: 'glow', durationMs: ENTER_SOFT_TIMING.glowMs },
  { phase: 'settle', durationMs: ENTER_SOFT_TIMING.settleMs },
]

const REDUCED_STEPS: EnterTransitionStep[] = [
  {
    phase: 'fadeOut',
    durationMs: ENTER_SOFT_TIMING_REDUCED.fadeOutMs,
    triggerSwap: true,
  },
  { phase: 'glow', durationMs: ENTER_SOFT_TIMING_REDUCED.glowMs },
  { phase: 'settle', durationMs: ENTER_SOFT_TIMING_REDUCED.settleMs },
]

function getTotalDuration(steps: EnterTransitionStep[]) {
  return steps.reduce((total, step) => total + step.durationMs, 0)
}

export function useEnterTransition({
  reducedMotion,
}: UseEnterTransitionOptions) {
  const [state, setState] = useState<EnterTransitionState>({
    active: false,
    phase: 'idle',
  })
  const timersRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (let index = 0; index < timersRef.current.length; index += 1) {
      window.clearTimeout(timersRef.current[index])
    }
    timersRef.current = []
  }, [])

  const steps = useMemo(
    () => (reducedMotion ? REDUCED_STEPS : SOFT_STEPS),
    [reducedMotion],
  )

  const reset = useCallback(() => {
    clearTimers()
    setState({
      active: false,
      phase: 'idle',
    })
  }, [clearTimers])

  const start = useCallback((options?: EnterTransitionStartOptions) => {
    clearTimers()

    if (steps.length === 0) {
      options?.onSwap?.()
      options?.onComplete?.()
      return
    }

    setState({
      active: true,
      phase: steps[0].phase,
    })

    let elapsed = 0

    for (let index = 1; index < steps.length; index += 1) {
      const previousStep = steps[index - 1]
      elapsed += previousStep.durationMs

      if (previousStep.triggerSwap) {
        timersRef.current.push(
          window.setTimeout(() => {
            options?.onSwap?.()
          }, elapsed),
        )
      }

      timersRef.current.push(
        window.setTimeout(() => {
          setState({
            active: true,
            phase: steps[index].phase,
          })
        }, elapsed),
      )
    }

    const total = getTotalDuration(steps)
    timersRef.current.push(
      window.setTimeout(() => {
        setState({
          active: false,
          phase: 'idle',
        })
        options?.onComplete?.()
      }, total),
    )
  }, [clearTimers, steps])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [clearTimers])

  return {
    state,
    totalDurationMs: getTotalDuration(steps),
    start,
    reset,
  }
}
