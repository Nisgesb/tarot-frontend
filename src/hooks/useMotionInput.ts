import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type {
  MotionCapabilityState,
  MotionDiagnostics,
  MotionPermissionState,
  MotionRuntimePlatform,
  MotionSnapshot,
  MotionSource,
  MotionTuning,
  MotionVector,
  NativeMotionStatus,
} from '../motion/types'
import {
  addNativeMotionListener,
  getNativeMotionStatus,
  openNativeMotionSettings,
  recenterNativeMotion,
  startNativeMotion,
  stopNativeMotion,
} from '../platform/nativeMotionBridge'
import {
  MOTION_PERMISSION_STORAGE_KEY,
  requestAppPermission,
} from '../platform/permissionCenter'
import {
  deviceMotionNeedsPermission,
  deviceOrientationNeedsPermission,
  getRuntimePlatform,
  hasDeviceMotionSupport,
  hasDeviceOrientationSupport,
  isNativeApp,
} from '../platform/runtime'

const MOTION_CALIBRATION_KEY = 'motion-calibration'

const DEAD_ZONE = 0.035
const LOW_PASS = 0.11
const CLAMP_RANGE = 0.78
const MAX_DELTA_PER_FRAME = 0.025
const NATIVE_GRAVITY = 9.81
const DIAGNOSTIC_SAMPLE_THROTTLE_MS = 800

type CalibrationMode = 'orientation' | 'acceleration'

export const DEFAULT_MOTION_TUNING: MotionTuning = {
  phoneTiltGain: 2.8,
  phoneTiltLowPassBoost: 1.8,
  nativeCalibrationRange: 2.49,
  nativeAbsoluteBlend: 1.95,
  tiltMaxDeltaBoost: 8,
}

interface OrientationCalibration {
  beta: number
  gamma: number
  mode: CalibrationMode
}

interface UseMotionInputOptions {
  enabled: boolean
  reducedMotion: boolean
  pointerCoarse: boolean
  isDesktop: boolean
  isPhone: boolean
  tuning?: MotionTuning
}

interface UseMotionInputResult {
  motionRef: MutableRefObject<MotionVector>
  snapshot: MotionSnapshot
  requestTiltPermission: () => Promise<boolean>
  openTiltSettings: () => Promise<void>
  recenter: () => Promise<void>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 忽略本地存储异常
  }
}

function readCalibration(): OrientationCalibration | null {
  const raw = readStorage(MOTION_CALIBRATION_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OrientationCalibration>

    if (
      typeof parsed.beta === 'number' &&
      typeof parsed.gamma === 'number' &&
      (parsed.mode === 'orientation' || parsed.mode === 'acceleration')
    ) {
      return {
        beta: parsed.beta,
        gamma: parsed.gamma,
        mode: parsed.mode,
      }
    }

    return null
  } catch {
    return null
  }
}

function writeCalibration(calibration: OrientationCalibration) {
  writeStorage(MOTION_CALIBRATION_KEY, JSON.stringify(calibration))
}

function getMotionTransport(runtimePlatform: MotionRuntimePlatform) {
  return runtimePlatform === 'ios' && isNativeApp() ? 'native' : 'web'
}

function createDiagnostics(runtimePlatform: MotionRuntimePlatform): MotionDiagnostics {
  return {
    runtimePlatform,
    transport: getMotionTransport(runtimePlatform),
    hasBrowserOrientationSupport: hasDeviceOrientationSupport(),
    hasBrowserMotionSupport: hasDeviceMotionSupport(),
    nativeListenerState: 'idle',
    nativePermissionState: runtimePlatform === 'ios' && isNativeApp() ? 'notDetermined' : 'unsupported',
    hasTiltSample: false,
    lastTiltSampleAt: null,
    lastNativeSampleAt: null,
  }
}

function getWebTiltSupport(runtimePlatform: MotionRuntimePlatform) {
  return (
    hasDeviceOrientationSupport() ||
    hasDeviceMotionSupport() ||
    (runtimePlatform === 'ios' && isNativeApp())
  )
}

