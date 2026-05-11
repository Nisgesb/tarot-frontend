/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'
import { createPortal } from 'react-dom'

export type ToastType = 'info' | 'default' | 'error' | 'warning' | 'success'
export type ToastPosition = 'bottom' | 'top'

interface ToastAction {
  label: string
  onPress: () => void
}

type ExpandedContentRenderer = (params: { dismiss: () => void }) => React.ReactNode

export interface ToastOptions {
  duration?: number
  type?: ToastType
  position?: ToastPosition
  onClose?: () => void
  action?: ToastAction | null
  expandedContent?: React.ReactNode | ExpandedContentRenderer | null
  backgroundColor?: string
  style?: React.CSSProperties
}

interface ToastRecord {
  id: string
  content: React.ReactNode | string
  options: Required<
    Pick<ToastOptions, 'duration' | 'type' | 'position' | 'backgroundColor'>
  > & {
    onClose?: () => void
    action: ToastAction | null
    expandedContent: React.ReactNode | ExpandedContentRenderer | null
    style: React.CSSProperties
  }
}

interface ToastContextValue {
  toasts: ToastRecord[]
  show: (content: React.ReactNode | string, options?: ToastOptions) => string
  update: (id: string, content: React.ReactNode | string, options?: ToastOptions) => void
  dismiss: (id: string) => void
  dismissAll: () => void
  expandedToasts: Set<string>
  expandToast: (id: string) => void
  collapseToast: (id: string) => void
}

const DEFAULT_TOAST_OPTIONS = {
  duration: 3000,
  type: 'default' as ToastType,
  position: 'bottom' as ToastPosition,
  backgroundColor: '#262626',
  onClose: undefined,
  action: null,
  expandedContent: null,
  style: {},
}

const TYPE_COLORS: Record<ToastType, string> = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  default: '#262626',
}

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  default: '',
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined)

function localizeToastContent(content: React.ReactNode | string): React.ReactNode | string {
  if (typeof content !== 'string') {
    return content
  }

  const text = content.trim()
  if (!text) {
    return content
  }

  const normalized = text.toLowerCase()

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('err_network')
  ) {
    return '网络连接异常，请稍后重试。'
  }

  if (normalized.includes('timeout')) {
    return '请求超时，请稍后重试。'
  }

  if (
    normalized.includes('unauthorized') ||
    normalized.includes('forbidden') ||
    normalized.includes('401') ||
    normalized.includes('403')
  ) {
    return '登录状态已失效，请重新登录。'
  }

  if (normalized.includes('404') || normalized.includes('not found')) {
    return '请求资源不存在。'
  }

  if (
    normalized.includes('500') ||
    normalized.includes('502') ||
    normalized.includes('503') ||
    normalized.includes('504') ||
    normalized.includes('server')
  ) {
    return '服务暂时不可用，请稍后重试。'
  }

  if (
    normalized.includes('password payload invalid') ||
    (normalized.includes('password') && normalized.includes('invalid payload')) ||
    (normalized.includes('password') && normalized.includes('invalid'))
  ) {
    return '密码格式无效，请检查后重试。'
  }

  if (normalized.includes('request failed') || normalized.includes('error')) {
    return '操作失败，请稍后重试。'
  }

  if (/[a-z]/i.test(text) && !/[\u4e00-\u9fff]/.test(text)) {
    return '操作失败，请稍后重试。'
  }

  return content
}

function localizeActionLabel(label: string): string {
  const normalized = label.trim().toLowerCase()
  if (!normalized) {
    return label
  }

  if (normalized === 'retry') return '重试'
  if (normalized === 'cancel') return '取消'
  if (normalized === 'dismiss') return '关闭'
  if (normalized === 'view') return '查看'
  if (normalized === 'undo') return '撤销'
  if (normalized === 'confirm') return '确认'
  if (normalized === 'learn more') return '了解更多'
  if (normalized === 'extend') return '延长'

  return label
}

