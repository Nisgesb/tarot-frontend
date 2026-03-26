import { Capacitor } from '@capacitor/core'

type RuntimePlatform = 'web' | 'ios' | 'android'

interface DeviceOrientationWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export function getRuntimePlatform(): RuntimePlatform {
  const platform = Capacitor.getPlatform()

  if (platform === 'ios' || platform === 'android') {
    return platform
  }

  return 'web'
}

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function canUseWindow() {
  return typeof window !== 'undefined'
}

export function hasDeviceOrientationSupport() {
  return canUseWindow() && typeof window.DeviceOrientationEvent !== 'undefined'
}

export function deviceOrientationNeedsPermission() {
  if (!hasDeviceOrientationSupport()) {
    return false
  }

  const orientationCtor = window
    .DeviceOrientationEvent as typeof DeviceOrientationEvent &
    DeviceOrientationWithPermission

  return typeof orientationCtor.requestPermission === 'function'
}
