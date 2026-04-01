import { useRef, type CSSProperties } from 'react'
import { DEFAULT_STACKED_CARDS } from './data'
import styles from './ServicesStackedCards.module.css'
import { useStackedCardsProgress } from './useStackedCardsProgress'
import type { ServicesStackedCardItem, ServicesStackedCardsProps } from './types'

const MOBILE_BREAKPOINT = 768
const DESKTOP_BREAKPOINT = 1280
const DESKTOP_STICKY_TOP = 94
const TABLET_STICKY_TOP = 82
const MOBILE_STICKY_TOP = 64
const DESKTOP_ENTER_OFFSET_VH = 62
const TABLET_ENTER_OFFSET_VH = 58
const MOBILE_ENTER_OFFSET_VH = 54
const SCROLL_SEGMENT = 1 / 3
const SEGMENT_MOTION_RATIO = 0.82

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const easeOutCubic = (value: number) => 1 - (1 - value) ** 3

type CardStyle = CSSProperties & {
  '--card-color': string
  '--tab-left': string
  '--tab-width': string
}

type CardShellProps = {
  card: ServicesStackedCardItem
  index: number
  total: number
  translateY: number
  zIndex: number
}

function CardShell({ card, index, total, translateY, zIndex }: CardShellProps) {
  const cardStyle: CardStyle = {
    '--card-color': card.color,
    '--tab-left': `${(index / total) * 100}%`,
    '--tab-width': `${100 / total}%`,
    transform: `translate3d(0, ${translateY}px, 0)`,
    zIndex,
  }

  return (
    <article className={`${styles.card} ${styles.stackCard}`} style={cardStyle}>
      <header className={styles.tabLabel} aria-hidden="true">
        <span>{card.tabLabel}</span>
        <span>{card.tabIndex}</span>
      </header>

      <div className={styles.body}>
        <div className={styles.copyColumn}>
          <h2 className={styles.title}>{card.title}</h2>
          <p className={styles.description}>{card.description}</p>

          <div className={styles.metricWrap}>
            <p className={styles.metricValue}>{card.metric}</p>
            <p className={styles.metricLabel}>{card.metricLabel}</p>
          </div>
        </div>

        <div className={styles.mediaWrap}>
          <img className={styles.image} src={card.image} alt={card.imageAlt} loading="lazy" />
          <div className={styles.imageGlow} />
        </div>
      </div>
    </article>
  )
}

/**
 * Sticky stacked cards with folder-tab layering.
 * Designed to keep the same stacked illusion across phone/tablet/desktop.
 */
export function ServicesStackedCards({
  cards = DEFAULT_STACKED_CARDS,
  className,
  ariaLabel = 'Services stacked cards',
  scrollContainer,
}: ServicesStackedCardsProps) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const viewportWidth =
    typeof window === 'undefined' ? DESKTOP_BREAKPOINT : window.innerWidth
  const stickyTop =
    viewportWidth >= DESKTOP_BREAKPOINT
      ? DESKTOP_STICKY_TOP
      : viewportWidth >= MOBILE_BREAKPOINT
        ? TABLET_STICKY_TOP
        : MOBILE_STICKY_TOP

  const { progress, viewport } = useStackedCardsProgress({
    sectionRef,
    stageRef,
    stickyTop,
    enabled: true,
    scrollContainer,
  })

  const isMobile = viewport.width < MOBILE_BREAKPOINT
  const isTablet = viewport.width >= MOBILE_BREAKPOINT && viewport.width < DESKTOP_BREAKPOINT
  const enterOffsetPx =
    ((isMobile ? MOBILE_ENTER_OFFSET_VH : isTablet ? TABLET_ENTER_OFFSET_VH : DESKTOP_ENTER_OFFSET_VH) /
      100) *
    viewport.height
  const rootClassName = className ? `${styles.root} ${className}` : styles.root

  return (
    <section ref={sectionRef} className={rootClassName} aria-label={ariaLabel}>
      <div className={styles.desktopSection}>
        <div ref={stageRef} className={styles.stickyStage}>
          <div className={styles.stageFrame}>
            {cards.map((card, index) => {
              if (index === 0) {
                return (
                  <CardShell
                    key={card.id}
                    card={card}
                    index={index}
                    total={cards.length}
                    translateY={0}
                    zIndex={index + 1}
                  />
                )
              }

              // Each card owns one vertical scroll segment and slides upward
              // to create the folder-tab stacking illusion.
              const segmentStart = SCROLL_SEGMENT * (index - 1)
              const segmentEnd = segmentStart + SCROLL_SEGMENT * SEGMENT_MOTION_RATIO
              const localProgress = clamp((progress - segmentStart) / (segmentEnd - segmentStart))
              const translateY = (1 - easeOutCubic(localProgress)) * enterOffsetPx

              return (
                <CardShell
                  key={card.id}
                  card={card}
                  index={index}
                  total={cards.length}
                  translateY={translateY}
                  zIndex={index + 1}
                />
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
