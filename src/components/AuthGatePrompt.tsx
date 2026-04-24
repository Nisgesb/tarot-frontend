interface AuthGatePromptProps {
  visible: boolean
  targetLabel: string
  onGoLogin: () => void
  onDismiss: () => void
}

export function AuthGatePrompt({
  visible,
  targetLabel,
  onGoLogin,
  onDismiss,
}: AuthGatePromptProps) {
  if (!visible) {
    return null
  }

  return (
    <aside className="motion-permission-prompt is-recovery" role="status" aria-live="polite">
      <div className="motion-permission-card">
        <p className="motion-permission-title">需要登录后继续</p>
        <p className="motion-permission-copy">
          当前入口「{targetLabel}」仅对已登录用户开放。登录后将自动回到来源页。
        </p>
        <div className="motion-permission-actions">
          <button type="button" className="primary-pill" onClick={onGoLogin}>
            去登录
          </button>
          <button type="button" className="secondary-pill" onClick={onDismiss}>
            先留在当前页
          </button>
        </div>
      </div>
    </aside>
  )
}