function resolveToastType(
  content: React.ReactNode | string,
  requestedType?: ToastType,
  currentType?: ToastType,
): ToastType {
  if (requestedType !== undefined) {
    return requestedType
  }

  if (currentType) {
    return currentType
  }

  if (typeof content !== 'string') {
    return DEFAULT_TOAST_OPTIONS.type
  }

  const text = content.trim().toLowerCase()

  if (!text) {
    return DEFAULT_TOAST_OPTIONS.type
  }

  if (
    text.includes('成功') ||
    text.includes('已保存') ||
    text.includes('已完成') ||
    text.includes('完成') ||
    text.includes('success') ||
    text.includes('saved') ||
    text.includes('completed')
  ) {
    return 'success'
  }

  if (
    text.includes('警告') ||
    text.includes('提醒') ||
    text.includes('即将') ||
    text.includes('过期') ||
    text.includes('超时') ||
    text.includes('warning') ||
    text.includes('expire') ||
    text.includes('timeout')
  ) {
    return 'warning'
  }

  if (
    text.includes('失败') ||
    text.includes('错误') ||
    text.includes('异常') ||
    text.includes('无效') ||
    text.includes('不可用') ||
    text.includes('不存在') ||
    text.includes('失效') ||
    text.includes('请稍后重试') ||
    text.includes('failed') ||
    text.includes('error') ||
    text.includes('invalid') ||
    text.includes('not found') ||
    text.includes('unavailable')
  ) {
    return 'error'
  }

  if (
    text.includes('提示') ||
    text.includes('通知') ||
    text.includes('信息') ||
    text.includes('已更新') ||
    text.includes('可用') ||
    text.includes('info') ||
    text.includes('notice') ||
    text.includes('updated') ||
    text.includes('available')
  ) {
    return 'info'
  }

  return DEFAULT_TOAST_OPTIONS.type
}

