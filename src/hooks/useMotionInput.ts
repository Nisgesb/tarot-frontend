import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type {
  MotionCapabilityState,
  MotionPermissionState,
  MotionSnapshot,
  MotionSource,
  MotionVector,
} from '../motion/types'
import {
  deviceOrientationNeedsPermission,
  hasDeviceOrientationSupport,
} from '../platform/runtime'

const MOTION_PERMISSION_KEY = 'motion-permission'
const MOTION_OPT_IN_KEY = 'motion-opt-in'
const MOTION_CALIBRATION_KEY = 'motion-calibration'

const DEAD_ZONE = 0.035
const LOW_PASS = 0.11
const CLAMP_RANGE = 0.78
const MAX_DELTA_PER_FRAME = 0.025

interface OrientationCalibration {
  beta: number
  gamma: number
}

interface UseMotionInputOptions {
  enabled: boolean
  reducedMotion: boolean
  pointerCoarse: boolean
  isDesktop: boolean
}

interface UseMotionInputResult {
  motionRef: MutableRefObject<MotionVector>
  snapshot: MotionSnapshot
  showPermissionPrompt: boolean
  requestTiltPermission: () => Promise<boolean>
  nudgePermissionPrompt: () => void
  dismissPermissionPrompt: () => void
  recenter: () => void
  reopenMotionPrompt: () => void
}

interface DeviceOrientationWithPermission extends DeviceOrientationEvent {
  requestPermission?: () => Promise<'granted' | 'denied'>
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
    // no-op
  }
}

function readCalibration(): OrientationCalibration | null {
  const raw = readStorage(MOTION_CALIBRATION_KEY)

  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as OrientationCalibration

    if (typeof parsed.beta === 'number' && typeof parsed.gamma === 'number') {
      return parsed
    }

    return null
  } catch {
    return null
  }
}

function getTiltSupport() {
  return hasDeviceOrientationSupport()
}

function getNeedsPermission() {
  return deviceOrientationNeedsPermission()
}

