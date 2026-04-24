import { useState } from 'react'
import styles from './AuthScene.module.css'

type AuthSceneMode = 'login' | 'register'

interface AuthSubmitPayload {
  email: string
  password: string
}

interface AuthSceneProps {
  active: boolean
  mode: AuthSceneMode
  pending: boolean
  sourcePath: string | null
  error: string | null
  onSubmit: (payload: AuthSubmitPayload) => void
  onSwitchMode: () => void
  onGoHome: () => void
}

function resolveSourcePathLabel(path: string | null) {
  if (!path) {
    return '首页'
  }

  if (path === '/archive' || path === '/my-dreams') {
    return '我的'
  }

  if (path === '/gallery') {
    return '圈子'
  }

  if (path === '/live-reading') {
    return '真人连线'
  }

  return path
}

export function AuthScene({
  active,
  mode,
  pending,
  sourcePath,
  error,
  onSubmit,
  onSwitchMode,
  onGoHome,
}: AuthSceneProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const sourcePathLabel = resolveSourcePathLabel(sourcePath)

  const title = mode === 'register' ? '创建账户' : '欢迎回来'
  const submitLabel = pending ? '提交中...' : mode === 'register' ? '注册并继续' : '登录并继续'
  const switchLabel = mode === 'register' ? '已有账号？去登录' : '还没账号？去注册'
  const panelClassName = ['scene-panel', 'scene-template-form', styles.authScene, active ? 'is-active' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <section className={panelClassName} aria-label={mode === 'register' ? 'Register' : 'Login'}>
      <div className={`entry-shell ${styles.authShell}`}>
        <div className="entry-shell-glow entry-shell-glow-a" aria-hidden />
        <div className="entry-shell-glow entry-shell-glow-b" aria-hidden />
        <div className="entry-shell-grain" aria-hidden />

        <header className={`entry-header ${styles.authHeader}`}>
          <p className="entry-eyebrow">Dreamkeeper Auth</p>
          <h2>{title}</h2>
          <p>登录后会自动返回「{sourcePathLabel}」。</p>
        </header>

        <div className={`entry-stage ${styles.authStage}`}>
          <label className={styles.fieldLabel}>
            邮箱
            <input
              className={styles.fieldInput}
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className={styles.fieldLabel}>
            密码
            <input
              className={styles.fieldInput}
              type="password"
              value={password}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className={styles.errorText}>{error}</p> : null}
          <div className={`assistant-actions entry-mobile-sticky ${styles.actionRow}`}>
            <button
              type="button"
              className="primary-pill"
              onClick={() => onSubmit({ email: email.trim(), password })}
              disabled={pending || email.trim().length === 0 || password.length === 0}
            >
              {submitLabel}
            </button>
            <button type="button" className="secondary-pill" onClick={onSwitchMode} disabled={pending}>
              {switchLabel}
            </button>
          </div>
          <button type="button" className={styles.backButton} onClick={onGoHome} disabled={pending}>
            返回首页
          </button>
        </div>
      </div>
    </section>
  )
}
