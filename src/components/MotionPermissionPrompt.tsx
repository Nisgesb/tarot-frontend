interface MotionPermissionPromptProps {
  visible: boolean
  mode: 'onboarding' | 'skipped' | 'denied'
  onEnable: () => void
  onSkip: () => void
  onOpenSettings: () => void
}

export function MotionPermissionPrompt({
  visible,
  mode,
  onEnable,
  onSkip,
  onOpenSettings,
}: MotionPermissionPromptProps) {
  if (!visible) {
    return null
  }

  const onboarding = mode === 'onboarding'
  const denied = mode === 'denied'

  return (
    <aside
      className={`motion-permission-prompt ${onboarding ? 'is-onboarding' : 'is-recovery'}`}
      role="dialog"
      aria-live="polite"
      aria-modal={onboarding}
    >
      <div className="motion-permission-card">
        <p className="motion-permission-title">
          {denied ? '启动权限未开启' : '开启启动体验权限'}
        </p>
        <p className="motion-permission-copy">
          {denied
            ? '你已拒绝动态感应或定位权限，可在系统设置开启；未开启时仍可继续普通模式。'
            : '建议同时开启动态感应与定位：动态感应用于起始页空间动效，定位用于首页天气驱动小猫视频。'}
        </p>
        <div className="motion-permission-actions">
          <button
            type="button"
            className="primary-pill"
            onClick={denied ? onOpenSettings : onEnable}
          >
            {denied ? '去设置开启' : '开启权限'}
          </button>
          <button type="button" className="secondary-pill" onClick={onSkip}>
            {onboarding ? '先跳过，稍后再开' : '继续普通模式'}
          </button>
        </div>
      </div>
    </aside>
  )
}
