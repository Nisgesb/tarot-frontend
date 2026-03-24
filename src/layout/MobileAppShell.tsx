import type { CSSProperties, ReactNode } from 'react'

interface MobileAppShellProps {
  className: string
  keyboardOffset: number
  children: ReactNode
  style?: CSSProperties
}

export function MobileAppShell({
  className,
  keyboardOffset,
  children,
  style,
}: MobileAppShellProps) {
  return (
    <main
      className={`mobile-app-shell ${className}`}
      style={{
        ...style,
        '--keyboard-offset': `${Math.max(0, keyboardOffset)}px`,
      } as CSSProperties}
    >
      {children}
    </main>
  )
}
