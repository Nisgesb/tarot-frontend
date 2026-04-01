import { useEffect, useState } from 'react'

export type PerformanceTier = 'low' | 'medium' | 'high'
export type ViewportOrientation = 'portrait' | 'landscape'
export type DeviceClass =
  | 'phone-sm'
  | 'phone'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'desktop'
  | 'desktop-wide'

export interface ViewportProfile {
  width: number
  height: number
  orientation: ViewportOrientation
  deviceClass: DeviceClass
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

function resolveOrientation(width: number, height: number): ViewportOrientation {
  return width >= height ? 'landscape' : 'portrait'
}

function resolveDeviceClass(
  width: number,
  height: number,
  pointerCoarse: boolean,
): DeviceClass {
  const orientation = resolveOrientation(width, height)
  const minSide = Math.min(width, height)
  const maxSide = Math.max(width, height)

  if (pointerCoarse) {
    const phoneLike = minSide <= 430 && maxSide <= 932

    if (phoneLike) {
      return minSide <= 390 ? 'phone-sm' : 'phone'
    }

    return orientation === 'portrait' ? 'tablet-portrait' : 'tablet-landscape'
  }

  if (width >= 1680) {
    return 'desktop-wide'
  }

  return 'desktop'
}

function readProfile(): ViewportProfile {
  const width = window.innerWidth
  const height = window.innerHeight
  const pointerCoarse = window.matchMedia('(pointer: coarse)').matches
  const orientation = resolveOrientation(width, height)
  const deviceClass = resolveDeviceClass(width, height, pointerCoarse)
  const isPhone = deviceClass === 'phone-sm' || deviceClass === 'phone'
  const isSmallPhone = deviceClass === 'phone-sm'
  const isTablet =
    deviceClass === 'tablet-portrait' || deviceClass === 'tablet-landscape'
  const isDesktop = deviceClass === 'desktop' || deviceClass === 'desktop-wide'

  return {
    width,
    height,
    orientation,
    deviceClass,
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
