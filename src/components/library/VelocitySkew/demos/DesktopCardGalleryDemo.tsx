import { useState } from 'react'
import { VelocitySkew } from '../VelocitySkew'
import styles from './VelocitySkewDemos.module.css'
import { DESKTOP_GALLERY_CARDS, type GalleryCard } from './data'

type DesktopCardGalleryDemoProps = {
  maxSkew?: number
  velocityScale?: number
  velocityDivisor?: number
}

export function DesktopCardGalleryDemo({
  maxSkew = 20,
  velocityScale = 1,
  velocityDivisor = 300,
}: DesktopCardGalleryDemoProps) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <p className={styles.sectionKicker}>B. 桌面卡片画廊演示</p>
        <h2 className={styles.sectionTitle}>悬停与速度倾斜互不冲突的画廊卡片</h2>
      </header>

      <div className={styles.galleryScroll} ref={setScroller}>
        <VelocitySkew<GalleryCard>
          items={DESKTOP_GALLERY_CARDS}
          getItemKey={(item) => item.id}
          mode="scroll"
          axis="vertical"
          skewAxis="y"
          maxSkew={maxSkew}
          velocityScale={velocityScale}
          velocityDivisor={velocityDivisor}
          reducedMotion={false}
          className={styles.galleryList}
          itemClassName={styles.gallerySkewItem}
          scroller={scroller}
          renderItem={(item) => (
            <article className={styles.galleryCard}>
              <img src={item.image} alt={item.title} loading="lazy" className={styles.galleryCardImage} />
              <div className={styles.galleryCardMeta}>
                <h3 className={styles.galleryCardTitle}>{item.title}</h3>
                <p className={styles.galleryCardSubtitle}>{item.subtitle}</p>
              </div>
            </article>
          )}
        />
      </div>
    </section>
  )
}
