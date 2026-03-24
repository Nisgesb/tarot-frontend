import { useMemo } from 'react'

export interface SafeAreaInsetsStyle {
  '--safe-top': string
  '--safe-right': string
  '--safe-bottom': string
  '--safe-left': string
}

export function useSafeAreaInsets() {
  return useMemo<SafeAreaInsetsStyle>(() => {
    return {
      '--safe-top': 'env(safe-area-inset-top, 0px)',
      '--safe-right': 'env(safe-area-inset-right, 0px)',
      '--safe-bottom': 'env(safe-area-inset-bottom, 0px)',
      '--safe-left': 'env(safe-area-inset-left, 0px)',
    }
  }, [])
}
