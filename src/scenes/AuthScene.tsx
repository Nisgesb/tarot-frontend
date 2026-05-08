import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { GlassPanel } from '../components/GlassPanel'
import type { AuthPayload } from '../types/liveReading'
import styles from './AuthScene.module.css'

export type AuthSceneMode = 'login' | 'register'
type AuthBackgroundPreset = 'default' | 'highlight'

const AUTH_BG_DEBUG_STORAGE_KEY = 'auth-bg-debug-v1'
const DEFAULT_AUTH_BG_PRESET: AuthBackgroundPreset = 'default'
const AUTH_FORM_DEBUG_STORAGE_KEY = 'auth-form-debug-v3'
const AUTH_CAT_DEBUG_STORAGE_KEY = 'auth-cat-debug-v2'

interface AuthFormDebugState {
  panelOffsetY: number
}

interface AuthCatDebugState {
  offsetX: number
  offsetY: number
  scale: number
}

const DEFAULT_AUTH_FORM_DEBUG_STATE: AuthFormDebugState = {
  panelOffsetY: -165,
}

const DEFAULT_AUTH_CAT_DEBUG_STATE: AuthCatDebugState = {
  offsetX: 0,
  offsetY: 87,
  scale: 2.03,
}

const FIXED_AUTH_GLASS_STYLE = {
  borderRadius: 20,
  brightness: 62,
  opacity: 0.9,
  blur: 12,
  displace: 0.9,
  backgroundOpacity: 0.24,
  saturation: 1.52,
  distortionScale: -102,
  redOffset: 4,
  greenOffset: 16,
  blueOffset: 30,
} as const

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return Math.min(max, Math.max(min, value))
}

function normalizeAuthFormDebugState(input: unknown): AuthFormDebugState {
  if (!input || typeof input !== 'object') {
    return DEFAULT_AUTH_FORM_DEBUG_STATE
  }
  const state = input as Partial<Record<keyof AuthFormDebugState, unknown>>
  return {
    panelOffsetY: clampNumber(state.panelOffsetY, -260, 180, DEFAULT_AUTH_FORM_DEBUG_STATE.panelOffsetY),
  }
}

function normalizeAuthCatDebugState(input: unknown): AuthCatDebugState {
  if (!input || typeof input !== 'object') {
    return DEFAULT_AUTH_CAT_DEBUG_STATE
  }
  const state = input as Partial<Record<keyof AuthCatDebugState, unknown>>
  return {
    offsetX: clampNumber(state.offsetX, -220, 220, DEFAULT_AUTH_CAT_DEBUG_STATE.offsetX),
    offsetY: clampNumber(state.offsetY, -260, 260, DEFAULT_AUTH_CAT_DEBUG_STATE.offsetY),
    scale: clampNumber(state.scale, 0.4, 2.4, DEFAULT_AUTH_CAT_DEBUG_STATE.scale),
  }
}

function loadAuthFormDebugState(): AuthFormDebugState {
  if (typeof window === 'undefined') return DEFAULT_AUTH_FORM_DEBUG_STATE
  const defaultStateByWidth: AuthFormDebugState = {
    panelOffsetY: resolveDefaultFormPanelOffsetYByWidth(window.innerWidth),
  }
  try {
    const stored = window.localStorage.getItem(AUTH_FORM_DEBUG_STORAGE_KEY)
    if (!stored) return defaultStateByWidth
    return normalizeAuthFormDebugState(JSON.parse(stored))
  } catch {
    return defaultStateByWidth
  }
}

function loadAuthCatDebugState(): AuthCatDebugState {
  if (typeof window === 'undefined') return DEFAULT_AUTH_CAT_DEBUG_STATE
  try {
    const stored = window.localStorage.getItem(AUTH_CAT_DEBUG_STORAGE_KEY)
    if (!stored) return DEFAULT_AUTH_CAT_DEBUG_STATE
    return normalizeAuthCatDebugState(JSON.parse(stored))
  } catch {
    return DEFAULT_AUTH_CAT_DEBUG_STATE
  }
}

function loadAuthBackgroundPreset(): AuthBackgroundPreset {
  if (typeof window === 'undefined') return DEFAULT_AUTH_BG_PRESET
  try {
    const stored = window.localStorage.getItem(AUTH_BG_DEBUG_STORAGE_KEY)
    return stored === 'highlight' ? 'highlight' : DEFAULT_AUTH_BG_PRESET
  } catch {
    return DEFAULT_AUTH_BG_PRESET
  }
}

