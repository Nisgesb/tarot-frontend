import styles from './HomePage.module.css'

interface HomePageProps {
  embedded?: boolean
  onOpenLiveReadingDebug?: () => void
}

export function HomePage({ embedded = false }: HomePageProps) {
  const pageClassName = ['shared-home-surface', styles.page, embedded ? styles.pageEmbedded : '']
    .filter(Boolean)
    .join(' ')

  return <main className={pageClassName} aria-label="Home background only" />
}

export default HomePage