function derivePermissionState(): MotionPermissionState {
  const hasTiltSupport = getTiltSupport()

  if (!hasTiltSupport) {
    return 'unsupported'
  }

  const storedPermission = readStorage(MOTION_PERMISSION_KEY)

  if (storedPermission === 'granted') {
    return 'granted'
  }

  if (storedPermission === 'denied') {
    return 'denied'
  }

  if (!getNeedsPermission()) {
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
}: UseMotionInputOptions): UseMotionInputResult {
  const [permissionState, setPermissionState] =
    useState<MotionPermissionState>(derivePermissionState)
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false)
  const [activeSource, setActiveSource] = useState<MotionSource>('idle')
  const [vectorState, setVectorState] = useState({ x: 0, y: 0 })

  const permissionStateRef = useRef(permissionState)
  const motionRef = useRef<MotionVector>({ x: 0, y: 0, source: 'idle' })
  const targetTiltRef = useRef({ x: 0, y: 0, beta: 0, gamma: 0 })
  const targetTouchRef = useRef({ x: 0, y: 0 })
  const targetMouseRef = useRef({ x: 0, y: 0 })
  const smoothRef = useRef({ x: 0, y: 0 })
  const touchActiveRef = useRef(false)
  const calibrationRef = useRef<OrientationCalibration | null>(readCalibration())
  const sourceRef = useRef<MotionSource>('idle')
  const lastTiltAtRef = useRef(0)
  const lastTouchAtRef = useRef(0)
  const lastMouseAtRef = useRef(0)

  useEffect(() => {
    permissionStateRef.current = permissionState
  }, [permissionState])

  const capabilityState = useMemo(
    () => deriveCapabilityState(permissionState),
    [permissionState],
  )

  const requestTiltPermission = useCallback(async () => {
    if (reducedMotion || !enabled) {
      setShowPermissionPrompt(false)
      return false
    }

    if (!getTiltSupport()) {
      setPermissionState('unsupported')
      setShowPermissionPrompt(false)
      return false
    }

    if (!getNeedsPermission()) {
      writeStorage(MOTION_PERMISSION_KEY, 'granted')
      writeStorage(MOTION_OPT_IN_KEY, 'true')
      setPermissionState('granted')
      setShowPermissionPrompt(false)
      return true
    }

    try {
      const orientationCtor = window
        .DeviceOrientationEvent as typeof DeviceOrientationEvent &
        DeviceOrientationWithPermission
      const result = await orientationCtor.requestPermission?.()
      const granted = result === 'granted'

      setPermissionState(granted ? 'granted' : 'denied')
      writeStorage(MOTION_PERMISSION_KEY, granted ? 'granted' : 'denied')
      writeStorage(MOTION_OPT_IN_KEY, granted ? 'true' : 'false')
      setShowPermissionPrompt(false)
      return granted
    } catch {
      setPermissionState('denied')
      writeStorage(MOTION_PERMISSION_KEY, 'denied')
      writeStorage(MOTION_OPT_IN_KEY, 'false')
      setShowPermissionPrompt(false)
      return false
    }
  }, [enabled, reducedMotion])

  const dismissPermissionPrompt = useCallback(() => {
    writeStorage(MOTION_OPT_IN_KEY, 'false')
    setShowPermissionPrompt(false)
  }, [])

  const nudgePermissionPrompt = useCallback(() => {
    if (reducedMotion || !enabled) {
      return
    }

    if (permissionStateRef.current === 'granted' || permissionStateRef.current === 'unsupported') {
      return
    }

    const skipped = readStorage(MOTION_OPT_IN_KEY) === 'false'
    if (skipped) {
      return
    }

    setShowPermissionPrompt(true)
  }, [enabled, reducedMotion])

  const reopenMotionPrompt = useCallback(() => {
    if (permissionStateRef.current === 'unsupported') {
      return
    }

    writeStorage(MOTION_OPT_IN_KEY, 'true')
    setShowPermissionPrompt(true)
  }, [])

  const recenter = useCallback(() => {
    const calibration = {
      beta: targetTiltRef.current.beta,
      gamma: targetTiltRef.current.gamma,
    }

    calibrationRef.current = calibration
    writeStorage(MOTION_CALIBRATION_KEY, JSON.stringify(calibration))
  }, [])

  useEffect(() => {
    if (!enabled || reducedMotion) {
      motionRef.current = { x: 0, y: 0, source: 'idle' }
      smoothRef.current = { x: 0, y: 0 }
      return undefined
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (permissionStateRef.current !== 'granted') {
        return
      }

      if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') {
        return
      }

      targetTiltRef.current.beta = event.beta
      targetTiltRef.current.gamma = event.gamma

      const calibration = calibrationRef.current
      if (!calibration) {
        const nextCalibration = {
          beta: event.beta,
          gamma: event.gamma,
        }

        calibrationRef.current = nextCalibration
        writeStorage(MOTION_CALIBRATION_KEY, JSON.stringify(nextCalibration))
      }

      const base = calibrationRef.current ?? { beta: event.beta, gamma: event.gamma }
      const normalizedX = clamp((event.gamma - base.gamma) / 22, -1, 1)
      const normalizedY = clamp((event.beta - base.beta) / 26, -1, 1)

      targetTiltRef.current.x = normalizedX
      targetTiltRef.current.y = normalizedY
      lastTiltAtRef.current = performance.now()
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

    window.addEventListener('deviceorientation', onOrientation)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerUp, { passive: true })

    let frameId = 0

    const tick = (time: number) => {
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

      const nextX = smoothRef.current.x + (clampedX - smoothRef.current.x) * LOW_PASS
      const nextY = smoothRef.current.y + (clampedY - smoothRef.current.y) * LOW_PASS

      const dx = clamp(nextX - smoothRef.current.x, -MAX_DELTA_PER_FRAME, MAX_DELTA_PER_FRAME)
      const dy = clamp(nextY - smoothRef.current.y, -MAX_DELTA_PER_FRAME, MAX_DELTA_PER_FRAME)

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

      frameId = window.requestAnimationFrame(tick)
    }

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('deviceorientation', onOrientation)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
      window.cancelAnimationFrame(frameId)
    }
  }, [enabled, isDesktop, pointerCoarse, reducedMotion])

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = motionRef.current

      setVectorState((previous) => {
        if (
          Math.abs(previous.x - current.x) < 0.003 &&
          Math.abs(previous.y - current.y) < 0.003
        ) {
          return previous
        }

        return {
          x: current.x,
          y: current.y,
        }
      })
    }, 180)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  const snapshot = useMemo<MotionSnapshot>(() => {
    return {
      x: vectorState.x,
      y: vectorState.y,
      source: activeSource,
      permissionState,
      capabilityState,
      isReducedMotion: reducedMotion,
    }
  }, [activeSource, capabilityState, permissionState, reducedMotion, vectorState.x, vectorState.y])

  return {
    motionRef,
    snapshot,
    showPermissionPrompt,
    requestTiltPermission,
    nudgePermissionPrompt,
    dismissPermissionPrompt,
    recenter,
    reopenMotionPrompt,
  }
}
