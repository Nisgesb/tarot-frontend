import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './PrimaryBottomNav.module.css'

export type PrimaryBottomNavTab = 'my' | 'home' | 'circle'

interface PrimaryBottomNavProps {
  activeTab: PrimaryBottomNavTab
  onGoMy: () => void
  onGoHome: () => void
  onGoCircle: () => void
}

interface CurveGeometry {
  path: string
  totalWidth: number
}

interface TabConfig {
  id: PrimaryBottomNavTab
  label: string
  onPress: () => void
}

const TAB_COUNT = 3
const CURVE_HEIGHT = 60
const CURVE_REFERENCE_WIDTH = 394
const CURVE_REFERENCE_HEIGHT = 86
const FLOATING_RISE = 16

function processGradient(colors?: string[]) {
  if (!colors || colors.length === 0) {
    return ['#6366f1', '#8b5cf6'] as const
  }

  if (colors.length === 1) {
    return [colors[0], colors[0]] as const
  }

  return [colors[0], colors[1]] as const
}

function calculateTabPosition(index: number, totalTabs: number, viewportWidth: number): number {
  const tabWidth = viewportWidth / totalTabs
  const tabCenter = index * tabWidth + tabWidth / 2
  const screenCenter = viewportWidth / 2

  return -viewportWidth + (tabCenter - screenCenter)
}

function buildCurveGeometry(viewportWidth: number, height: number): CurveGeometry {
  const totalWidth = viewportWidth * 3
  const centerOffset = viewportWidth
  const curveWidth = viewportWidth

  const leftEdge = (133 / CURVE_REFERENCE_WIDTH) * curveWidth
  const rightEdge = (258 / CURVE_REFERENCE_WIDTH) * curveWidth
  const center = (197 / CURVE_REFERENCE_WIDTH) * curveWidth
  const notchHeight = (43.5 / CURVE_REFERENCE_HEIGHT) * height
  const leftControl1 = (159.724 / CURVE_REFERENCE_WIDTH) * curveWidth
  const leftControl2 = (172.684 / CURVE_REFERENCE_WIDTH) * curveWidth
  const rightControl1 = (220.932 / CURVE_REFERENCE_WIDTH) * curveWidth
  const rightControl2 = (235.992 / CURVE_REFERENCE_WIDTH) * curveWidth

  const path = `
    M0 0
    L${centerOffset} 0
    C${centerOffset} 0 ${centerOffset + leftEdge * 0.8} 0 ${centerOffset + leftEdge} 0
    C${centerOffset + leftControl1} 0 ${centerOffset + leftControl2} ${notchHeight} ${centerOffset + center} ${notchHeight}
    C${centerOffset + rightControl1} ${notchHeight * 0.99} ${centerOffset + rightControl2} 0 ${centerOffset + rightEdge} 0
    C${centerOffset + rightEdge + (curveWidth - rightEdge) * 0.1} 0 ${centerOffset + curveWidth} 0 ${centerOffset + curveWidth} 0
    L${totalWidth} 0
    V${height}
    H0
    Z
  `

  return {
    path,
    totalWidth,
  }
}

export function PrimaryBottomNav({
  activeTab,
  onGoMy,
  onGoHome,
  onGoCircle,
}: PrimaryBottomNavProps) {
  const activeIndex = activeTab === 'my' ? 0 : activeTab === 'home' ? 1 : 2
  const shellRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(360)
  const gradientId = `primary-nav-gradient-${useId().replaceAll(':', '-')}`
  const gradient = processGradient(['#f5f6f8', '#f5f6f8'])

  const tabs = useMemo<TabConfig[]>(
    () => [
      { id: 'my', label: '我的', onPress: onGoMy },
      { id: 'home', label: '首页', onPress: onGoHome },
      { id: 'circle', label: '圈子', onPress: onGoCircle },
    ],
    [onGoCircle, onGoHome, onGoMy],
  )

  useEffect(() => {
    const shell = shellRef.current

    if (!shell) {
      return
    }

    const updateWidth = () => {
      const rect = shell.getBoundingClientRect()
      setViewportWidth(Math.max(1, Math.ceil(rect.width)))
    }

    updateWidth()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)

      return () => {
        window.removeEventListener('resize', updateWidth)
      }
    }

    const observer = new ResizeObserver(() => {
      updateWidth()
    })

    observer.observe(shell)

    return () => {
      observer.disconnect()
    }
  }, [])

  const curveTranslateX = useMemo(
    () => Math.round(calculateTabPosition(activeIndex, TAB_COUNT, viewportWidth)),
    [activeIndex, viewportWidth],
  )
  const curveGeometry = useMemo(
    () => buildCurveGeometry(viewportWidth, CURVE_HEIGHT),
    [viewportWidth],
  )

  return (
    <nav className={styles.root} aria-label="Primary navigation">
      <div ref={shellRef} className={styles.shellWrap}>
        <div className={styles.backgroundContainer} aria-hidden>
          <div className={styles.curveViewport}>
            <svg
              className={styles.curveSvg}
              width={curveGeometry.totalWidth}
              height={CURVE_HEIGHT}
              viewBox={`0 0 ${curveGeometry.totalWidth} ${CURVE_HEIGHT}`}
              preserveAspectRatio="none"
              fill="none"
              style={{
                transform: `translate3d(${curveTranslateX}px, 0, 0)`,
              }}
            >
              <defs>
                <linearGradient
                  id={gradientId}
                  x1="0"
                  y1={(CURVE_HEIGHT * 0.8).toString()}
                  x2={curveGeometry.totalWidth.toString()}
                  y2={(CURVE_HEIGHT * 0.8).toString()}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="5.76923%" stopColor={gradient[0]} />
                  <stop offset="90.3846%" stopColor={gradient[1]} />
                </linearGradient>
              </defs>
              <path d={curveGeometry.path} fill={`url(#${gradientId})`} shapeRendering="geometricPrecision" />
            </svg>
          </div>
        </div>

        {tabs.map((tab, index) => {
          const isActive = index === activeIndex

          return (
            <div
              key={tab.id}
              className={styles.tabWrapper}
              style={{
                transform: `translate3d(0, ${isActive ? -FLOATING_RISE : 0}px, 0)`,
              }}
            >
              <button
                type="button"
                className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ''}`}
                onClick={tab.onPress}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={styles.tabInner}>
                  {isActive ? (
                    <span className={styles.floatingButton}>
                      <span className={styles.floatingButtonLabel}>{tab.label}</span>
                    </span>
                  ) : (
                    <span className={styles.tabLabel}>{tab.label}</span>
                  )}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
