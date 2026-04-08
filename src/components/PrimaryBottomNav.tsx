import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import styles from './PrimaryBottomNav.module.css'

export type PrimaryBottomNavTab = 'my' | 'home' | 'circle'

interface PrimaryBottomNavProps {
  activeTab: PrimaryBottomNavTab
  onGoMy: () => void
  onGoHome: () => void
  onGoCircle: () => void
}

type SnapMode = 'idle' | 'click' | 'drag'

const TAB_ORDER: PrimaryBottomNavTab[] = ['my', 'home', 'circle']
const DRAG_THRESHOLD_PX = 6
const CLICK_SETTLE_MS = 220
const DRAG_SETTLE_MS = 320

function clampProgress(value: number) {
  return Math.max(0, Math.min(2, value))
}

export function PrimaryBottomNav({
  activeTab,
  onGoMy,
  onGoHome,
  onGoCircle,
}: PrimaryBottomNavProps) {
  const activeIndex = activeTab === 'my' ? 0 : activeTab === 'home' ? 1 : 2
  const shellRef = useRef<HTMLDivElement>(null)
  const clearSnapTimerRef = useRef<number | null>(null)
  const dragRef = useRef({
    pointerId: -1,
    originX: 0,
    startProgress: activeIndex,
    lastX: 0,
    lastTime: 0,
    velocityPxPerMs: 0,
    dragging: false,
  })
  const clickSuppressedRef = useRef(false)
  const [progress, setProgress] = useState(activeIndex)
  const [visualIndex, setVisualIndex] = useState(activeIndex)
  const [snapMode, setSnapMode] = useState<SnapMode>('idle')
  const [isDragging, setIsDragging] = useState(false)

  const tabActions = useMemo(
    () => ({
      my: onGoMy,
      home: onGoHome,
      circle: onGoCircle,
    }),
    [onGoCircle, onGoHome, onGoMy],
  )

  const clearSnapModeLater = (delay: number) => {
    if (clearSnapTimerRef.current !== null) {
      window.clearTimeout(clearSnapTimerRef.current)
    }

    clearSnapTimerRef.current = window.setTimeout(() => {
      setSnapMode('idle')
      clearSnapTimerRef.current = null
    }, delay)
  }

  useEffect(() => {
    if (dragRef.current.dragging) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setProgress(activeIndex)
      setVisualIndex(activeIndex)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [activeIndex])

  useEffect(() => {
    return () => {
      if (clearSnapTimerRef.current !== null) {
        window.clearTimeout(clearSnapTimerRef.current)
      }
    }
  }, [])

  const navigateToIndex = (targetIndex: number, mode: Exclude<SnapMode, 'idle'>) => {
    const clampedTarget = clampProgress(targetIndex)
    const targetTab = TAB_ORDER[clampedTarget]

    setVisualIndex(clampedTarget)
    setProgress(clampedTarget)
    setSnapMode(mode)
    clearSnapModeLater(mode === 'click' ? CLICK_SETTLE_MS : DRAG_SETTLE_MS)

    window.requestAnimationFrame(() => {
      tabActions[targetTab]()
    })
  }

  const resolveProgressFromClientX = (clientX: number) => {
    const shell = shellRef.current

    if (!shell) {
      return activeIndex
    }

    const rect = shell.getBoundingClientRect()
    const stylesMap = window.getComputedStyle(shell)
    const paddingInline =
      Number.parseFloat(stylesMap.paddingLeft) + Number.parseFloat(stylesMap.paddingRight)
    const trackWidth = Math.max(rect.width - paddingInline, 1)
    const tabWidth = trackWidth / 3
    const deltaX = clientX - dragRef.current.originX
    const rawProgress = dragRef.current.startProgress + deltaX / tabWidth

    if (rawProgress < 0) {
      return Math.max(-0.14, rawProgress * 0.18)
    }

    if (rawProgress > 2) {
      return Math.min(2.14, 2 + (rawProgress - 2) * 0.18)
    }

    return rawProgress
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    const shell = shellRef.current

    if (!shell) {
      return
    }

    shell.setPointerCapture(event.pointerId)
    setIsDragging(false)
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      startProgress: progress,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocityPxPerMs: 0,
      dragging: false,
    }
    clickSuppressedRef.current = false
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) {
      return
    }

    const deltaX = event.clientX - dragRef.current.originX
    const now = performance.now()
    const elapsed = Math.max(now - dragRef.current.lastTime, 1)
    const velocityPxPerMs = (event.clientX - dragRef.current.lastX) / elapsed

    dragRef.current.lastX = event.clientX
    dragRef.current.lastTime = now
    dragRef.current.velocityPxPerMs = velocityPxPerMs

    if (!dragRef.current.dragging && Math.abs(deltaX) > DRAG_THRESHOLD_PX) {
      dragRef.current.dragging = true
      clickSuppressedRef.current = true
      setIsDragging(true)
      setSnapMode('idle')
    }

    if (!dragRef.current.dragging) {
      return
    }

    event.preventDefault()
    setProgress(resolveProgressFromClientX(event.clientX))
    setVisualIndex(Math.round(clampProgress(resolveProgressFromClientX(event.clientX))))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) {
      return
    }

    const shell = shellRef.current

    if (shell?.hasPointerCapture(event.pointerId)) {
      shell.releasePointerCapture(event.pointerId)
    }

    if (!dragRef.current.dragging) {
      dragRef.current.pointerId = -1
      return
    }

    event.preventDefault()

    const rect = shell?.getBoundingClientRect()
    const stylesMap = shell ? window.getComputedStyle(shell) : null
    const paddingInline =
      stylesMap
        ? Number.parseFloat(stylesMap.paddingLeft) + Number.parseFloat(stylesMap.paddingRight)
        : 0
    const trackWidth = rect ? Math.max(rect.width - paddingInline, 1) : 1
    const tabWidth = trackWidth / 3
    const currentProgress = clampProgress(resolveProgressFromClientX(event.clientX))
    const projectedProgress = clampProgress(
      currentProgress + (dragRef.current.velocityPxPerMs * 190) / tabWidth,
    )
    const targetIndex = Math.round(projectedProgress)

    dragRef.current.dragging = false
    dragRef.current.pointerId = -1
    setIsDragging(false)
    navigateToIndex(targetIndex, 'drag')

    window.setTimeout(() => {
      clickSuppressedRef.current = false
    }, 40)
  }

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== dragRef.current.pointerId) {
      return
    }

    const shell = shellRef.current

    if (shell?.hasPointerCapture(event.pointerId)) {
      shell.releasePointerCapture(event.pointerId)
    }

    dragRef.current.dragging = false
    dragRef.current.pointerId = -1
    setIsDragging(false)
    setProgress(activeIndex)
    setVisualIndex(activeIndex)
    setSnapMode('drag')
    clearSnapModeLater(DRAG_SETTLE_MS)
    window.setTimeout(() => {
      clickSuppressedRef.current = false
    }, 40)
  }

  const handleClick = (targetIndex: number) => {
    if (clickSuppressedRef.current) {
      return
    }

    navigateToIndex(targetIndex, 'click')
  }

  return (
    <nav className={styles.root} aria-label="Primary navigation">
      <div
        ref={shellRef}
        className={styles.shell}
        data-snap-mode={snapMode}
        data-dragging={isDragging ? 'true' : 'false'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={
          {
            '--nav-progress': progress.toString(),
          } as CSSProperties
        }
      >
        <span className={styles.activePill} aria-hidden />
        <button
          type="button"
          className={`${styles.tab} ${visualIndex === 0 ? styles.tabCurrent : ''}`}
          aria-current={activeTab === 'my' ? 'page' : undefined}
          onClick={() => handleClick(0)}
        >
          我的
        </button>
        <button
          type="button"
          className={`${styles.tab} ${visualIndex === 1 ? styles.tabCurrent : ''}`}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={() => handleClick(1)}
        >
          首页
        </button>
        <button
          type="button"
          className={`${styles.tab} ${visualIndex === 2 ? styles.tabCurrent : ''}`}
          aria-current={activeTab === 'circle' ? 'page' : undefined}
          onClick={() => handleClick(2)}
        >
          圈子
        </button>
      </div>
    </nav>
  )
}
