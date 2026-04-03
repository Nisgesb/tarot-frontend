import { useMemo, useState, type CSSProperties } from 'react'
import { DEFAULT_STACKED_CARDS } from './data'
import styles from './ServicesStackedCardsTap.module.css'
import type { ServicesStackedCardItem, ServicesStackedCardsProps } from './types'

const TOP_STACK_STEP = 16
const BOTTOM_STACK_STEP = 18
const ACTIVE_TOP_BASE = 34
const ACTIVE_BOTTOM_BASE = 96
const MAX_STACK_OFFSET = 3

type TapCardStyle = CSSProperties & {
  '--card-color': string
  '--tab-left': string
  '--tab-width': string
}

function buildCardStyle(
  card: ServicesStackedCardItem,
  index: number,
  total: number,
): TapCardStyle {
  return {
    '--card-color': card.color,
    '--tab-left': `${(index / total) * 100}%`,
    '--tab-width': `${100 / total}%`,
  }
}

export function ServicesStackedCardsTap({
  cards = DEFAULT_STACKED_CARDS,
  className,
  ariaLabel = 'Services stacked cards',
}: ServicesStackedCardsProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const total = Math.max(cards.length, 1)
  const beforeCount = activeIndex
  const afterCount = Math.max(cards.length - activeIndex - 1, 0)
  const activeTop = ACTIVE_TOP_BASE + Math.min(beforeCount, MAX_STACK_OFFSET) * TOP_STACK_STEP
  const activeBottom =
    ACTIVE_BOTTOM_BASE + Math.min(afterCount, MAX_STACK_OFFSET) * BOTTOM_STACK_STEP
  const rootClassName = className ? `${styles.root} ${className}` : styles.root
  const orderedCards = useMemo(() => cards.map((card, index) => ({ card, index })), [cards])

  return (
    <section className={rootClassName} aria-label={ariaLabel}>
      <div className={styles.stage}>
        {orderedCards.map(({ card, index }) => {
          const cardStyle = buildCardStyle(card, index, total)

          if (index === activeIndex) {
            return (
              <button
                key={card.id}
                type="button"
                className={`${styles.card} ${styles.cardActive}`}
                style={{
                  ...cardStyle,
                  top: `${activeTop}px`,
                  bottom: `${activeBottom}px`,
                  zIndex: 40,
                }}
                onClick={() => setActiveIndex(index)}
                aria-pressed="true"
                aria-current="true"
              >
                <span className={styles.tabLabel}>
                  <span>{card.tabLabel}</span>
                  <span>{card.tabIndex}</span>
                </span>

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
                    <img
                      className={styles.image}
                      src={card.image}
                      alt={card.imageAlt}
                      loading="lazy"
                    />
                    <div className={styles.imageGlow} />
                  </div>
                </div>
              </button>
            )
          }

          if (index < activeIndex) {
            return (
              <button
                key={card.id}
                type="button"
                className={`${styles.card} ${styles.cardCollapsed} ${styles.cardBefore}`}
                style={{
                  ...cardStyle,
                  top: `${index * TOP_STACK_STEP}px`,
                  zIndex: 10 + index,
                }}
                onClick={() => setActiveIndex(index)}
                aria-pressed="false"
              >
                <span className={styles.tabLabel}>
                  <span>{card.tabLabel}</span>
                  <span>{card.tabIndex}</span>
                </span>
                <span className={styles.collapsedBody} aria-hidden />
              </button>
            )
          }

          const afterIndex = index - activeIndex - 1
          const stackBottom = (afterCount - afterIndex - 1) * BOTTOM_STACK_STEP

          return (
            <button
              key={card.id}
              type="button"
              className={`${styles.card} ${styles.cardCollapsed} ${styles.cardAfter}`}
              style={{
                ...cardStyle,
                bottom: `${stackBottom}px`,
                zIndex: 10 + (afterCount - afterIndex),
              }}
              onClick={() => setActiveIndex(index)}
              aria-pressed="false"
            >
              <span className={styles.tabLabel}>
                <span>{card.tabLabel}</span>
                <span>{card.tabIndex}</span>
              </span>
              <span className={styles.collapsedBody} aria-hidden />
            </button>
          )
        })}
      </div>
    </section>
  )
}
