import { Geolocation } from '@capacitor/geolocation'
import { getNativeMotionStatus, openNativeMotionSettings, startNativeMotion } from './nativeMotionBridge'
import {
  canUseWindow,
  deviceMotionNeedsPermission,
  deviceOrientationNeedsPermission,
  getRuntimePlatform,
  hasDeviceMotionSupport,
  hasDeviceOrientationSupport,
  isNativeApp,
} from './runtime'

export type AppPermissionId = 'camera' | 'microphone' | 'motion' | 'location'
export type AppPermissionState = 'unknown' | 'promptable' | 'granted' | 'denied' | 'unsupported'

export interface AppPermissionSnapshot {
  id: AppPermissionId
  state: AppPermissionState
  updatedAt: number
}

interface AppPermissionMeta {
  id: AppPermissionId
  title: string
  purpose: string
  platformNotes: {
    web: string
    ios: string
    android: string
  }
}

interface MotionPermissionRequestResult {
  granted: boolean
  state: AppPermissionState
}

export const MOTION_PERMISSION_STORAGE_KEY = 'motion-last-permission'
export const LOCATION_PERMISSION_STORAGE_KEY = 'location-last-permission'
export const CAMERA_PERMISSION_STORAGE_KEY = 'camera-last-permission'
export const MICROPHONE_PERMISSION_STORAGE_KEY = 'microphone-last-permission'

const PERMISSION_META_MAP: Record<AppPermissionId, AppPermissionMeta> = {
  camera: {
    id: 'camera',
    title: '相机权限',
    purpose: '用于真人连线占卜时采集视频画面。',
    platformNotes: {
      web: '通过浏览器 getUserMedia 授权。',
      ios: '通过系统相机权限弹窗授权。',
      android: '通过系统相机权限弹窗授权。',
    },
  },
  microphone: {
    id: 'microphone',
    title: '麦克风权限',
    purpose: '用于真人连线占卜时采集语音。',
    platformNotes: {
      web: '通过浏览器 getUserMedia 授权。',
      ios: '通过系统麦克风权限弹窗授权。',
      android: '通过系统录音权限弹窗授权。',
    },
  },
  motion: {
    id: 'motion',
    title: '动态感应权限',
    purpose: '用于首页动态视差和倾斜动效。',
    platformNotes: {
      web: 'iOS Safari 等环境需手势触发授权。',
      ios: '通过 NativeMotion 插件桥接系统能力。',
      android: '通常无需危险权限弹窗，按设备能力检测。',
    },
  },
  location: {
    id: 'location',
    title: '定位权限',
    purpose: '用于首页实时天气驱动小猫视频切换。',
    platformNotes: {
      web: '通过浏览器 Geolocation 授权。',
      ios: '通过系统定位权限弹窗授权。',
      android: '通过系统定位权限弹窗授权（粗略/精确）。',
    },
  },
}

function readStorage(key: string) {
  if (!canUseWindow()) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  if (!canUseWindow()) {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore localStorage errors
  }
}

function mapWebPermissionState(state: PermissionState | 'prompt-with-rationale' | 'prompt'): AppPermissionState {
  if (state === 'granted') {
    return 'granted'
  }

  if (state === 'denied') {
    return 'denied'
  }

  return 'promptable'
}

function mapNativeMotionStatusToPermissionState(status: string): AppPermissionState {
  if (status === 'granted') {
    return 'granted'
  }

  if (status === 'denied') {
    return 'denied'
  }

  if (status === 'unsupported') {
    return 'unsupported'
  }

  return 'promptable'
}

function resolveStorageKey(permission: AppPermissionId) {
  if (permission === 'motion') {
    return MOTION_PERMISSION_STORAGE_KEY
  }

  if (permission === 'location') {
    return LOCATION_PERMISSION_STORAGE_KEY
  }

  if (permission === 'camera') {
    return CAMERA_PERMISSION_STORAGE_KEY
  }

  return MICROPHONE_PERMISSION_STORAGE_KEY
}

function createSnapshot(id: AppPermissionId, state: AppPermissionState): AppPermissionSnapshot {
  return {
    id,
    state,
    updatedAt: Date.now(),
  }
}

async function queryBrowserPermission(name: PermissionName): Promise<AppPermissionState | null> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return null
  }

  try {
    const result = await navigator.permissions.query({ name })
    return mapWebPermissionState(result.state)
  } catch {
    return null
  }
}

function inferMotionStateFromStorage(): AppPermissionState {
  const value = readStorage(MOTION_PERMISSION_STORAGE_KEY)

  if (value === 'granted') {
    return 'granted'
  }

  if (value === 'denied') {
    return 'denied'
  }

  if (value === 'unsupported') {
    return 'unsupported'
  }

  return 'promptable'
}

