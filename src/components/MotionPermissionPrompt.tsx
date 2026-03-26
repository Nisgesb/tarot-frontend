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
      <p className="motion-permission-title">动态交互权限</p>
      <p className="motion-permission-copy">
        {blocked
          ? '当前动态权限被拒绝。你可以立即重试授权，或继续使用触控交互。'
          : '开启陀螺仪后，背景会随手机倾斜产生更强的空间纵深。'}
      </p>
      <div className="motion-permission-actions">
        <button type="button" className="primary-pill" onClick={onEnable}>
          {blocked ? '重新请求权限' : '开启陀螺仪'}
        </button>
        <button type="button" className="secondary-pill" onClick={onSkip}>
          {blocked ? '继续使用触控' : '暂不启用'}
        </button>
      </div>
    </aside>
  )
}
