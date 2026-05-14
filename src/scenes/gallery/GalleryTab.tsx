import type { GalleryTabItem, GalleryTabKey } from './galleryMockData'
import styles from './GalleryScene.module.css'

interface GalleryTabProps {
  tabs: GalleryTabItem[]
  activeTab: GalleryTabKey
  onChange: (tab: GalleryTabKey) => void
}

export function GalleryTab({
  tabs,
  activeTab,
  onChange,
}: GalleryTabProps) {
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.key === activeTab))
  const indicatorStyle = {
    transform: `translateX(${activeIndex * 100}%)`,
  }

  return (
    <section className={styles.tabSection} aria-label="圈子分类">
      <div className={styles.tabRail}>
        <span className={styles.tabIndicator} style={indicatorStyle} aria-hidden />
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab
          return (
            <button
              key={tab.key}
              type="button"
              className={[
                styles.tabButton,
                isActive ? styles.tabButtonActive : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onChange(tab.key)}
              aria-current={isActive ? 'true' : undefined}
            >
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
