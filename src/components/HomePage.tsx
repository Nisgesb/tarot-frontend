import {
  HOME_FEATURE_CARDS,
  HOME_HERO_TITLE,
  HOME_INFO_SECTIONS,
  type HomeFeatureCard,
  type HomeInfoRow,
} from '../data/homePageContent'
import styles from './HomePage.module.css'

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M10.44 2.92a1 1 0 0 1 1.12 0l1.36.94a2 2 0 0 0 1.68.24l1.6-.42a1 1 0 0 1 1.06.44l1.02 1.64a1 1 0 0 1-.08 1.14l-.98 1.2a2 2 0 0 0-.43 1.63l.23 1.62a2 2 0 0 0 .96 1.4l1.4.84a1 1 0 0 1 .48 1.02l-.4 1.9a1 1 0 0 1-.8.76l-1.7.28a2 2 0 0 0-1.4.94l-.94 1.37a1 1 0 0 1-1 .42l-1.78-.2a2 2 0 0 0-1.56.44l-1.28.98a1 1 0 0 1-1.1.04l-1.66-.94a1 1 0 0 1-.48-.98l.12-1.7a2 2 0 0 0-.5-1.55l-1.08-1.22a1 1 0 0 1-.16-1.14l.76-1.72a2 2 0 0 0 .04-1.63l-.62-1.56a1 1 0 0 1 .28-1.12L5.8 4.2a1 1 0 0 1 1.14-.08l1.4.82a2 2 0 0 0 1.64.18z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <circle cx="5" cy="12" r="1.8" fill="currentColor" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      <circle cx="19" cy="12" r="1.8" fill="currentColor" />
    </svg>
  )
}

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M7.5 3.5 8.7 7l3.5 1.2-3.5 1.2-1.2 3.5-1.2-3.5L3 8.2 6.3 7zM16 7l.9 2.5L19.4 10l-2.5.5L16 13l-.9-2.5-2.5-.5 2.5-.5zM15.3 14.1l1.5 4.2 4.2 1.5-4.2 1.5-1.5 4.2-1.5-4.2-4.2-1.5 4.2-1.5z"
        fill="currentColor"
      />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M9 4.5h6a1 1 0 0 1 1 1V7h1.3a1.7 1.7 0 0 1 1.7 1.7v10.6a1.7 1.7 0 0 1-1.7 1.7H6.7A1.7 1.7 0 0 1 5 19.3V8.7A1.7 1.7 0 0 1 6.7 7H8V5.5a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <rect x="9" y="3" width="6" height="3.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.5 11.2h7M8.5 15h5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function LeafBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path
        d="M12 3.5c4.8 2 7.2 5 7.2 8.7 0 4.3-3.2 7.3-7.4 7.3-4.1 0-7-2.8-7-6.7C4.8 8.7 7.7 5.4 12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M12 7.2c0 5.2-1.8 8.6-4.9 11.1M12 12.4c1.5-.4 3-.5 5.1-.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function WaterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M2.5 7.5c2.1 1.3 4.2 1.3 6.3 0 2.1-1.3 4.2-1.3 6.3 0 2.1 1.3 4.2 1.3 6.4 0M2.5 12c2.1 1.3 4.2 1.3 6.3 0 2.1-1.3 4.2-1.3 6.3 0 2.1 1.3 4.2 1.3 6.4 0M2.5 16.5c2.1 1.3 4.2 1.3 6.3 0 2.1-1.3 4.2-1.3 6.3 0 2.1 1.3 4.2 1.3 6.4 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function LeafIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M19.5 4.5c-7 .4-12 4.5-12 10.5 0 3 2 4.5 4.3 4.5 5.6 0 9.9-5.4 7.7-15Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.5 18.5c2.5-3.8 5.7-6.8 9.5-9.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M4 10.4 12 4l8 6.4v8.1a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.5 20v-5.8h5V20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PawIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <ellipse cx="7.5" cy="8" rx="1.8" ry="2.6" fill="currentColor" />
      <ellipse cx="12" cy="6.6" rx="1.8" ry="2.6" fill="currentColor" />
      <ellipse cx="16.5" cy="8" rx="1.8" ry="2.6" fill="currentColor" />
      <path d="M12 12.4c-3 0-5.3 2.1-5.3 4.6 0 2.1 1.6 3.5 3.4 3.5 1 0 1.5-.3 1.9-.7.4-.4.8-.7 1.5-.7s1.1.3 1.5.7c.4.4.9.7 1.9.7 1.8 0 3.4-1.4 3.4-3.5 0-2.5-2.3-4.6-5.3-4.6z" fill="currentColor" />
    </svg>
  )
}