function resolveToastOptions(
  current: ToastRecord['options'] | null,
  patch?: ToastOptions,
  content?: React.ReactNode | string,
): ToastRecord['options'] {
  const mergedAction = patch?.action ?? current?.action ?? DEFAULT_TOAST_OPTIONS.action
  const localizedAction =
    mergedAction && typeof mergedAction.label === 'string'
      ? {
          ...mergedAction,
          label: localizeActionLabel(mergedAction.label),
        }
      : mergedAction

  return {
    duration: patch?.duration ?? current?.duration ?? DEFAULT_TOAST_OPTIONS.duration,
    type: resolveToastType(content ?? '', patch?.type, current?.type),
    position: patch?.position ?? current?.position ?? DEFAULT_TOAST_OPTIONS.position,
    backgroundColor:
      patch?.backgroundColor ?? current?.backgroundColor ?? DEFAULT_TOAST_OPTIONS.backgroundColor,
    onClose: patch?.onClose ?? current?.onClose ?? DEFAULT_TOAST_OPTIONS.onClose,
    action: localizedAction,
    expandedContent:
      patch?.expandedContent ?? current?.expandedContent ?? DEFAULT_TOAST_OPTIONS.expandedContent,
    style: {
      ...(current?.style ?? DEFAULT_TOAST_OPTIONS.style),
      ...(patch?.style ?? {}),
    },
  }
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext)

  if (!context) {
    throw new Error('useToast 必须在 ToastProvider 内使用')
  }

  return context
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([])
  const [expandedToasts, setExpandedToasts] = React.useState<Set<string>>(new Set())

  const dismiss = React.useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id))
    setExpandedToasts((previous) => {
      const next = new Set(previous)
      next.delete(id)
      return next
    })
  }, [])

  const show = React.useCallback(
    (content: React.ReactNode | string, options?: ToastOptions) => {
      const id = Math.random().toString(36).slice(2, 9)
      const localizedContent = localizeToastContent(content)
      setToasts((previous) => [
        ...previous,
        {
          id,
          content: localizedContent,
          options: resolveToastOptions(null, options, localizedContent),
        },
      ])
      return id
    },
    [],
  )

  const update = React.useCallback(
    (id: string, content: React.ReactNode | string, options?: ToastOptions) => {
      const localizedContent = localizeToastContent(content)
      setToasts((previous) =>
        previous.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                content: localizedContent,
                options: resolveToastOptions(toast.options, options, localizedContent),
              }
            : toast,
        ),
      )
    },
    [],
  )

  const dismissAll = React.useCallback(() => {
    setToasts([])
    setExpandedToasts(new Set())
  }, [])

  const expandToast = React.useCallback((id: string) => {
    setExpandedToasts((previous) => {
      const next = new Set(previous)

      if (next.size >= 3 && !next.has(id)) {
        const first = Array.from(next)[0]
        if (first) {
          next.delete(first)
        }
      }

      next.add(id)
      return next
    })
  }, [])

  const collapseToast = React.useCallback((id: string) => {
    setExpandedToasts((previous) => {
      const next = new Set(previous)
      next.delete(id)
      return next
    })
  }, [])

  const value = React.useMemo<ToastContextValue>(
    () => ({
      toasts,
      show,
      update,
      dismiss,
      dismissAll,
      expandedToasts,
      expandToast,
      collapseToast,
    }),
    [collapseToast, dismiss, dismissAll, expandToast, expandedToasts, show, toasts, update],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

interface AnimationState {
  mounted: boolean
  entering: boolean
  exiting: boolean
}

const TRANSITION = 'transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 360ms ease'

function ToastCard({ toast, index }: { toast: ToastRecord; index: number }) {
  const { dismiss, expandedToasts, expandToast, collapseToast } = useToast()
  const isExpanded = expandedToasts.has(toast.id)
  const hasExpandedContent = Boolean(toast.options.expandedContent)

  const [animationState, setAnimationState] = React.useState<AnimationState>({
    mounted: false,
    entering: true,
    exiting: false,
  })
  const mountTimerRef = React.useRef<number | null>(null)
  const mountRafRef = React.useRef<number | null>(null)
  const enterCompleteTimerRef = React.useRef<number | null>(null)
  const entryDelayRef = React.useRef(Math.min(index, 4) * 50 + 16)

  const getStackOffset = React.useCallback(() => {
    const baseOffset = 4
    const maxOffset = 12
    const offset = Math.min(index * baseOffset, maxOffset)
    return toast.options.position === 'top' ? offset : -offset
  }, [index, toast.options.position])

  const getStackScale = React.useCallback(() => {
    const scaleReduction = 0.02
    const minScale = 0.92
    return Math.max(1 - index * scaleReduction, minScale)
  }, [index])

  const finishDismiss = React.useCallback(() => {
    dismiss(toast.id)
    toast.options.onClose?.()
  }, [dismiss, toast.id, toast.options])

  const runDismissAnimation = React.useCallback(() => {
    if (animationState.exiting) {
      return
    }

    setAnimationState((previous) => ({
      ...previous,
      exiting: true,
    }))
  }, [animationState.exiting])

  React.useEffect(() => {
    if (mountTimerRef.current !== null) {
      window.clearTimeout(mountTimerRef.current)
    }
    if (mountRafRef.current !== null) {
      window.cancelAnimationFrame(mountRafRef.current)
    }

    mountTimerRef.current = window.setTimeout(() => {
      mountRafRef.current = window.requestAnimationFrame(() => {
        setAnimationState((previous) => ({
          ...previous,
          mounted: true,
          entering: true,
        }))
        enterCompleteTimerRef.current = window.setTimeout(() => {
          setAnimationState((previous) => ({
            ...previous,
            entering: false,
          }))
        }, 460)
      })
    }, entryDelayRef.current)

    return () => {
      if (mountTimerRef.current !== null) {
        window.clearTimeout(mountTimerRef.current)
        mountTimerRef.current = null
      }
      if (mountRafRef.current !== null) {
        window.cancelAnimationFrame(mountRafRef.current)
        mountRafRef.current = null
      }
      if (enterCompleteTimerRef.current !== null) {
        window.clearTimeout(enterCompleteTimerRef.current)
        enterCompleteTimerRef.current = null
      }
    }
  }, [toast.id])

  React.useEffect(() => {
    if (toast.options.duration <= 0) {
      return
    }

    const exitDelay = Math.max(0, toast.options.duration - 500)
    const timerId = window.setTimeout(() => {
      runDismissAnimation()
    }, exitDelay)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [runDismissAnimation, toast.options.duration])

  React.useEffect(() => {
    if (!animationState.exiting) {
      return
    }

    const timerId = window.setTimeout(() => {
      finishDismiss()
    }, 320)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [animationState.exiting, finishDismiss])

  const handleToggleExpanded = React.useCallback(() => {
    if (!hasExpandedContent) {
      return
    }

    if (isExpanded) {
      collapseToast(toast.id)
    } else {
      expandToast(toast.id)
    }
  }, [collapseToast, expandToast, hasExpandedContent, isExpanded, toast.id])

  const backgroundColor =
    toast.options.backgroundColor || TYPE_COLORS[toast.options.type] || TYPE_COLORS.default
  const icon = TYPE_ICONS[toast.options.type]

  const expandedContent =
    typeof toast.options.expandedContent === 'function'
      ? (toast.options.expandedContent as ExpandedContentRenderer)({
          dismiss: runDismissAnimation,
        })
      : toast.options.expandedContent

  const stackOffset = getStackOffset()
  const stackScale = getStackScale()

  const mountedOffset = animationState.mounted ? stackOffset : toast.options.position === 'top' ? -100 : 100
  const mountedScale = animationState.mounted ? stackScale : 0.9

  const exitOffset = 20
  const translateY = animationState.exiting ? exitOffset : mountedOffset
  const scale = animationState.exiting ? 0.95 : mountedScale
  const opacity = animationState.exiting ? 0 : animationState.mounted ? 1 : 0
  const transition =
    animationState.exiting || animationState.entering ? TRANSITION : 'opacity 220ms ease'

  return (
    <div
      style={{
        width: '90%',
        borderRadius: 100,
        color: '#fff',
        backgroundColor,
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.24)',
        transform: `translate3d(-50%, ${translateY}px, 0) scale(${scale})`,
        opacity,
        transition,
        position: 'absolute',
        top: toast.options.position === 'top' ? 80 : undefined,
        bottom: toast.options.position === 'bottom' ? 0 : undefined,
        left: '50%',
        maxWidth: 400,
        pointerEvents: 'auto',
        zIndex: 1000 - index,
        overflow: 'hidden',
        willChange: 'transform, opacity',
        ...toast.options.style,
      }}
    >
      <div
        role={hasExpandedContent ? 'button' : undefined}
        tabIndex={hasExpandedContent ? 0 : -1}
        onClick={handleToggleExpanded}
        onKeyDown={(event) => {
          if (!hasExpandedContent) {
            return
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleToggleExpanded()
          }
        }}
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: '16px',
          display: 'flex',
          alignItems: 'center',
          cursor: hasExpandedContent ? 'pointer' : 'default',
        }}
      >
        {icon ? (
          <span
            aria-hidden
            style={{
              color: '#fff',
              fontSize: 20,
              width: 20,
              marginRight: 12,
              textAlign: 'center',
              fontWeight: 700,
            }}
          >
            {icon}
          </span>
        ) : null}

        <span
          style={{
            flex: 1,
            fontSize: 16,
            lineHeight: '20px',
            fontWeight: 500,
            textAlign: 'left',
          }}
        >
          {typeof toast.content === 'string' ? toast.content : null}
        </span>
        {typeof toast.content === 'string' ? null : <div style={{ flex: 1 }}>{toast.content}</div>}

        {toast.options.action ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toast.options.action?.onPress()
              runDismissAnimation()
            }}
            style={{
              border: 0,
              borderRadius: 6,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              marginLeft: 12,
              cursor: 'pointer',
            }}
          >
            {toast.options.action.label}
          </button>
        ) : null}
      </div>

      <div
        style={{
          maxHeight: isExpanded && expandedContent ? 300 : 0,
          opacity: isExpanded && expandedContent ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 260ms ease, opacity 220ms ease',
          padding: isExpanded && expandedContent ? '0 16px 12px 16px' : '0 16px 0 16px',
          fontSize: 13,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.92)',
        }}
      >
        {isExpanded && expandedContent ? expandedContent : null}
      </div>
    </div>
  )
}

