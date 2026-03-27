import { useState } from 'react'
import type {
  MotionDiagnostics,
  MotionPermissionState,
  MotionSceneTuning,
  MotionSource,
  MotionTuning,
} from '../motion/types'

interface MotionDebugPanelProps {
  tuning: MotionTuning
  sceneTuning: MotionSceneTuning
  permissionState: MotionPermissionState
  source: MotionSource
  diagnostics: MotionDiagnostics
  onChange: (patch: Partial<MotionTuning>) => void
  onChangeScene: (patch: Partial<MotionSceneTuning>) => void
  onReset: () => void
  onResetScene: () => void
}

export function MotionDebugPanel({
  tuning,
  sceneTuning,
  permissionState,
  source,
  diagnostics,
  onChange,
  onChangeScene,
  onReset,
  onResetScene,
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

  const runtimeLabelMap: Record<MotionDiagnostics['runtimePlatform'], string> = {
    web: 'Web',
    ios: 'iOS',
    android: 'Android',
  }

  const transportLabelMap: Record<MotionDiagnostics['transport'], string> = {
    web: 'Web',
    native: '原生',
  }

  const nativeListenerLabelMap: Record<MotionDiagnostics['nativeListenerState'], string> = {
    idle: '未接入',
    attached: '已接入',
    failed: '接入失败',
  }

  const nativePermissionLabelMap: Record<MotionDiagnostics['nativePermissionState'], string> = {
    notDetermined: '未决',
    granted: '已授权',
    denied: '已拒绝',
    unsupported: '不支持',
  }

  const lastTiltSampleLabel = diagnostics.lastTiltSampleAt
    ? new Date(diagnostics.lastTiltSampleAt).toLocaleTimeString('zh-CN', {
        hour12: false,
      })
    : '未收到'
  const lastNativeSampleLabel = diagnostics.lastNativeSampleAt
    ? new Date(diagnostics.lastNativeSampleAt).toLocaleTimeString('zh-CN', {
        hour12: false,
      })
    : '未收到'

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

          <p className="motion-debug-meta">
            平台：{runtimeLabelMap[diagnostics.runtimePlatform]} · 链路：
            {transportLabelMap[diagnostics.transport]}
          </p>

          <p className="motion-debug-meta">
            原生权限：{nativePermissionLabelMap[diagnostics.nativePermissionState]} · 原生监听：
            {nativeListenerLabelMap[diagnostics.nativeListenerState]}
          </p>

          <p className="motion-debug-meta">
            `DeviceOrientationEvent`：
            {diagnostics.hasBrowserOrientationSupport ? '存在' : '缺失'} · `DeviceMotionEvent`：
            {diagnostics.hasBrowserMotionSupport ? '存在' : '缺失'}
          </p>

          <p className="motion-debug-meta">
            最近倾斜样本：
            {diagnostics.hasTiltSample ? `已收到（${lastTiltSampleLabel}）` : '未收到'}
          </p>

          <p className="motion-debug-meta">
            最近原生样本：{lastNativeSampleLabel} · 当前是否倾斜：
            {source === 'tilt' ? '是' : '否'}
          </p>

          <label className="metaball-debug-row">
            <span>倾斜增益 {tuning.phoneTiltGain.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={8}
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
              min={0.1}
              max={4}
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
              min={0.05}
              max={4}
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
              min={-1.5}
              max={3}
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
              min={0.1}
              max={8}
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

          <div className="metaball-debug-title" style={{ marginTop: 14 }}>
            背景调试
          </div>

          <label className="metaball-debug-row">
            <span>背景旋转速度 {sceneTuning.nebulaTimeScale.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={8}
              step={0.01}
              value={sceneTuning.nebulaTimeScale}
              onChange={(event) => {
                onChangeScene({ nebulaTimeScale: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>背景横向位移 {sceneTuning.nebulaMotionX.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.01}
              value={sceneTuning.nebulaMotionX}
              onChange={(event) => {
                onChangeScene({ nebulaMotionX: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>背景纵向位移 {sceneTuning.nebulaMotionY.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.01}
              value={sceneTuning.nebulaMotionY}
              onChange={(event) => {
                onChangeScene({ nebulaMotionY: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>星空速度 {sceneTuning.starSpeed.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={8}
              step={0.01}
              value={sceneTuning.starSpeed}
              onChange={(event) => {
                onChangeScene({ starSpeed: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>门户横向位移 {sceneTuning.portalMotionX.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.01}
              value={sceneTuning.portalMotionX}
              onChange={(event) => {
                onChangeScene({ portalMotionX: Number(event.target.value) })
              }}
            />
          </label>

          <label className="metaball-debug-row">
            <span>门户纵向位移 {sceneTuning.portalMotionY.toFixed(2)}</span>
            <input
              type="range"
              min={0}
              max={5}
              step={0.01}
              value={sceneTuning.portalMotionY}
              onChange={(event) => {
                onChangeScene({ portalMotionY: Number(event.target.value) })
              }}
            />
          </label>

          <button type="button" className="metaball-debug-replay" onClick={onResetScene}>
            重置背景参数
          </button>
        </div>
      ) : null}
    </>
  )
}
