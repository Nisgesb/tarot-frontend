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
          {denied ? '动态感应已关闭' : '开启动态感应'}
        </p>
        <p className="motion-permission-copy">
          {denied
            ? '你已关闭动态感应，可在系统设置重新开启；未开启时仍可继续以普通模式浏览。'
            : '开启后首页会随手机倾斜产生空间纵深效果；授权完成后，后续启动会默认自动开启。'}
        </p>
        <div className="motion-permission-actions">
          <button
            type="button"
            className="primary-pill"
            onClick={denied ? onOpenSettings : onEnable}
          >
            {denied ? '去设置开启' : '开启动态感应'}
          </button>
          <button type="button" className="secondary-pill" onClick={onSkip}>
            {onboarding ? '先体验普通模式' : '继续普通模式'}
          </button>
        </div>
      </div>
    </aside>
  )
}
