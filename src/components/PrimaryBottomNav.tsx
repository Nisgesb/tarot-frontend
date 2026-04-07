import styles from './PrimaryBottomNav.module.css'

export type PrimaryBottomNavTab = 'my' | 'home' | 'circle'

interface PrimaryBottomNavProps {
  activeTab: PrimaryBottomNavTab
  onGoMy: () => void
  onGoHome: () => void
  onGoCircle: () => void
}

export function PrimaryBottomNav({
  activeTab,
  onGoMy,
  onGoHome,
  onGoCircle,
}: PrimaryBottomNavProps) {
  return (
    <nav className={styles.root} aria-label="Primary navigation">
      <div className={styles.shell}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'my' ? styles.tabActive : ''}`}
          aria-current={activeTab === 'my' ? 'page' : undefined}
          onClick={onGoMy}
        >
          我的
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'home' ? styles.tabActive : ''}`}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={onGoHome}
        >
          首页
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'circle' ? styles.tabActive : ''}`}
          aria-current={activeTab === 'circle' ? 'page' : undefined}
          onClick={onGoCircle}
        >
          圈子
        </button>
      </div>
    </nav>
  )
}
