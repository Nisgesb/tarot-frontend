export type MotionSource = 'tilt' | 'touch' | 'mouse' | 'idle'

export type MotionPermissionState =
  | 'unknown'
  | 'promptable'
  | 'granted'
  | 'denied'
  | 'unsupported'

export type MotionCapabilityState =
  | 'tilt-ready'
  | 'tilt-missing'
  | 'tilt-blocked'

export interface MotionVector {
  x: number
  y: number
  source: MotionSource
}

export interface MotionSnapshot {
  x: number
  y: number
  source: MotionSource
  permissionState: MotionPermissionState
  capabilityState: MotionCapabilityState
  isReducedMotion: boolean
}

export interface MotionProfile {
  x: number
  y: number
}