function getViewportWidth() {
  if (typeof window === 'undefined') return 0
  return window.innerWidth
}

function resolveDefaultFormPanelOffsetYByWidth(width: number) {
  return width >= 400 && width <= 600 ? -129 : DEFAULT_AUTH_FORM_DEBUG_STATE.panelOffsetY
}

interface AuthLoginPayload {
  kind: 'login'
  email: string
  password: string
}

interface AuthRegisterPayload {
  kind: 'register'
  email: string
  password: string
  birthday: string
  verificationCode: string
}

export type AuthSubmitPayload = AuthLoginPayload | AuthRegisterPayload

interface AuthSceneProps {
  active: boolean
  mode: AuthSceneMode
  pending: boolean
  auth: AuthPayload | null
  sourcePath: string | null
  error: string | null
  onSubmit: (payload: AuthSubmitPayload) => void | Promise<void>
  onSendRegisterCode: (email: string) => Promise<string | void> | string | void
  onSwitchMode: () => void
  onContinue: () => void
  onLogout: () => void | Promise<void>
  onGoHome: () => void
}

function resolveSourcePathLabel(path: string | null) {
  if (!path) return '首页'
  if (path === '/archive' || path === '/my-dreams') return '我的'
  if (path === '/gallery') return '圈子'
  if (path === '/live-reading') return '真人连线'
  return path
}

