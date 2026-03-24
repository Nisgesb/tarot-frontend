import type { MotionPermissionState } from '../motion/types'

interface MotionPermissionPromptProps {
  visible: boolean
  permissionState: MotionPermissionState
  onEnable: () => void
  onSkip: () => void
}

export function MotionPermissionPrompt({
  visible,
  permissionState,
  onEnable,
  onSkip,
}: MotionPermissionPromptProps) {
  if (!visible) {
    return null
  }

  const blocked = permissionState === 'denied'

  return (
    <aside className="motion-permission-prompt" role="dialog" aria-live="polite">
      <p className="motion-permission-title">Motion Interaction</p>
      <p className="motion-permission-copy">
        {blocked
          ? 'Motion access is currently blocked. You can still continue with touch-driven flow.'
          : 'Enable gentle tilt response for a richer dream-space depth.'}
      </p>
      <div className="motion-permission-actions">
        {!blocked ? (
          <button type="button" className="primary-pill" onClick={onEnable}>
            Enable Motion
          </button>
        ) : null}
        <button type="button" className="secondary-pill" onClick={onSkip}>
          {blocked ? 'Continue with Touch' : 'Not Now'}
        </button>
      </div>
    </aside>
  )
}
