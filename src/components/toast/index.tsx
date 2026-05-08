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

function resolveToastOptions(
  current: ToastRecord['options'] | null,
  patch?: ToastOptions,
): ToastRecord['options'] {
  return {
    duration: patch?.duration ?? current?.duration ?? DEFAULT_TOAST_OPTIONS.duration,
    type: patch?.type ?? current?.type ?? DEFAULT_TOAST_OPTIONS.type,
    position: patch?.position ?? current?.position ?? DEFAULT_TOAST_OPTIONS.position,
    backgroundColor:
      patch?.backgroundColor ?? current?.backgroundColor ?? DEFAULT_TOAST_OPTIONS.backgroundColor,
    onClose: patch?.onClose ?? current?.onClose ?? DEFAULT_TOAST_OPTIONS.onClose,
    action: patch?.action ?? current?.action ?? DEFAULT_TOAST_OPTIONS.action,
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
    throw new Error('useToast must be used within a ToastProvider')
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
      setToasts((previous) => [
        ...previous,
        {
          id,
          content,
          options: resolveToastOptions(null, options),
        },
      ])
      return id
    },
    [],
  )

  const update = React.useCallback(
    (id: string, content: React.ReactNode | string, options?: ToastOptions) => {
      setToasts((previous) =>
        previous.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                content,
                options: resolveToastOptions(toast.options, options),
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

  React.useEffect(() => {
    if (toasts.length === 0) {
      return
    }

    const timers = toasts
      .filter((toast) => toast.options.duration > 0)
      .map((toast) =>
        window.setTimeout(() => {
          dismiss(toast.id)
          toast.options.onClose?.()
        }, toast.options.duration),
      )

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId))
    }
  }, [dismiss, toasts])

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

function ToastCard({ toast, index }: { toast: ToastRecord; index: number }) {
  const { dismiss, expandedToasts, expandToast, collapseToast } = useToast()
  const isExpanded = expandedToasts.has(toast.id)
  const hasExpandedContent = Boolean(toast.options.expandedContent)

  const handleDismiss = React.useCallback(() => {
    dismiss(toast.id)
    toast.options.onClose?.()
  }, [dismiss, toast.id, toast.options])

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
  const stackOffset = Math.min(index * 8, 16)
  const stackScale = Math.max(1 - index * 0.03, 0.91)

  const expandedContent =
    typeof toast.options.expandedContent === 'function'
      ? (toast.options.expandedContent as ExpandedContentRenderer)({ dismiss: handleDismiss })
      : toast.options.expandedContent

  return (
    <div
      style={{
        width: 'min(92vw, 420px)',
        borderRadius: 14,
        color: '#fff',
        backgroundColor,
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.24)',
        transform: `translateY(${stackOffset}px) scale(${stackScale})`,
        transition: 'transform 220ms ease, opacity 220ms ease',
        pointerEvents: 'auto',
        zIndex: 1000 - index,
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
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: hasExpandedContent ? 'pointer' : 'default',
        }}
      >
        {icon ? (
          <span
            aria-hidden
            style={{
              width: 20,
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
            fontSize: 14,
            lineHeight: 1.4,
            fontWeight: 500,
            textAlign: 'left',
          }}
        >
          {toast.content}
        </span>
        {toast.options.action ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              toast.options.action?.onPress()
              handleDismiss()
            }}
            style={{
              border: 0,
              borderRadius: 8,
              padding: '6px 10px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {toast.options.action.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            handleDismiss()
          }}
          aria-label="Dismiss toast"
          style={{
            border: 0,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.2)',
            color: '#fff',
            fontSize: 12,
            lineHeight: '20px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      {isExpanded && expandedContent ? (
        <div
          style={{
            padding: '0 14px 12px 14px',
            fontSize: 13,
            lineHeight: 1.45,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          {expandedContent}
        </div>
      ) : null}
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
          insetInline: 0,
          top: 10,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 8,
          paddingInline: 12,
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
          insetInline: 0,
          bottom: 12,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 8,
          paddingInline: 12,
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

  toastRef.show = toast.show
  toastRef.update = toast.update
  toastRef.dismiss = toast.dismiss
  toastRef.dismissAll = toast.dismissAll

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
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      )
      return ''
    }

    return toastRef.show(content, options)
  },
  update: (id: string, content: React.ReactNode | string, options?: ToastOptions): void => {
    if (!toastRef.update) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      )
      return
    }

    toastRef.update(id, content, options)
  },
  dismiss: (id: string): void => {
    if (!toastRef.dismiss) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      )
      return
    }

    toastRef.dismiss(id)
  },
  dismissAll: (): void => {
    if (!toastRef.dismissAll) {
      console.error(
        'Toast provider not initialized. Make sure you have wrapped your app with ToastProviderWithViewport.',
      )
      return
    }

    toastRef.dismissAll()
  },
}
