import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type EnterTransitionPhase =
  | 'idle'
  | 'commit'
  | 'pull'
  | 'traverse'
  | 'arrival'

interface EnterTransitionState {
  active: boolean
  phase: EnterTransitionPhase
}

interface EnterTransitionStep {
  phase: Exclude<EnterTransitionPhase, 'idle'>
  durationMs: number
}

interface UseEnterTransitionOptions {
  reducedMotion: boolean
  onComplete: () => void
}

export const ENTER_TRAVEL_TIMING = Object.freeze({
  commitMs: 160,
  pullMs: 460,
  traverseMs: 480,
  arrivalMs: 500,
})

export const ENTER_TRAVEL_TIMING_REDUCED = Object.freeze({
  commitMs: 90,
  arrivalMs: 180,
})

const CINEMATIC_STEPS: EnterTransitionStep[] = [
  { phase: 'commit', durationMs: ENTER_TRAVEL_TIMING.commitMs },
  { phase: 'pull', durationMs: ENTER_TRAVEL_TIMING.pullMs },
  { phase: 'traverse', durationMs: ENTER_TRAVEL_TIMING.traverseMs },
  { phase: 'arrival', durationMs: ENTER_TRAVEL_TIMING.arrivalMs },
]

const REDUCED_STEPS: EnterTransitionStep[] = [
  { phase: 'commit', durationMs: ENTER_TRAVEL_TIMING_REDUCED.commitMs },
  { phase: 'arrival', durationMs: ENTER_TRAVEL_TIMING_REDUCED.arrivalMs },
]

function getTotalDuration(steps: EnterTransitionStep[]) {
  return steps.reduce((total, step) => total + step.durationMs, 0)
}

export function useEnterTransition({
  reducedMotion,
  onComplete,
}: UseEnterTransitionOptions) {
  const [state, setState] = useState<EnterTransitionState>({
    active: false,
    phase: 'idle',
  })
  const timersRef = useRef<number[]>([])
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const clearTimers = useCallback(() => {
    for (let index = 0; index < timersRef.current.length; index += 1) {
      window.clearTimeout(timersRef.current[index])
    }
    timersRef.current = []
  }, [])

  const steps = useMemo(
    () => (reducedMotion ? REDUCED_STEPS : CINEMATIC_STEPS),
    [reducedMotion],
  )

  const reset = useCallback(() => {
    clearTimers()
    setState({
      active: false,
      phase: 'idle',
    })
  }, [clearTimers])

  const start = useCallback(() => {
    clearTimers()

    if (steps.length === 0) {
      onCompleteRef.current()
      return
    }

    setState({
      active: true,
      phase: steps[0].phase,
    })

    let elapsed = 0

    for (let index = 1; index < steps.length; index += 1) {
      elapsed += steps[index - 1].durationMs
      const phase = steps[index].phase

      timersRef.current.push(
        window.setTimeout(() => {
          setState({
            active: true,
            phase,
          })
        }, elapsed),
      )
    }

    const total = getTotalDuration(steps)
    timersRef.current.push(
      window.setTimeout(() => {
        onCompleteRef.current()
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
