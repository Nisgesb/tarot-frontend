import type { TodayMoodEntry } from './galleryMockData'
import styles from './GalleryScene.module.css'

interface GalleryTodayMoodProps {
  entries: TodayMoodEntry[]
}

export function GalleryTodayMood({
  entries,
}: GalleryTodayMoodProps) {
  return (
    <section className={styles.todayMoodCard} aria-label="今日灵感">
      <div className={styles.todayMoodGlow} aria-hidden />
      <header className={styles.todayMoodHeader}>
        <p>今日灵感</p>
        <span className={styles.todayMoodMoon} aria-hidden>◐</span>
      </header>
      <h2>把想问的问题放在今晚 21:00 前，月相更容易回应你。</h2>
      <div className={styles.todayMoodGrid}>
        {entries.map((entry) => (
          <button key={entry.id} type="button" className={styles.todayMoodEntry}>
            <span className={styles.todayMoodDot} aria-hidden />
            <span>{entry.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
