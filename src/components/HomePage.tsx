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

function HeroArtwork() {
  return (
    <svg viewBox="0 0 700 780" className={styles.heroArtwork} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#93886f" />
          <stop offset="28%" stopColor="#c4bfaa" />
          <stop offset="68%" stopColor="#f2e9d2" />
          <stop offset="100%" stopColor="#dedbcf" />
        </linearGradient>
        <radialGradient id="sun" cx="76%" cy="68%" r="32%">
          <stop offset="0%" stopColor="#f7dca1" stopOpacity="0.9" />
          <stop offset="46%" stopColor="#f0c97e" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#f0c97e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="leafLight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#889f47" />
          <stop offset="45%" stopColor="#b5c85f" />
          <stop offset="100%" stopColor="#657238" />
        </linearGradient>
        <linearGradient id="leafWarm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9ba046" />
          <stop offset="55%" stopColor="#f2dc78" />
          <stop offset="100%" stopColor="#9f7e35" />
        </linearGradient>
        <filter id="blurGlow">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="softBlur">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>

      <rect width="700" height="780" fill="url(#bg)" />
      <rect x="66" y="28" width="18" height="724" rx="9" fill="#674e31" opacity="0.68" />
      <rect x="88" y="52" width="10" height="690" rx="5" fill="#9d7d55" opacity="0.62" />
      <rect x="0" y="0" width="700" height="780" fill="url(#sun)" />
      <ellipse cx="540" cy="564" rx="140" ry="92" fill="#f2c978" opacity="0.34" filter="url(#blurGlow)" />
      <ellipse cx="244" cy="558" rx="132" ry="98" fill="#e4b471" opacity="0.3" filter="url(#blurGlow)" />
      <g opacity="0.22" fill="#ffffff">
        <circle cx="522" cy="132" r="2.5" />
        <circle cx="564" cy="164" r="1.8" />
        <circle cx="604" cy="108" r="1.6" />
        <circle cx="472" cy="208" r="1.8" />
        <circle cx="584" cy="228" r="1.4" />
        <circle cx="535" cy="258" r="1.6" />
      </g>

      <g fill="none" stroke="#5c452c" strokeLinecap="round">
        <path d="M252 756C242 632 262 536 312 450" strokeWidth="7" />
        <path d="M406 756C396 632 432 560 490 492" strokeWidth="7" />
        <path d="M286 656C242 618 216 586 214 548" strokeWidth="5.5" opacity="0.8" />
      </g>

      <g transform="translate(160 180) rotate(-12 126 116)">
        <path d="M18 140C30 56 118 14 214 24c6 84-32 164-126 178-38 6-72-14-88-62Z" fill="url(#leafLight)" />
        <path d="M54 136c38-14 74-44 108-94M88 152c18-30 32-66 44-112M126 158c4-36 8-78 2-122M160 148c-8-28-16-62-18-104" stroke="#5d6b2d" strokeWidth="4.4" opacity="0.44" />
      </g>

      <g transform="translate(368 394) rotate(22 120 104)">
        <path d="M24 136C38 62 112 16 214 34c-2 90-60 164-150 174-42 4-74-16-88-72Z" fill="url(#leafWarm)" />
        <path d="M62 132c40-14 84-46 118-94M100 148c20-28 38-62 54-108M140 152c4-32 6-72 2-114M172 144c-8-30-18-64-26-102" stroke="#8d7b3b" strokeWidth="4.4" opacity="0.44" />
      </g>

      <ellipse cx="570" cy="700" rx="56" ry="20" fill="#3b3126" opacity="0.22" filter="url(#softBlur)" />
      <ellipse cx="214" cy="706" rx="42" ry="18" fill="#3b3126" opacity="0.22" filter="url(#softBlur)" />
    </svg>
  )
}

interface HomePageProps {
  embedded?: boolean
}

export function HomePage({ embedded = false }: HomePageProps) {
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
            <HeroArtwork />
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