function inferLocationStateFromStorage(): AppPermissionState {
  const value = readStorage(LOCATION_PERMISSION_STORAGE_KEY)

  if (value === 'granted') {
    return 'granted'
  }

  if (value === 'denied') {
    return 'denied'
  }

  return 'promptable'
}

function getCurrentPosition(options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

async function getMediaStream(constraints: MediaStreamConstraints) {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)
    return stream
  } catch {
    return null
  }
}

async function checkMotionPermission() {
  const runtime = getRuntimePlatform()

  if (runtime === 'ios' && isNativeApp()) {
    try {
      const status = await getNativeMotionStatus()
      const state = mapNativeMotionStatusToPermissionState(status)
      writeStorage(MOTION_PERMISSION_STORAGE_KEY, state)
      return createSnapshot('motion', state)
    } catch {
      return createSnapshot('motion', 'unsupported')
    }
  }

  const hasSupport = hasDeviceOrientationSupport() || hasDeviceMotionSupport()

  if (!hasSupport) {
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'unsupported')
    return createSnapshot('motion', 'unsupported')
  }

  if (!deviceOrientationNeedsPermission() && !deviceMotionNeedsPermission()) {
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'granted')
    return createSnapshot('motion', 'granted')
  }

  const state = inferMotionStateFromStorage()
  return createSnapshot('motion', state)
}

async function requestMotionPermission(): Promise<MotionPermissionRequestResult> {
  const runtime = getRuntimePlatform()

  if (runtime === 'ios' && isNativeApp()) {
    try {
      const result = await startNativeMotion()
      const state = mapNativeMotionStatusToPermissionState(result.status)
      writeStorage(MOTION_PERMISSION_STORAGE_KEY, state)
      return {
        granted: state === 'granted',
        state,
      }
    } catch {
      writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'denied')
      return {
        granted: false,
        state: 'denied',
      }
    }
  }

  const hasSupport = hasDeviceOrientationSupport() || hasDeviceMotionSupport()

  if (!hasSupport) {
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'unsupported')
    return {
      granted: false,
      state: 'unsupported',
    }
  }

  if (!deviceOrientationNeedsPermission() && !deviceMotionNeedsPermission()) {
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'granted')
    return {
      granted: true,
      state: 'granted',
    }
  }

  try {
    const permissionRequests: Array<Promise<'granted' | 'denied' | undefined>> = []

    if (typeof window.DeviceMotionEvent !== 'undefined') {
      const motionCtor = window.DeviceMotionEvent as typeof DeviceMotionEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }

      if (typeof motionCtor.requestPermission === 'function') {
        permissionRequests.push(motionCtor.requestPermission())
      }
    }

    if (typeof window.DeviceOrientationEvent !== 'undefined') {
      const orientationCtor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }

      if (typeof orientationCtor.requestPermission === 'function') {
        permissionRequests.push(orientationCtor.requestPermission())
      }
    }

    const results = await Promise.allSettled(permissionRequests)
    const granted = results.length === 0 || results.every(
      (result) => result.status === 'fulfilled' && result.value === 'granted',
    )

    const state: AppPermissionState = granted ? 'granted' : 'denied'
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, state)

    return {
      granted,
      state,
    }
  } catch {
    writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'denied')
    return {
      granted: false,
      state: 'denied',
    }
  }
}

async function checkLocationPermission() {
  if (isNativeApp()) {
    try {
      const result = await Geolocation.checkPermissions()
      const locationState = (result as { location?: PermissionState | 'prompt' | 'prompt-with-rationale' }).location
      const fallbackState = (result as { coarseLocation?: PermissionState | 'prompt' | 'prompt-with-rationale' }).coarseLocation
      const state = mapWebPermissionState(locationState ?? fallbackState ?? 'prompt')
      writeStorage(LOCATION_PERMISSION_STORAGE_KEY, state)
      return createSnapshot('location', state)
    } catch {
      return createSnapshot('location', inferLocationStateFromStorage())
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return createSnapshot('location', 'unsupported')
  }

  const queried = await queryBrowserPermission('geolocation')

  if (queried) {
    writeStorage(LOCATION_PERMISSION_STORAGE_KEY, queried)
    return createSnapshot('location', queried)
  }

  return createSnapshot('location', inferLocationStateFromStorage())
}

async function requestLocationPermission() {
  if (isNativeApp()) {
    try {
      const result = await Geolocation.requestPermissions()
      const locationState = (result as { location?: PermissionState | 'prompt' | 'prompt-with-rationale' }).location
      const fallbackState = (result as { coarseLocation?: PermissionState | 'prompt' | 'prompt-with-rationale' }).coarseLocation
      const state = mapWebPermissionState(locationState ?? fallbackState ?? 'prompt')
      writeStorage(LOCATION_PERMISSION_STORAGE_KEY, state)
      return createSnapshot('location', state)
    } catch {
      writeStorage(LOCATION_PERMISSION_STORAGE_KEY, 'denied')
      return createSnapshot('location', 'denied')
    }
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return createSnapshot('location', 'unsupported')
  }

  try {
    await getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 7000,
      maximumAge: 0,
    })

    writeStorage(LOCATION_PERMISSION_STORAGE_KEY, 'granted')
    return createSnapshot('location', 'granted')
  } catch {
    writeStorage(LOCATION_PERMISSION_STORAGE_KEY, 'denied')
    return createSnapshot('location', 'denied')
  }
}

