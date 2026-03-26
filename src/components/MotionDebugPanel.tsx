import { useState } from 'react'
import type { MotionPermissionState, MotionSource, MotionTuning } from '../motion/types'

interface MotionDebugPanelProps {
  tuning: MotionTuning
  permissionState: MotionPermissionState
  source: MotionSource
  onChange: (patch: Partial<MotionTuning>) => void
  onReset: () => void
}

export function MotionDebugPanel({
  tuning,
  permissionState,
  source,
  onChange,
  onReset,
}: MotionDebugPanelProps) {
  const [open, setOpen] = useState(false)

  const permissionLabelMap: Record<MotionPermissionState, string> = {
    unknown: '未知',
    promptable: '待授权',
    granted: '已授权',
    denied: '已拒绝',
    unsupported: '不支持',
  }

  const sourceLabelMap: Record<MotionSource, string> = {
    tilt: '陀螺仪',
    touch: '触控',
    mouse: '鼠标',
    idle: '自动',
  }

  return (
    <>
      <button
        type="button"
        className="motion-debug-toggle"
        onClick={() => {
          setOpen((value) => !value)
        }}
      >
        {open ? '隐藏陀螺仪' : '陀螺仪调试'}
      </button>

      {open ? (
        <div className="motion-debug-panel">
          <div className="metaball-debug-title">陀螺仪调试</div>

          <p className="motion-debug-meta">
            权限：{permissionLabelMap[permissionState]} · 来源：{sourceLabelMap[source]}
          </p>

          <label className="metaball-debug-row">
            <span>倾斜增益 {tuning.phoneTiltGain.toFixed(2)}</span>
            <input
              type="range"
              min={1}
              max={2.8}
              step={0.01}
              value={tuning.phoneTiltGain}
              onChange={(event) => {
                onChange({ phoneTiltGain: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>低通增强 {tuning.phoneTiltLowPassBoost.toFixed(2)}</span>
            <input
              type="range"
              min={1}
              max={1.8}
              step={0.01}
              value={tuning.phoneTiltLowPassBoost}
              onChange={(event) => {
                onChange({ phoneTiltLowPassBoost: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>校准范围 {tuning.nativeCalibrationRange.toFixed(2)}</span>
            <input
              type="range"
              min={0.28}
              max={1.2}
              step={0.01}
              value={tuning.nativeCalibrationRange}
              onChange={(event) => {
                onChange({ nativeCalibrationRange: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>绝对值混合 {tuning.nativeAbsoluteBlend.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={0.8}
              step={0.01}
              value={tuning.nativeAbsoluteBlend}
              onChange={(event) => {
                onChange({ nativeAbsoluteBlend: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>响应增强 {tuning.tiltMaxDeltaBoost.toFixed(2)}</span>
            <input
              type="range"
              min={1}
              max={2.8}
              step={0.01}
              value={tuning.tiltMaxDeltaBoost}
              onChange={(event) => {
                onChange({ tiltMaxDeltaBoost: Number(event.target.value) })
              }}
            />
          </label>

          <button type="button" className="metaball-debug-replay" onClick={onReset}>
            重置陀螺仪参数
          </button>
        </div>
      ) : null}
    </>
  )
}