function getNeedsWebPermission() {
  return deviceOrientationNeedsPermission() || deviceMotionNeedsPermission()
}

function mapNativeStatusToPermission(status: NativeMotionStatus): MotionPermissionState {
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

function deriveWebPermissionState(runtimePlatform: MotionRuntimePlatform): MotionPermissionState {
  const hasTiltSupport = getWebTiltSupport(runtimePlatform)

  if (!hasTiltSupport) {
    return 'unsupported'
  }

  const storedPermission = readStorage(MOTION_PERMISSION_STORAGE_KEY)

  if (storedPermission === 'granted') {
    return 'granted'
  }

  if (storedPermission === 'denied') {
    return 'denied'
  }

  if (!getNeedsWebPermission()) {
    return 'granted'
  }

  return 'promptable'
}

function deriveCapabilityState(permissionState: MotionPermissionState): MotionCapabilityState {
  if (permissionState === 'unsupported') {
    return 'tilt-missing'
  }

  if (permissionState === 'denied') {
    return 'tilt-blocked'
  }

  return 'tilt-ready'
}

export function useMotionInput({
  enabled,
  reducedMotion,
  pointerCoarse,
  isDesktop,
  isPhone,
  tuning = DEFAULT_MOTION_TUNING,
}: UseMotionInputOptions): UseMotionInputResult {
  const runtimePlatform = getRuntimePlatform()
  const nativeApp = isNativeApp()
  const nativeTransport = runtimePlatform === 'ios' && nativeApp
  const [permissionState, setPermissionState] = useState<MotionPermissionState>(() => {
    if (nativeTransport) {
      return 'unknown'
    }

    return deriveWebPermissionState(runtimePlatform)
  })
  const [activeSource, setActiveSource] = useState<MotionSource>('idle')
  const [vectorState, setVectorState] = useState({ x: 0, y: 0 })
  const [diagnostics, setDiagnostics] = useState<MotionDiagnostics>(() =>
    createDiagnostics(runtimePlatform),
  )

  const permissionStateRef = useRef(permissionState)
  const motionRef = useRef<MotionVector>({ x: 0, y: 0, source: 'idle' })
  const targetTiltRef = useRef({ x: 0, y: 0, beta: 0, gamma: 0 })
  const targetTouchRef = useRef({ x: 0, y: 0 })
  const targetMouseRef = useRef({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })
  const touchActiveRef = useRef(false)
  const calibrationRef = useRef<OrientationCalibration | null>(readCalibration())
  const tuningRef = useRef<MotionTuning>(tuning)
  const sourceRef = useRef<MotionSource>('idle')
  const tiltModeRef = useRef<CalibrationMode>('orientation')
  const lastTiltAtRef = useRef(0)
  const lastNativeTiltAtRef = useRef(0)
  const lastTouchAtRef = useRef(0)
  const lastMouseAtRef = useRef(0)

  const updateDiagnostics = useCallback((patch: Partial<MotionDiagnostics>) => {
    setDiagnostics((current) => {
      const next = {
        ...current,
        ...patch,
      }

      if (
        current.runtimePlatform === next.runtimePlatform &&
        current.transport === next.transport &&
        current.hasBrowserOrientationSupport === next.hasBrowserOrientationSupport &&
        current.hasBrowserMotionSupport === next.hasBrowserMotionSupport &&
        current.nativeListenerState === next.nativeListenerState &&
        current.nativePermissionState === next.nativePermissionState &&
        current.hasTiltSample === next.hasTiltSample &&
        current.lastTiltSampleAt === next.lastTiltSampleAt &&
        current.lastNativeSampleAt === next.lastNativeSampleAt
      ) {
        return current
      }

      return next
    })
  }, [])

  const markTiltSample = useCallback(
    (sampleSource: 'web' | 'native') => {
      const sampleAt = Date.now()

      setDiagnostics((current) => {
        const shouldRefreshTiltTimestamp =
          !current.hasTiltSample ||
          current.lastTiltSampleAt == null ||
          sampleAt - current.lastTiltSampleAt >= DIAGNOSTIC_SAMPLE_THROTTLE_MS
        const shouldRefreshNativeTimestamp =
          sampleSource === 'native' &&
          (current.lastNativeSampleAt == null ||
            sampleAt - current.lastNativeSampleAt >= DIAGNOSTIC_SAMPLE_THROTTLE_MS)

        if (!shouldRefreshTiltTimestamp && !shouldRefreshNativeTimestamp && current.hasTiltSample) {
          return current
        }

        return {
          ...current,
          hasTiltSample: true,
          lastTiltSampleAt: shouldRefreshTiltTimestamp ? sampleAt : current.lastTiltSampleAt,
          lastNativeSampleAt:
            sampleSource === 'native'
              ? shouldRefreshNativeTimestamp
                ? sampleAt
                : current.lastNativeSampleAt
              : current.lastNativeSampleAt,
        }
      })

      if (nativeTransport) {
        if (permissionStateRef.current !== 'granted') {
          permissionStateRef.current = 'granted'
          setPermissionState('granted')
        }

        writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'granted')
        updateDiagnostics({ nativePermissionState: 'granted' })
        return
      }

      if (!getNeedsWebPermission() && permissionStateRef.current !== 'granted') {
        writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'granted')
        setPermissionState('granted')
      }
    },
    [nativeTransport, updateDiagnostics],
  )

  useEffect(() => {
    permissionStateRef.current = permissionState
  }, [permissionState])

  useEffect(() => {
    tuningRef.current = tuning
  }, [tuning])

  const capabilityState = useMemo(
    () => deriveCapabilityState(permissionState),
    [permissionState],
  )

  const syncNativeStatus = useCallback(async () => {
    if (!nativeTransport) {
      return 'unsupported' as NativeMotionStatus
    }

    try {
      const status = await getNativeMotionStatus()
      updateDiagnostics({
        transport: 'native',
        nativePermissionState: status,
      })
      setPermissionState(mapNativeStatusToPermission(status))
      if (status !== 'notDetermined') {
        writeStorage(MOTION_PERMISSION_STORAGE_KEY, status)
      }
      return status
    } catch {
      updateDiagnostics({
        transport: 'native',
        nativePermissionState: 'unsupported',
        nativeListenerState: 'failed',
      })
      setPermissionState('unsupported')
      writeStorage(MOTION_PERMISSION_STORAGE_KEY, 'unsupported')
      return 'unsupported' as NativeMotionStatus
    }
  }, [nativeTransport, updateDiagnostics])

  const requestTiltPermission = useCallback(async () => {
    if (reducedMotion || !enabled) {
      return false
    }

    const snapshot = await requestAppPermission('motion')

    if (snapshot.state === 'granted') {
      setPermissionState('granted')
      updateDiagnostics({ nativePermissionState: nativeTransport ? 'granted' : diagnostics.nativePermissionState })
      return true
    }

    if (snapshot.state === 'unsupported') {
      setPermissionState('unsupported')
      updateDiagnostics({ nativePermissionState: nativeTransport ? 'unsupported' : diagnostics.nativePermissionState })
      return false
    }

    setPermissionState('denied')
    updateDiagnostics({ nativePermissionState: nativeTransport ? 'denied' : diagnostics.nativePermissionState })
    return false
  }, [diagnostics.nativePermissionState, enabled, nativeTransport, reducedMotion, updateDiagnostics])

  const openTiltSettings = useCallback(async () => {
    if (!nativeTransport) {
      return
    }

    try {
      await openNativeMotionSettings()
    } catch {
      // 忽略打开设置失败
    }
  }, [nativeTransport])

  const recenter = useCallback(async () => {
    const calibration = {
      beta: targetTiltRef.current.beta,
      gamma: targetTiltRef.current.gamma,
      mode: tiltModeRef.current,
    }

    calibrationRef.current = calibration
    writeCalibration(calibration)

    if (!nativeTransport) {
      return
    }

    try {
      await recenterNativeMotion()
    } catch {
      // 忽略原生校准失败
    }
  }, [nativeTransport])

  useEffect(() => {
    if (!nativeTransport) {
      return undefined
    }

    let cancelled = false

    const refreshStatus = async () => {
      const status = await syncNativeStatus()
      const previouslyGranted = readStorage(MOTION_PERMISSION_STORAGE_KEY) === 'granted'

      if (cancelled) {
        return
      }

      if ((status === 'granted' || (status === 'notDetermined' && previouslyGranted)) && enabled && !reducedMotion) {
        try {
          const result = await startNativeMotion()

          if (cancelled) {
            return
          }

          updateDiagnostics({ nativePermissionState: result.status, transport: 'native' })
          setPermissionState(mapNativeStatusToPermission(result.status))
        } catch {
          if (!cancelled) {
            setPermissionState('denied')
            updateDiagnostics({ nativePermissionState: 'denied', nativeListenerState: 'failed' })
          }
        }
      }
    }

    void refreshStatus()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshStatus()
      }
    }

    window.addEventListener('focus', handleVisibilityChange)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleVisibilityChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, nativeTransport, reducedMotion, syncNativeStatus, updateDiagnostics])

  useEffect(() => {
    if (!enabled || reducedMotion) {
      motionRef.current = { x: 0, y: 0, source: 'idle' }
      smoothRef.current = { x: 0, y: 0 }

      if (nativeTransport) {
        void stopNativeMotion().catch(() => undefined)
      }

      return undefined
    }

    const orientationSupport = hasDeviceOrientationSupport()
    const motionSupport = hasDeviceMotionSupport()
    const shouldListenOrientation = !nativeTransport && orientationSupport
    const shouldListenMotion = !nativeTransport && motionSupport

    const canUseTiltInput = () => {
      if (permissionStateRef.current === 'denied') {
        return false
      }

      if (permissionStateRef.current === 'granted') {
        return true
      }

      if (!nativeTransport && getNeedsWebPermission()) {
        return false
      }

      return !nativeTransport
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') {
        return
      }

      const now = performance.now()
      markTiltSample('web')

      if (!canUseTiltInput()) {
        return
      }

      if (now - lastNativeTiltAtRef.current < 360) {
        return
      }

      targetTiltRef.current.beta = event.beta
      targetTiltRef.current.gamma = event.gamma
      tiltModeRef.current = 'orientation'

      const calibration = calibrationRef.current
      if (!calibration || calibration.mode !== 'orientation') {
        const nextCalibration = {
          beta: event.beta,
          gamma: event.gamma,
          mode: 'orientation' as const,
        }

        calibrationRef.current = nextCalibration
        writeCalibration(nextCalibration)
      }

      const base = calibrationRef.current ?? {
        beta: event.beta,
        gamma: event.gamma,
        mode: 'orientation' as const,
      }
      const tiltGain = isPhone && pointerCoarse ? tuningRef.current.phoneTiltGain : 1
      const normalizedX = clamp((event.gamma - base.gamma) / 22, -1, 1)
      const normalizedY = clamp((event.beta - base.beta) / 26, -1, 1)

      targetTiltRef.current.x = clamp(normalizedX * tiltGain, -1, 1)
      targetTiltRef.current.y = clamp(normalizedY * tiltGain, -1, 1)
      lastTiltAtRef.current = now
    }

    const applyNativeAcceleration = (
      acceleration: { x: number | null; y: number | null } | null | undefined,
      sampleSource: 'web' | 'native',
    ) => {
      if (!acceleration || acceleration.x == null || acceleration.y == null) {
        return
      }

      markTiltSample(sampleSource)

      if (!canUseTiltInput()) {
        return
      }

      const normalizedGamma = clamp(acceleration.x / NATIVE_GRAVITY, -1, 1)
      const normalizedBeta = clamp((-acceleration.y) / NATIVE_GRAVITY, -1, 1)

      targetTiltRef.current.beta = normalizedBeta
      targetTiltRef.current.gamma = normalizedGamma
      tiltModeRef.current = 'acceleration'
      lastNativeTiltAtRef.current = performance.now()

      const calibration = calibrationRef.current
      if (!calibration || calibration.mode !== 'acceleration') {
        const nextCalibration = {
          beta: normalizedBeta,
          gamma: normalizedGamma,
          mode: 'acceleration' as const,
        }

        calibrationRef.current = nextCalibration
        writeCalibration(nextCalibration)
      }

      const base = calibrationRef.current ?? {
        beta: normalizedBeta,
        gamma: normalizedGamma,
        mode: 'acceleration' as const,
      }
      const tiltGain = isPhone && pointerCoarse ? tuningRef.current.phoneTiltGain : 1
      const normalizedX = clamp(
        (normalizedGamma - base.gamma) / tuningRef.current.nativeCalibrationRange,
        -1,
        1,
      )
      const normalizedY = clamp(
        (normalizedBeta - base.beta) / tuningRef.current.nativeCalibrationRange,
        -1,
        1,
      )

      const blendedX = normalizedX + normalizedGamma * tuningRef.current.nativeAbsoluteBlend
      const blendedY = normalizedY + normalizedBeta * tuningRef.current.nativeAbsoluteBlend

      targetTiltRef.current.x = clamp(blendedX * tiltGain, -1, 1)
      targetTiltRef.current.y = clamp(blendedY * tiltGain, -1, 1)
      lastTiltAtRef.current = performance.now()
    }

    const onNativeSample = (event: {
      accelerationIncludingGravity?: { x: number | null; y: number | null }
    }) => {
      applyNativeAcceleration(event.accelerationIncludingGravity, 'native')
    }

    const onDeviceMotion = (event: DeviceMotionEvent) => {
      applyNativeAcceleration(event.accelerationIncludingGravity ?? event.acceleration, 'web')
    }

    const onPointerMove = (event: PointerEvent) => {
      const width = Math.max(window.innerWidth, 1)
      const height = Math.max(window.innerHeight, 1)

      if (event.pointerType === 'touch') {
        const x = clamp((event.clientX / width - 0.5) * 2, -1, 1)
        const y = clamp((event.clientY / height - 0.5) * 2, -1, 1)

        targetTouchRef.current.x = x
        targetTouchRef.current.y = y
        lastTouchAtRef.current = performance.now()
        return
      }

      if (event.pointerType === 'mouse') {
        const x = clamp((event.clientX / width - 0.5) * 2, -1, 1)
        const y = clamp((event.clientY / height - 0.5) * 2, -1, 1)

        targetMouseRef.current.x = x
        targetMouseRef.current.y = y
        lastMouseAtRef.current = performance.now()
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        touchActiveRef.current = true
        lastTouchAtRef.current = performance.now()
      }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') {
        touchActiveRef.current = false
      }
    }

    let cancelled = false
    let frameId = 0
    let loopActive = false
    let nativeHandle: { remove: () => Promise<void> } | null = null

    const tick = (time: number) => {
      if (!loopActive) {
        return
      }

      const now = time
      const idleX = Math.sin(now * 0.00033) * 0.2
      const idleY = Math.cos(now * 0.00027 + 1.4) * 0.15

      if (!touchActiveRef.current) {
        targetTouchRef.current.x *= 0.93
        targetTouchRef.current.y *= 0.93
      }

      let source: MotionSource = 'idle'
      let targetX = idleX
      let targetY = idleY

      const tiltFresh = now - lastTiltAtRef.current < 650
      const touchFresh = now - lastTouchAtRef.current < 1600
      const mouseFresh = now - lastMouseAtRef.current < 1200

      if (permissionStateRef.current === 'granted' && tiltFresh) {
        source = 'tilt'
        targetX = targetTiltRef.current.x * 0.82 + idleX * 0.18
        targetY = targetTiltRef.current.y * 0.82 + idleY * 0.18
      } else if (touchFresh) {
        source = 'touch'
        targetX = targetTouchRef.current.x * 0.74 + idleX * 0.26
        targetY = targetTouchRef.current.y * 0.74 + idleY * 0.26
      } else if (!pointerCoarse && isDesktop && mouseFresh) {
        source = 'mouse'
        targetX = targetMouseRef.current.x * 0.66 + idleX * 0.34
        targetY = targetMouseRef.current.y * 0.66 + idleY * 0.34
      }

      const filteredTargetX = Math.abs(targetX) < DEAD_ZONE ? targetX * 0.25 : targetX
      const filteredTargetY = Math.abs(targetY) < DEAD_ZONE ? targetY * 0.25 : targetY

      const clampedX = clamp(filteredTargetX, -CLAMP_RANGE, CLAMP_RANGE)
      const clampedY = clamp(filteredTargetY, -CLAMP_RANGE, CLAMP_RANGE)
      const smoothing =
        source === 'tilt' && isPhone && pointerCoarse
          ? LOW_PASS * tuningRef.current.phoneTiltLowPassBoost
          : LOW_PASS

      const nextX = smoothRef.current.x + (clampedX - smoothRef.current.x) * smoothing
      const nextY = smoothRef.current.y + (clampedY - smoothRef.current.y) * smoothing

      const maxDelta =
        source === 'tilt' && isPhone && pointerCoarse
          ? MAX_DELTA_PER_FRAME * tuningRef.current.tiltMaxDeltaBoost
          : MAX_DELTA_PER_FRAME
      const dx = clamp(nextX - smoothRef.current.x, -maxDelta, maxDelta)
      const dy = clamp(nextY - smoothRef.current.y, -maxDelta, maxDelta)

      smoothRef.current.x += dx
      smoothRef.current.y += dy

      motionRef.current = {
        x: smoothRef.current.x,
        y: smoothRef.current.y,
        source,
      }

      if (source !== sourceRef.current) {
        sourceRef.current = source
        setActiveSource(source)
      }

      setVectorState({
        x: smoothRef.current.x,
        y: smoothRef.current.y,
      })

      frameId = window.requestAnimationFrame(tick)
    }

    const stopLoop = () => {
      if (!loopActive) {
        return
      }

      loopActive = false
      if (frameId) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }

    const startLoop = () => {
      if (loopActive || document.hidden) {
        return
      }

      loopActive = true
      frameId = window.requestAnimationFrame(tick)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop()
        return
      }

      startLoop()
    }

    if (shouldListenOrientation) {
      window.addEventListener('deviceorientation', onOrientation)
    }

    if (shouldListenMotion) {
      window.addEventListener('devicemotion', onDeviceMotion)
    }

    if (nativeTransport) {
      void addNativeMotionListener(onNativeSample)
        .then((handle) => {
          if (cancelled) {
            void handle.remove()
            return
          }

          nativeHandle = handle
          updateDiagnostics({ nativeListenerState: 'attached', transport: 'native' })
        })
        .catch(() => {
          updateDiagnostics({
            nativeListenerState: 'failed',
            nativePermissionState: 'unsupported',
            transport: 'native',
          })
          setPermissionState('unsupported')
        })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })
    document.addEventListener('visibilitychange', handleVisibilityChange)

    startLoop()

    return () => {
      cancelled = true
      stopLoop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      if (shouldListenOrientation) {
        window.removeEventListener('deviceorientation', onOrientation)
      }

      if (shouldListenMotion) {
        window.removeEventListener('devicemotion', onDeviceMotion)
      }

      if (nativeHandle) {
        void nativeHandle.remove()
        nativeHandle = null
      }

      if (nativeTransport) {
        void stopNativeMotion().catch(() => undefined)
      }

      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [
    enabled,
    isDesktop,
    isPhone,
    markTiltSample,
    nativeTransport,
    pointerCoarse,
    reducedMotion,
    updateDiagnostics,
  ])

  const snapshot = useMemo<MotionSnapshot>(() => {
    return {
      x: vectorState.x,
      y: vectorState.y,
      source: activeSource,
      permissionState,
      capabilityState,
      isReducedMotion: reducedMotion,
      diagnostics,
    }
  }, [
    activeSource,
    capabilityState,
    diagnostics,
    permissionState,
    reducedMotion,
    vectorState.x,
    vectorState.y,
  ])

  return {
    motionRef,
    snapshot,
    requestTiltPermission,
    openTiltSettings,
    recenter,
  }
}
