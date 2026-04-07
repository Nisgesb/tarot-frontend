import { useState } from 'react'
import { HOME_MENU_ITEMS, type HomeMenuItem } from '../config/homeMenu'
import { VelocitySkew } from './library/VelocitySkew'
import styles from './HomeVelocityMenu.module.css'

interface HomeVelocityMenuProps {
  scroller: HTMLElement | null
  currentPath: string
  onSelect: (item: HomeMenuItem) => void
}

export function HomeVelocityMenu({
  scroller,
  currentPath,
  onSelect,
}: HomeVelocityMenuProps) {
  const [pressedId, setPressedId] = useState<string | null>(null)

  return (
    <section className={styles.root} aria-label="Home navigation">
      <div className={styles.listShell}>
        <VelocitySkew<HomeMenuItem>
          items={HOME_MENU_ITEMS}
          getItemKey={(item) => item.id}
          mode="scroll"
          axis="vertical"
          skewAxis="y"
          maxSkew={16}
          velocityScale={1}
          velocityDivisor={320}
          transformOrigin="center center"
          reducedMotion={false}
          className={styles.list}
          itemClassName={styles.itemWrap}
          scroller={scroller}
          renderItem={(item) => {
            const isAiFlow = item.destinationKind === 'ai-flow'
            const isCurrent = currentPath === item.path
            const isPressed = pressedId === item.id
            const itemClassName = [
              styles.item,
              isAiFlow ? styles.itemAiFlow : '',
              isCurrent ? styles.itemCurrent : '',
              isPressed ? styles.itemPressed : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <button
                type="button"
                className={itemClassName}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => {
                  setPressedId(item.id)
                  onSelect(item)
                }}
              >
                <span className={styles.itemText}>
                  <span className={styles.itemTitle}>{item.label}</span>
                  <span className={styles.itemSubtitle}>{item.subtitle}</span>
                </span>
                <span className={styles.itemMeta}>
                  <span className={styles.itemMetaLabel}>
                    {isAiFlow ? '立即开始' : '进入页面'}
                  </span>
                  <span className={styles.itemMetaArrow} aria-hidden>
                    ↗
                  </span>
                </span>
              </button>
            )
          }}
        />
      </div>
    </section>
  )
}
