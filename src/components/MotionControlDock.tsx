import type { MotionPermissionState, MotionSource } from '../motion/types'

interface MotionControlDockProps {
  permissionState: MotionPermissionState
  source: MotionSource
  onReenable: () => void
  onRecenter: () => void
}

export function MotionControlDock({
  permissionState,
  source,
  onReenable,
  onRecenter,
}: MotionControlDockProps) {
  return (
    <div className="motion-control-dock" aria-label="motion controls">
      <button type="button" className="secondary-pill" onClick={onReenable}>
        {permissionState === 'granted' ? 'Motion On' : 'Enable Motion'}
      </button>
      <button type="button" className="ghost-chip" onClick={onRecenter}>
        Recenter · {source}
      </button>
    </div>
  )
}