export function AuthScene({
  active,
  mode,
  pending,
  auth,
  sourcePath,
  error,
  onSubmit,
  onSendRegisterCode,
  onSwitchMode,
  onContinue,
  onLogout,
  onGoHome,
}: AuthSceneProps) {
  const registerMode = mode === 'register'
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [codePending, setCodePending] = useState(false)
  const [codeMessage, setCodeMessage] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [bgDebugOpen, setBgDebugOpen] = useState(false)
  const [backgroundPreset, setBackgroundPreset] = useState<AuthBackgroundPreset>(() => loadAuthBackgroundPreset())
  const [formDebugState, setFormDebugState] = useState<AuthFormDebugState>(() => loadAuthFormDebugState())
  const [catDebugState, setCatDebugState] = useState<AuthCatDebugState>(() => loadAuthCatDebugState())

  const sourcePathLabel = resolveSourcePathLabel(sourcePath)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const submitLabel = pending ? '提交中...' : (registerMode ? '创建我的占卜档案' : '进入占卜空间')
  const panelTitle = registerMode ? '欢迎加入' : '欢迎回来'
  const panelSubtitle = registerMode ? '保存牌阵记录，解锁今日运势与专属指引' : '继续你的今日指引，保存牌阵与运势记录'
  const panelClassName = [
    'scene-panel',
    'scene-template-form',
    styles.authScene,
    backgroundPreset === 'highlight' ? styles.authSceneBgHighlight : '',active ? 'is-active' : '',
  ].filter(Boolean).join(' ')
  const submitDisabled =
    pending ||
    email.trim().length === 0 ||
    password.trim().length === 0 ||
    (registerMode && (verificationCode.trim().length === 0 || nickname.trim().length === 0))
  const panelStyle = useMemo<CSSProperties>(
    () => ({ '--auth-stage-offset-y': `${formDebugState.panelOffsetY}px` }) as CSSProperties,
    [formDebugState.panelOffsetY],
  )
  const catStyle = useMemo<CSSProperties>(
    () => ({
      '--auth-cat-offset-x': `${catDebugState.offsetX}px`,
      '--auth-cat-offset-y': `${catDebugState.offsetY}px`,
      '--auth-cat-scale': `${catDebugState.scale}`,
    }) as CSSProperties,
    [catDebugState.offsetX, catDebugState.offsetY, catDebugState.scale],
  )

  const patchFormDebugState = useCallback((patch: Partial<AuthFormDebugState>) => {
    setFormDebugState((previous) => normalizeAuthFormDebugState({ ...previous, ...patch }))
  }, [])

  const patchCatDebugState = useCallback((patch: Partial<AuthCatDebugState>) => {
    setCatDebugState((previous) => normalizeAuthCatDebugState({ ...previous, ...patch }))
  }, [])

  useEffect(() => { setCodeMessage(null); setCodeError(null) }, [mode])
  useEffect(() => { setCodeMessage(null); setCodeError(null) }, [email])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(AUTH_BG_DEBUG_STORAGE_KEY, backgroundPreset) } catch { /* ignore */ }
  }, [backgroundPreset])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(AUTH_FORM_DEBUG_STORAGE_KEY, JSON.stringify(formDebugState)) } catch { /* ignore */ }
  }, [formDebugState])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try { window.localStorage.setItem(AUTH_CAT_DEBUG_STORAGE_KEY, JSON.stringify(catDebugState)) } catch { /* ignore */ }
  }, [catDebugState])

  const handleSendRegisterCode = async () => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail || codePending || pending) return
    setCodePending(true)
    setCodeMessage(null)
    setCodeError(null)
    try {
      const message = await onSendRegisterCode(normalizedEmail)
      setCodeMessage(message ?? '验证码已发送，请检查邮箱。')
    } catch (exception) {
      const message =
        exception instanceof Error && exception.message.trim().length > 0
          ? exception.message
          : '验证码发送失败，请稍后重试。'
      setCodeError(message)
    } finally {
      setCodePending(false)
    }
  }

  return (
    <section className={panelClassName} aria-label={registerMode ? 'Register' : 'Login'}>
      <div className={styles.authShell}>
        {/* 背景调试面板：仅开发环境可见 */}
        <div className={styles.authBgDebugDock}>
          <button
            type="button"
            className={styles.authBgDebugToggle}
            onClick={() => setBgDebugOpen((p) => !p)}
            aria-expanded={bgDebugOpen}
            aria-controls="auth-bg-debug-panel"
          >
            {bgDebugOpen ? '收起背景调试' : '背景调试'}
          </button>
          {bgDebugOpen && (
            <div id="auth-bg-debug-panel" className={styles.authBgDebugPanel}>
              <div className={styles.authBgSourceSwitch} role="tablist" aria-label="背景切换">
                <button
                  type="button"
                  className={`${styles.authBgSourceButton} ${backgroundPreset === 'default' ? styles.authBgSourceButtonActive : ''}`}
                  onClick={() => setBackgroundPreset('default')}
                  aria-pressed={backgroundPreset === 'default'}
                >
                  默认背景
                </button>
                <button
                  type="button"
                  className={`${styles.authBgSourceButton} ${backgroundPreset === 'highlight' ? styles.authBgSourceButtonActive : ''}`}
                  onClick={() => setBackgroundPreset('highlight')}
                  aria-pressed={backgroundPreset === 'highlight'}
                >
                  19_57_56
                </button>
              </div>
              <div className={styles.authGlassDebugSection}>
                <p className={styles.authGlassDebugTitle}>表单调试</p>
                <label className={styles.authGlassDebugSliderRow}>
                  <span className={styles.authGlassDebugLabel}>位置Y</span>
                  <input
                    className={styles.authGlassDebugSlider}
                    type="range"
                    min={-260}
                    max={180}
                    step={1}
                    value={formDebugState.panelOffsetY}
                    onChange={(e) => patchFormDebugState({ panelOffsetY: Number(e.currentTarget.value) })}
                  />
                  <span className={styles.authGlassDebugValue}>{formDebugState.panelOffsetY}</span>
                </label>
                <button
                  type="button"
                  className={styles.authGlassDebugResetButton}
                  onClick={() =>
                    setFormDebugState({
                      panelOffsetY: resolveDefaultFormPanelOffsetYByWidth(getViewportWidth()),
                    })
                  }
                >
                  重置表单位置
                </button>
              </div>
              <div className={styles.authGlassDebugSection}>
                <p className={styles.authGlassDebugTitle}>小猫调试</p>
                {(
                  [
                    { label: '位置X', key: 'offsetX', min: -220, max: 220, step: 1 },
                    { label: '位置Y', key: 'offsetY', min: -260, max: 260, step: 1 },
                    { label: '大小', key: 'scale', min: 0.4, max: 2.4, step: 0.01 },
                  ] as Array<{ label: string; key: keyof AuthCatDebugState; min: number; max: number; step: number }>
                ).map(({ label, key, min, max, step }) => (
                  <label key={key} className={styles.authGlassDebugSliderRow}>
                    <span className={styles.authGlassDebugLabel}>{label}</span>
                    <input
                      className={styles.authGlassDebugSlider}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={catDebugState[key]}
                      onChange={(e) => patchCatDebugState({ [key]: Number(e.currentTarget.value) })}
                    />
                    <span className={styles.authGlassDebugValue}>
                      {step < 1 ? (catDebugState[key] as number).toFixed(2) : catDebugState[key]}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  className={styles.authGlassDebugResetButton}
                  onClick={() => setCatDebugState(DEFAULT_AUTH_CAT_DEBUG_STATE)}
                >
                  重置小猫参数
                </button>
              </div>
            </div>
          )}
        </div><div className={styles.authTopbar}>
          <button
            type="button"
            className={styles.backArrowButton}
            onClick={onGoHome}
            disabled={pending || codePending}
            aria-label="返回"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button><button
            type="button"
            className={styles.skipButton}
            onClick={onGoHome}
            disabled={pending || codePending}
          >
            跳过
          </button>
        </div>

        <header className={styles.authHeader}>
          <p className={styles.authBrandEyebrow}>TAROT LOGIN</p>
          <h2 className={styles.authBrandTitle}>XX塔罗</h2>
          <p className={styles.authBrandSubtitle}>✦ 进入你的专属占卜空间 ✦</p>
        </header>

        <div className={styles.authEyeFloat} style={catStyle} aria-hidden>
          <img src={passwordFocused ? '/media/auth-eye-closed.png' : '/media/auth-eye-open.png'} alt="" />
        </div>

        <GlassPanel
          borderRadius={FIXED_AUTH_GLASS_STYLE.borderRadius}
          brightness={FIXED_AUTH_GLASS_STYLE.brightness}
          opacity={FIXED_AUTH_GLASS_STYLE.opacity}
          blur={FIXED_AUTH_GLASS_STYLE.blur}
          displace={FIXED_AUTH_GLASS_STYLE.displace}
          backgroundOpacity={FIXED_AUTH_GLASS_STYLE.backgroundOpacity}
          saturation={FIXED_AUTH_GLASS_STYLE.saturation}
          distortionScale={FIXED_AUTH_GLASS_STYLE.distortionScale}
          redOffset={FIXED_AUTH_GLASS_STYLE.redOffset}
          greenOffset={FIXED_AUTH_GLASS_STYLE.greenOffset}
          blueOffset={FIXED_AUTH_GLASS_STYLE.blueOffset}
          mixBlendMode="screen"
          className={styles.authStageGlass}
          contentClassName={styles.authStage}
          style={panelStyle}
        >
          {auth ? (
            <>
              <div className={styles.authPanelHeader}>
                <h3>{panelTitle}</h3>
                <p>{panelSubtitle}</p>
              </div>
              <p className={styles.statusText}>当前已登录：{auth.user.displayName ?? auth.user.email}</p>
              <p className={styles.metaText}>继续后将前往「{sourcePathLabel}」。</p>
              <div className={styles.actionRow}>
                <button type="button" className={styles.submitButton} onClick={onContinue} disabled={pending}>
                  继续前往
                </button>
                <button type="button" className={styles.altButton} onClick={() => void onLogout()} disabled={pending}>
                  退出当前账号
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.authPanelHeader}>
                <h3>
                  <span className={styles.panelSpark}>✦</span>
                  {panelTitle}
                  <span className={styles.panelSpark}>✦</span>
                </h3>
                <p>{panelSubtitle}</p>
              </div>
              {registerMode ? (
                <div className={styles.fieldRow}>
                  <div className={styles.inputShell}>
                    <span className={styles.inputIcon} aria-hidden>
                      <svg viewBox="0 0 24 24" role="presentation">
                        <circle cx="12" cy="8.2" r="3.8" />
                        <path d="M5.3 19.4c.8-3.4 3.4-5.4 6.7-5.4s5.9 2 6.7 5.4" />
                      </svg>
                    </span>
                    <div className={styles.fieldStack}>
                      <label htmlFor="auth-nickname-input" className={styles.fieldInlineLabel}>昵称</label>
                      <input
                        id="auth-nickname-input"
                        className={styles.fieldInput}
                        type="text"
                        value={nickname}
                        placeholder="输入昵称"
                        autoComplete="nickname"
                        onChange={(e) => setNickname(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              <div className={styles.fieldRow}>
                <div className={styles.inputShell}>
                  <span className={styles.inputIcon} aria-hidden>
                    {registerMode ? (
                      <svg viewBox="0 0 24 24" role="presentation">
                        <rect x="3.5" y="5.2" width="17" height="13.4" rx="2.8" />
                        <path d="M4.8 7.2 12 12.5l7.2-5.3" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" role="presentation">
                        <rect x="3.5" y="5.2" width="17" height="13.4" rx="2.8" />
                        <path d="M4.8 7.2 12 12.5l7.2-5.3" />
                      </svg>
                    )}
                  </span>
                  <div className={styles.fieldStack}>
                    <label htmlFor="auth-email-input" className={styles.fieldInlineLabel}>
                      邮箱
                    </label>
                    <input
                      id="auth-email-input"
                      className={styles.fieldInput}
                      type="email"
                      value={email}
                      placeholder="输入邮箱"
                      autoComplete="email"
                      inputMode="email"
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {registerMode ? (
                <div className={styles.fieldRow}>
                  <div className={`${styles.inputShell} ${styles.codeInputShell}`}>
                    <span className={styles.inputIcon} aria-hidden>
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M12 2.5 4.6 5.6v6.2c0 5 3.2 9.2 7.4 10.3 4.2-1.1 7.4-5.3 7.4-10.3V5.6L12 2.5Z" />
                        <path d="M9.2 12.1 11.1 14l3.7-3.7" />
                      </svg>
                    </span>
                    <div className={styles.fieldStack}>
                      <label htmlFor="auth-code-input" className={styles.fieldInlineLabel}>验证码</label>
                      <input
                        id="auth-code-input"
                        className={styles.fieldInput}
                        type="text"
                        value={verificationCode}
                        placeholder="输入验证码"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.codeButtonInner}
                      onClick={() => void handleSendRegisterCode()}
                      disabled={pending || codePending || email.trim().length === 0}
                    >
                      {codePending ? '发送中...' : '获取验证码'}
                    </button>
                  </div>
                </div>
              ) : null}
              <div className={styles.fieldRow}>
                <div className={styles.inputShell}>
                  <span className={styles.inputIcon} aria-hidden>
                    <svg viewBox="0 0 24 24" role="presentation">
                      <rect x="5.2" y="10" width="13.6" height="9.2" rx="2.1" />
                      <path d="M8.2 10V8.1a3.8 3.8 0 0 1 7.6 0V10" />
                    </svg>
                  </span>
                  <div className={styles.fieldStack}>
                    <label htmlFor="auth-password-input" className={styles.fieldInlineLabel}>
                      {registerMode ? '设置密码' : '密码'}
                    </label>
                    <input
                      id="auth-password-input"
                      className={styles.fieldInput}
                      type="password"
                      value={password}
                      placeholder={registerMode ? '请输入密码' : '输入密码'}
                      autoComplete="current-password"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {registerMode ? (
                    <span className={styles.passwordHintIcon} aria-hidden>
                      <svg viewBox="0 0 24 24" role="presentation">
                        <path d="M2.2 12.2c1.8 3 4.9 4.8 9.8 4.8s8-1.8 9.8-4.8" />
                        <path d="M7.7 15.7l-1.3 2.1" />
                        <path d="M12 16.8v2.4" />
                        <path d="M16.3 15.7l1.3 2.1" />
                      </svg>
                    </span>
                  ) : null}
                </div>
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
              {codeMessage && <p className={styles.statusText}>{codeMessage}</p>}
              {codeError && <p className={styles.errorText}>{codeError}</p>}
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={() =>
                    onSubmit(
                      registerMode
                        ? {
                            kind: 'register',
                            email: email.trim(),
                            password: password.trim(),
                            birthday: today,
                            verificationCode: verificationCode.trim(),
                          }
                        : { kind: 'login', email: email.trim(), password: password.trim() },
                    )
                  }
                  disabled={submitDisabled}
                >
                  {pending ? (
                    submitLabel
                  ) : (
                    <>
                      <span className={styles.submitSpark} aria-hidden>✦</span>
                      <span>{submitLabel}</span><span className={styles.submitSpark} aria-hidden>✦</span>
                    </>
                  )}
                </button>
              </div>
              <div className={styles.authBottomActions}>
                {!registerMode ? (
                  <button type="button" className={styles.backButton} onClick={onGoHome} disabled={pending}>
                    游客体验
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.authModeSwitch}
                  onClick={onSwitchMode}
                  disabled={pending || codePending}
                >
                  <span className={styles.authModeSwitchLead}>
                    {registerMode ? '已有账号？' : '还没有账号？'}
                  </span>
                  <span className={styles.authModeSwitchAction}>
                    {registerMode ? '立即登录' : '立即注册'}
                  </span>
                </button>
              </div>
            </>
          )}
        </GlassPanel>
      </div>
    </section>
  )
}