async function checkCameraPermission() {
  const queried = await queryBrowserPermission('camera')

  if (queried) {
    writeStorage(CAMERA_PERMISSION_STORAGE_KEY, queried)
    return createSnapshot('camera', queried)
  }

  const cached = readStorage(CAMERA_PERMISSION_STORAGE_KEY)

  if (cached === 'granted' || cached === 'denied') {
    return createSnapshot('camera', cached)
  }

  return createSnapshot('camera', 'promptable')
}

async function requestCameraPermission() {
  const stream = await getMediaStream({ video: true, audio: false })

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    writeStorage(CAMERA_PERMISSION_STORAGE_KEY, 'granted')
    return createSnapshot('camera', 'granted')
  }

  writeStorage(CAMERA_PERMISSION_STORAGE_KEY, 'denied')
  return createSnapshot('camera', 'denied')
}

async function checkMicrophonePermission() {
  const queried = await queryBrowserPermission('microphone')

  if (queried) {
    writeStorage(MICROPHONE_PERMISSION_STORAGE_KEY, queried)
    return createSnapshot('microphone', queried)
  }

  const cached = readStorage(MICROPHONE_PERMISSION_STORAGE_KEY)

  if (cached === 'granted' || cached === 'denied') {
    return createSnapshot('microphone', cached)
  }

  return createSnapshot('microphone', 'promptable')
}

async function requestMicrophonePermission() {
  const stream = await getMediaStream({ video: false, audio: true })

  if (stream) {
    stream.getTracks().forEach((track) => track.stop())
    writeStorage(MICROPHONE_PERMISSION_STORAGE_KEY, 'granted')
    return createSnapshot('microphone', 'granted')
  }

  writeStorage(MICROPHONE_PERMISSION_STORAGE_KEY, 'denied')
  return createSnapshot('microphone', 'denied')
}

export function listAppPermissionsMeta() {
  return Object.values(PERMISSION_META_MAP)
}

export async function checkAppPermission(permission: AppPermissionId): Promise<AppPermissionSnapshot> {
  if (permission === 'motion') {
    return checkMotionPermission()
  }

  if (permission === 'location') {
    return checkLocationPermission()
  }

  if (permission === 'camera') {
    return checkCameraPermission()
  }

  return checkMicrophonePermission()
}

export async function requestAppPermission(permission: AppPermissionId): Promise<AppPermissionSnapshot> {
  if (permission === 'motion') {
    const result = await requestMotionPermission()
    return createSnapshot('motion', result.state)
  }

  if (permission === 'location') {
    return requestLocationPermission()
  }

  if (permission === 'camera') {
    return requestCameraPermission()
  }

  return requestMicrophonePermission()
}

export async function checkAppPermissions(permissions: AppPermissionId[]) {
  const result = await Promise.all(permissions.map(async (permission) => {
    const snapshot = await checkAppPermission(permission)
    return [permission, snapshot] as const
  }))

  return Object.fromEntries(result) as Record<AppPermissionId, AppPermissionSnapshot>
}

export async function requestAppPermissions(permissions: AppPermissionId[]) {
  const result = await Promise.all(permissions.map(async (permission) => {
    const snapshot = await requestAppPermission(permission)
    return [permission, snapshot] as const
  }))

  return Object.fromEntries(result) as Record<AppPermissionId, AppPermissionSnapshot>
}

export async function openAppPermissionSettings(permission?: AppPermissionId) {
  if (permission === 'motion') {
    try {
      await openNativeMotionSettings()
      return true
    } catch {
      return false
    }
  }

  if (isNativeApp() && getRuntimePlatform() === 'ios') {
    try {
      await openNativeMotionSettings()
      return true
    } catch {
      return false
    }
  }

  if (canUseWindow()) {
    try {
      window.open('about:blank', '_self')
    } catch {
      // noop
    }
  }

  return false
}

export function readCachedPermissionState(permission: AppPermissionId): AppPermissionState | null {
  const key = resolveStorageKey(permission)
  const raw = readStorage(key)

  if (raw === 'granted' || raw === 'denied' || raw === 'promptable' || raw === 'unsupported') {
    return raw
  }

  if (raw === 'skipped') {
    return 'promptable'
  }

  return null
}
