import type { CSSProperties } from 'react'
import type { GalleryFeedCard } from './galleryMockData'
import styles from './GalleryScene.module.css'

interface GalleryCardProps {
  card: GalleryFeedCard
  index: number
}

export function GalleryCard({
  card,
  index,
}: GalleryCardProps) {
  return (
    <article
      className={styles.feedCard}
      style={{ '--card-index': index } as CSSProperties}
      aria-label={`${card.streamLabel} - ${card.title}`}
    >
      <div className={[styles.feedCover, styles[`feedCover${card.coverTone[0].toUpperCase()}${card.coverTone.slice(1)}`]].join(' ')}>
        <span className={styles.feedPhaseTag}>{card.moonPhase}</span>
      </div>
      <div className={styles.feedBody}>
        <header className={styles.feedMeta}>
          <div>
            <p className={styles.feedStream}>{card.streamLabel}</p>
            <h3>{card.author}</h3>
            <p className={styles.feedRole}>{card.role}</p>
          </div>
          <span>{card.timeAgo}</span>
        </header>
        <h4>{card.title}</h4>
        <p className={styles.feedExcerpt}>{card.excerpt}</p>
        <div className={styles.feedTopic}>#{card.topic}</div>
        <footer className={styles.feedActions} aria-label="互动操作">
          <span>♡ {card.stats.likes}</span>
          <span>✦ {card.stats.saves}</span>
          <span>◌ {card.stats.comments}</span>
        </footer>
      </div>
    </article>
  )
}