function iconForFeature(icon: HomeFeatureCard['icon']) {
  switch (icon) {
    case 'sparkles':
      return <SparklesIcon />
    case 'clipboard':
      return <ClipboardIcon />
    case 'leaf-badge':
      return <LeafBadgeIcon />
  }
}

function iconForRow(icon: HomeInfoRow['icon']) {
  switch (icon) {
    case 'water':
      return <WaterIcon />
    case 'leaf':
      return <LeafIcon />
    case 'sun':
      return <SunIcon />
    case 'home':
      return <HomeIcon />
    case 'paw':
      return <PawIcon />
  }
}

function HeroMediaVideo() {
  return (
    <video
      className={styles.heroMediaVideo}
      src="/media/home-hero-video.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden
    />
  )
}

interface HomePageProps {
  embedded?: boolean
  onOpenLiveReadingDebug?: () => void
}

export function HomePage({ embedded = false, onOpenLiveReadingDebug }: HomePageProps) {
  const pageClassName = ['shared-home-surface', styles.page, embedded ? styles.pageEmbedded : '']
    .filter(Boolean)
    .join(' ')

  return (
    <main className={pageClassName}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <button type="button" className={styles.iconButton} aria-label="Open settings">
            <SettingsIcon />
          </button>
          {onOpenLiveReadingDebug ? (
            <button
              type="button"
              className={styles.liveReadingDebugButton}
              onClick={onOpenLiveReadingDebug}
            >
              真人连线调试入口
            </button>
          ) : null}
          <button
            type="button"
            className={`${styles.iconButton} ${styles.iconButtonSecondary}`}
            aria-label="More options"
          >
            <MoreIcon />
          </button>
        </header>

        <section className={styles.hero}>
          <h1 className={styles.heroTitle}>
            {HOME_HERO_TITLE.map((line) => (
              <span key={line} className={styles.heroTitleLine}>
                {line}
              </span>
            ))}
          </h1>

          <div className={styles.heroMedia}>
            <HeroMediaVideo />
            <div className={styles.heroMediaGlow} />
            <div className={styles.heroMediaOverlay} />
          </div>
        </section>

        <section className={styles.featureRail} aria-label="Plant highlights">
          {HOME_FEATURE_CARDS.map((card) => (
            <article key={card.id} className={styles.featureCard}>
              <div className={styles.featureIcon}>{iconForFeature(card.icon)}</div>
              <h2 className={styles.featureTitle}>{card.title}</h2>
              <p className={styles.featureDescription}>{card.description}</p>
            </article>
          ))}
        </section>

        {HOME_INFO_SECTIONS.map((section) => (
          <section key={section.id} className={styles.section} aria-labelledby={`section-${section.id}`}>
            <h2 id={`section-${section.id}`} className={styles.sectionTitle}>
              {section.title}
            </h2>

            <div className={styles.rowList}>
              {section.rows.map((row) => (
                <div key={row.id} className={styles.row}>
                  <div className={styles.rowIconWrap}>
                    <div className={styles.rowIcon}>{iconForRow(row.icon)}</div>
                  </div>
                  <div className={styles.rowText}>{row.label}</div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className={styles.pageBottomSpacer} aria-hidden />
      </div>
    </main>
  )
}

export default HomePage
