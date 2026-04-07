import { useState } from 'react'
import { VelocitySkew } from '../VelocitySkew'
import styles from './VelocitySkewDemos.module.css'
import { MOBILE_MENU_ITEMS, type MenuItem } from './data'

type MobileMenuDemoProps = {
  maxSkew?: number
  velocityScale?: number
  velocityDivisor?: number
  showHeader?: boolean
  onSelect?: (id: string) => void
}

export function MobileMenuDemo({
  maxSkew = 20,
  velocityScale = 1,
  velocityDivisor = 300,
  showHeader = false,
  onSelect,
}: MobileMenuDemoProps) {
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState(MOBILE_MENU_ITEMS[0]?.id ?? '')

  return (
    <section className={styles.section}>
      {showHeader ? (
        <header className={styles.sectionHeader}>
          <p className={styles.sectionKicker}>A. 移动菜单演示</p>
          <h2 className={styles.sectionTitle}>触控菜单速度反馈倾斜效果</h2>
        </header>
      ) : null}

      <div className={styles.mobileMenuFrame} ref={setScroller}>
        <VelocitySkew<MenuItem>
          items={MOBILE_MENU_ITEMS}
          getItemKey={(item) => item.id}
          mode="scroll"
          axis="vertical"
          skewAxis="y"
          maxSkew={maxSkew}
          velocityScale={velocityScale}
          velocityDivisor={velocityDivisor}
          reducedMotion={false}
          className={styles.mobileMenuList}
          itemClassName={styles.mobileMenuSkewItem}
          scroller={scroller}
          renderItem={(item) => (
            <button
              type="button"
              className={`${styles.mobileMenuButton} ${
                activeId === item.id ? styles.mobileMenuButtonActive : ''
              }`}
              onClick={() => {
                setActiveId(item.id)
                onSelect?.(item.id)
              }}
            >
              <span className={styles.mobileMenuButtonTitle}>{item.label}</span>
              <span className={styles.mobileMenuButtonSub}>{item.subtitle}</span>
            </button>
          )}
        />
      </div>
    </section>
  )
}
