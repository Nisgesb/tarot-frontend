import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import type { NativeMotionStatus } from '../motion/types'

interface NativeMotionStatusResult {
  status: NativeMotionStatus
}

interface NativeMotionSample {
  accelerationIncludingGravity: {
    x: number
    y: number
    z: number
  }
  timestamp: number
}

interface NativeMotionStartResult {
  status: NativeMotionStatus
  started: boolean
}

interface NativeMotionPlugin {
  getStatus(): Promise<NativeMotionStatusResult>
  start(): Promise<NativeMotionStartResult>
  stop(): Promise<void>
  recenter(): Promise<void>
  openSettings(): Promise<void>
  addListener(
    eventName: 'motionSample',
    listenerFunc: (sample: NativeMotionSample) => void,
  ): Promise<PluginListenerHandle>
}

const NativeMotion = registerPlugin<NativeMotionPlugin>('NativeMotion')

export type { NativeMotionSample, NativeMotionStartResult, NativeMotionStatusResult }

export async function getNativeMotionStatus(): Promise<NativeMotionStatus> {
  const result = await NativeMotion.getStatus()
  return result.status
}

export async function startNativeMotion() {
  return NativeMotion.start()
}

export async function stopNativeMotion() {
  await NativeMotion.stop()
}

export async function recenterNativeMotion() {
  await NativeMotion.recenter()
}

export async function openNativeMotionSettings() {
  await NativeMotion.openSettings()
}

export async function addNativeMotionListener(
  listener: (sample: NativeMotionSample) => void,
) {
  return NativeMotion.addListener('motionSample', listener)
}
