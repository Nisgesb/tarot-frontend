import { useEffect, useState } from 'react'

export interface KeyboardViewportState {
  viewportHeight: number
  keyboardOpen: boolean
  keyboardOffset: number
}

function readViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight
}

export function useKeyboardAwareViewport(enabled: boolean) {
  const [state, setState] = useState<KeyboardViewportState>(() => {
    const viewportHeight = readViewportHeight()

    return {
      viewportHeight,
      keyboardOpen: false,
      keyboardOffset: 0,
    }
  })

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let frameId = 0

    const sync = () => {
      window.cancelAnimationFrame(frameId)

      frameId = window.requestAnimationFrame(() => {
        const viewportHeight = readViewportHeight()
        const keyboardOffset = Math.max(0, window.innerHeight - viewportHeight)

        setState({
          viewportHeight,
          keyboardOpen: keyboardOffset > 110,
          keyboardOffset,
        })
      })
    }

    sync()

    const visualViewport = window.visualViewport
    visualViewport?.addEventListener('resize', sync)
    visualViewport?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)

    return () => {
      visualViewport?.removeEventListener('resize', sync)
      visualViewport?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.cancelAnimationFrame(frameId)
    }
  }, [enabled])

  if (!enabled) {
    return {
      viewportHeight: readViewportHeight(),
      keyboardOpen: false,
      keyboardOffset: 0,
    }
  }

  return state
}
