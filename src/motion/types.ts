export type MotionSource = 'tilt' | 'touch' | 'mouse' | 'idle'
export type MotionRuntimePlatform = 'web' | 'ios' | 'android'
export type NativeMotionListenerState = 'idle' | 'attached' | 'failed'
export type MotionTransport = 'web' | 'native'
export type NativeMotionStatus =
  | 'notDetermined'
  | 'granted'
  | 'denied'
  | 'unsupported'

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

export interface MotionDiagnostics {
  runtimePlatform: MotionRuntimePlatform
  transport: MotionTransport
  hasBrowserOrientationSupport: boolean
  hasBrowserMotionSupport: boolean
  nativeListenerState: NativeMotionListenerState
  nativePermissionState: NativeMotionStatus
  hasTiltSample: boolean
  lastTiltSampleAt: number | null
  lastNativeSampleAt: number | null
}

export interface MotionSnapshot {
  x: number
  y: number
  source: MotionSource
  permissionState: MotionPermissionState
  capabilityState: MotionCapabilityState
  isReducedMotion: boolean
  diagnostics: MotionDiagnostics
}

export interface MotionProfile {
  x: number
  y: number
}

export interface MotionTuning {
  phoneTiltGain: number
  phoneTiltLowPassBoost: number
  nativeCalibrationRange: number
  nativeAbsoluteBlend: number
  tiltMaxDeltaBoost: number
}

export interface MotionSceneTuning {
  nebulaTimeScale: number
  nebulaMotionX: number
  nebulaMotionY: number
  starSpeed: number
  portalMotionX: number
  portalMotionY: number
}