export function ToastViewport() {
  const { toasts } = useToast()

  if (typeof document === 'undefined') {
    return null
  }

  const topToasts = toasts.filter((toast) => toast.options.position === 'top')
  const bottomToasts = toasts.filter((toast) => toast.options.position === 'bottom')

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: 0,
          height: 200,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          paddingInline: 16,
          pointerEvents: 'none',
        }}
      >
        {topToasts.map((toast, arrayIndex) => {
          const displayIndex = topToasts.length - 1 - arrayIndex
          return <ToastCard key={toast.id} toast={toast} index={displayIndex} />
        })}
      </div>
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: 200,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingInline: 16,
          pointerEvents: 'none',
        }}
      >
        {bottomToasts.map((toast, arrayIndex) => {
          const displayIndex = bottomToasts.length - 1 - arrayIndex
          return <ToastCard key={toast.id} toast={toast} index={displayIndex} />
        })}
      </div>
    </>,
    document.body,
  )
}

type ToastRef = {
  show?: (content: React.ReactNode | string, options?: ToastOptions) => string
  update?: (id: string, content: React.ReactNode | string, options?: ToastOptions) => void
  dismiss?: (id: string) => void
  dismissAll?: () => void
}

const toastRef: ToastRef = {}

const ToastController: React.FC = () => {
  const toast = useToast()

  React.useEffect(() => {
    toastRef.show = toast.show
    toastRef.update = toast.update
    toastRef.dismiss = toast.dismiss
    toastRef.dismissAll = toast.dismissAll

    return () => {
      toastRef.show = undefined
      toastRef.update = undefined
      toastRef.dismiss = undefined
      toastRef.dismissAll = undefined
    }
  }, [toast.dismiss, toast.dismissAll, toast.show, toast.update])

  return null
}

export const ToastProviderWithViewport: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ToastProvider>
      <ToastController />
      {children}
      <ToastViewport />
    </ToastProvider>
  )
}

export const Toast = {
  show: (content: React.ReactNode | string, options?: ToastOptions): string => {
    if (!toastRef.show) {
      console.error(
        'Toast Provider 未初始化，请确认应用已包裹 ToastProviderWithViewport。',
      )
      return ''
    }

    return toastRef.show(content, options)
  },
  update: (id: string, content: React.ReactNode | string, options?: ToastOptions): void => {
    if (!toastRef.update) {
      console.error(
        'Toast Provider 未初始化，请确认应用已包裹 ToastProviderWithViewport。',
      )
      return
    }

    toastRef.update(id, content, options)
  },
  dismiss: (id: string): void => {
    if (!toastRef.dismiss) {
      console.error(
        'Toast Provider 未初始化，请确认应用已包裹 ToastProviderWithViewport。',
      )
      return
    }

    toastRef.dismiss(id)
  },
  dismissAll: (): void => {
    if (!toastRef.dismissAll) {
      console.error(
        'Toast Provider 未初始化，请确认应用已包裹 ToastProviderWithViewport。',
      )
      return
    }

    toastRef.dismissAll()
  },
}
