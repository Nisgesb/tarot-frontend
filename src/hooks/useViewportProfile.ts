import { useEffect, useState } from 'react'

export type PerformanceTier = 'low' | 'medium' | 'high'

export interface ViewportProfile {
  width: number
  height: number
  isPhone: boolean
  isSmallPhone: boolean
  isTablet: boolean
  isDesktop: boolean
  performanceTier: PerformanceTier
  pointerCoarse: boolean
}

function resolvePerformanceTier(width: number, height: number) {
  const area = width * height

  if (area <= 360 * 780) {
    return 'low'
  }

  if (area <= 430 * 932) {
    return 'medium'
  }

  return 'high'
}

function readProfile(): ViewportProfile {
  const width = window.innerWidth
  const height = window.innerHeight
  const minSide = Math.min(width, height)
  const maxSide = Math.max(width, height)
  const isPhone = minSide <= 480 && maxSide <= 980
  const isSmallPhone = width <= 390 && height <= 844
  const isTablet = minSide > 480 && minSide <= 1024
  const isDesktop = !isPhone && !isTablet
  const pointerCoarse = window.matchMedia('(pointer: coarse)').matches

  return {
    width,
    height,
    isPhone,
    isSmallPhone,
    isTablet,
    isDesktop,
    performanceTier: resolvePerformanceTier(width, height),
    pointerCoarse,
  }
}

export function useViewportProfile() {
  const [profile, setProfile] = useState<ViewportProfile>(() => readProfile())

  useEffect(() => {
    let frameId = 0

    const handleResize = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        setProfile(readProfile())
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return profile
}
