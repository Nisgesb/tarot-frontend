import type { MotionPermissionState, MotionSource } from '../motion/types'

interface MotionControlDockProps {
  permissionState: MotionPermissionState
  source: MotionSource
  hasTiltSample: boolean
  onReenable: () => void
  onRecenter: () => void
}

export function MotionControlDock({
  permissionState,
  source,
  hasTiltSample,
  onReenable,
  onRecenter,
}: MotionControlDockProps) {
  const sourceLabelMap: Record<MotionSource, string> = {
    tilt: '陀螺仪',
    touch: '触控',
    mouse: '鼠标',
    idle: '自动',
  }

  return (
    <div className="motion-control-dock" aria-label="动态交互控制">
      <button type="button" className="secondary-pill" onClick={onReenable}>
        {permissionState === 'granted' && hasTiltSample
          ? '动态已开启'
          : permissionState === 'denied'
            ? '重新请求权限'
            : '启用陀螺仪'}
      </button>
      <button type="button" className="ghost-chip" onClick={onRecenter}>
        重新校准 · {sourceLabelMap[source]}
      </button>
    </div>
  )
}
